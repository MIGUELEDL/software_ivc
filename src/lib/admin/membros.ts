import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMatricula } from "@/lib/painel/members";
import type { Member } from "@/lib/painel/members";

/**
 * Membro estendido com o schema admin (0006): ciclo de vida + endereço.
 * Reusa o tipo `Member` do painel-membro (design: 1 tipo, reuso).
 */
export type MembroAdmin = Member & {
  status: "ATIVO" | "INATIVO" | "TRANSFERIDO";
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

export type MembroFiltros = {
  q?: string;
  status?: string;
};

/**
 * Lista os membros sob a sessão admin (RLS `members_select_admin`, 0006).
 * Ordenação default nome asc (ADMINMEM-02); quando `q` é dado, filtra por
 * nome OU matrícula contendo o texto (case-insensitive, ADMINMEM-03); quando
 * `status` é dado, filtra exatamente o status (ADMINMEM-04). Tudo em uma
 * consulta (volumes baixos, sem paginação — AD-001).
 */
export async function listMembros(
  filtros: MembroFiltros = {}
): Promise<MembroAdmin[]> {
  const supabase = await createServerClient();

  let query = supabase.from("members").select("*").order("nome", {
    ascending: true,
  });

  const q = filtros.q?.trim();
  if (q) {
    query = query.or(`nome.ilike.%${q}%,matricula.ilike.%${q}%`);
  }

  if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as MembroAdmin[];
}

/**
 * Busca um membro por id. Retorna null quando não existe (sem lançar) para o
 * caller mapear 404 (ADMINMEM-26); erros reais de banco propagam.
 */
export async function getMembro(id: string): Promise<MembroAdmin | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MembroAdmin | null) ?? null;
}

/** E-mail já registrado em auth.users — o caller mapeia para 409 (ADMINMEM-08). */
export class EmailEmUsoError extends Error {
  constructor() {
    super("email_em_uso");
    this.name = "EmailEmUsoError";
  }
}

export type CriarMembroDados = {
  nome: string;
  nascimento: string;
  whatsapp: string;
  email: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export type CriarMembroResultado = {
  membro: MembroAdmin;
  senhaTemporaria: string;
};

/**
 * Senha-ID temporária (AD-013/RN-002): ≥12 chars com letra E número. É gerada
 * no servidor, devolvida UMA única vez no retorno da criação (nunca persistida
 * em texto, nunca em URL) e entregue manualmente pela liderança.
 */
function gerarSenhaId(): string {
  const letras = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";
  const todos = letras + numeros;

  let senha = letras[Math.floor(Math.random() * letras.length)];
  senha += numeros[Math.floor(Math.random() * numeros.length)];
  while (senha.length < 16) {
    senha += todos[Math.floor(Math.random() * todos.length)];
  }
  return senha;
}

/**
 * Cria o membro em 2 passos com rollback (ADMINMEM-07..12, edge case da spec):
 * 1. conta auth via service-role (papel MEMBRO + force_password_change=true);
 * 2. matrícula via RPC `proxima_matricula` (0005) + insert em `members` sob a
 *    sessão admin (RLS `members_insert_admin`).
 * Se o passo 2 falhar, o catch remove o usuário auth (rollback) — nunca deixa
 * órfão em auth.users nem linha sem conta. Erro `user_already_exists` vira
 * `EmailEmUsoError` para o caller responder 409 sem criar nada.
 */
export async function criarMembro(
  dados: CriarMembroDados
): Promise<CriarMembroResultado> {
  const admin = createAdminClient();
  const senhaTemporaria = gerarSenhaId();

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: dados.email,
      password: senhaTemporaria,
      email_confirm: true,
      app_metadata: { role: "MEMBRO", force_password_change: true },
    });

  if (createError) {
    if (
      createError.code === "user_already_exists" ||
      (createError.message ?? "").includes("already")
    ) {
      throw new EmailEmUsoError();
    }
    throw createError;
  }

  if (!createdUser.user) {
    throw new Error("criar_usuario_auth_falhou");
  }

  const supabase = await createServerClient();

  try {
    const matricula = await generateMatricula();

    const { data: membro, error } = await supabase
      .from("members")
      .insert({
        auth_user_id: createdUser.user.id,
        nome: dados.nome,
        nascimento: dados.nascimento,
        whatsapp: dados.whatsapp,
        matricula,
        logradouro: dados.logradouro ?? null,
        numero: dados.numero ?? null,
        bairro: dados.bairro ?? null,
        cidade: dados.cidade ?? null,
        uf: dados.uf ?? null,
        cep: dados.cep ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { membro: membro as MembroAdmin, senhaTemporaria };
  } catch (erroInsert) {
    // Rollback 2-passos: sem linha em members, a conta auth recém-criada é
    // removida — nada de estado parcial (design, sec. Erros).
    await admin.auth.admin.deleteUser(createdUser.user.id).catch(() => {
      // log server-side; sem estado persistente a reconciliar nesta iteração
      console.error("rollback criarMembro: falha ao remover auth user", erroInsert);
    });
    throw erroInsert;
  }
}