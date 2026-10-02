import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMatricula } from "@/lib/painel/members";
import type { Member } from "@/lib/painel/members";
import { colunasCriarMembro, colunasEditarMembro } from "@/lib/painel/documento";
import type { DadosProntos } from "@/lib/painel/documento";
import { comoCliente } from "@/lib/painel/gravacao";
import type { DepsEscritaAdmin } from "@/lib/painel/gravacao";

/**
 * Membro estendido com o schema admin (0006): ciclo de vida + endereço.
 * Reusa o tipo `Member` do painel-membro (design: 1 tipo, reuso).
 */
export type MembroStatus = "ATIVO" | "INATIVO" | "TRANSFERIDO";

export type MembroAdmin = Member & {
  status: MembroStatus;
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
  mesAniversario?: number;
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

  if (filtros.mesAniversario) {
    const month = String(filtros.mesAniversario).padStart(2, "0");
    query = query.filter("nascimento", "like", `%-${month}-%`);
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
  rg?: string | null;
  cpf?: string | null;
  data_batismo?: string | null;
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
export function gerarSenhaId(): string {
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
/**
 * O que estas duas funções aceitam não é "os dados do membro": é o ramo
 * `ok: true` de `comporDadosDocumento` (AD-024).
 *
 * `CriarMembroDados`/`MembroDadosAdmin` declaram `rg`/`cpf`/`data_batismo`
 * como opcionais porque são o *entrada* da rota, antes da validação. Aqui eles
 * já foram decididos: chegar a esta função com a chave ausente é impossivel
 * por construcao, e nao por convencao de quem escreve a chamada. Um service
 * que aceita o tipo amplo aceita `{ email }` — que grava a row com documento
 * nulo sem que ninguem tenha olhado o formulario.
 */
export async function criarMembro(
  dados: DadosProntos<CriarMembroDados>,
  deps: DepsEscritaAdmin = {}
): Promise<CriarMembroResultado> {
  const senhaTemporaria = gerarSenhaId();

  // O `id` do usuário sai de uma função injetável em vez do cliente admin
  // inteiro: o contrato de teste precisa de um id, não da superfície inteira
  // do `auth.admin`. O comportamento de produção é o mesmo `createUser` de
  // antes, só que agora por dentro destas duas funções.
  const removerAuthUser =
    deps.removerAuthUser ??
    (async (id: string) => {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(id);
    });

  const criarAuthUser =
    deps.criarAuthUser ??
    (async (email: string, senha: string) => {
      const admin = createAdminClient();
      const { data: createdUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password: senha,
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

      return createdUser.user.id;
    });

  const authUserId = await criarAuthUser(dados.email, senhaTemporaria);
  const supabase = deps.cliente ?? comoCliente(await createServerClient());

  try {
    const matricula = deps.matricula ?? (await generateMatricula());

    const { data: membro, error } = await supabase
      .from("members")
      .insert(colunasCriarMembro(dados, authUserId, matricula))
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { membro: membro as MembroAdmin, senhaTemporaria };
  } catch (erroInsert) {
    // Rollback 2-passos: sem linha em members, a conta auth recém-criada é
    // removida — nada de estado parcial (design, sec. Erros).
    await removerAuthUser(authUserId).catch(() => {
      // log server-side; sem estado persistente a reconciliar nesta iteração
      console.error("rollback criarMembro: falha ao remover auth user", erroInsert);
    });
    throw erroInsert;
  }
}

export type MembroDadosAdmin = {
  nome: string;
  nascimento: string;
  whatsapp: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  rg?: string | null;
  cpf?: string | null;
  data_batismo?: string | null;
};

/**
 * Atualiza os dados textuais do membro (nome/nascimento/whatsapp/endereço),
 * os dados de documento do cartão e reanota `atualizado_em` (ADMINMEM-14..16,
 * CART-01..03). E-mail não é aceito (ADMINMEM-16: inalterável nesta feature).
 * Erros de banco propagam para o handler mapear.
 */
export async function atualizarDadosMembro(
  id: string,
  dados: DadosProntos<MembroDadosAdmin>,
  deps: Pick<DepsEscritaAdmin, "cliente"> = {}
): Promise<MembroAdmin> {
  const supabase = deps.cliente ?? comoCliente(await createServerClient());

  const { data, error } = await supabase
    .from("members")
    .update(colunasEditarMembro(dados, new Date().toISOString()))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as MembroAdmin;
}

/** Membro inexistente — o caller mapeia para 404 (ADMINMEM-17/24/27/31). */
export class MembroNaoEncontradoError extends Error {
  constructor() {
    super("membro_nao_encontrado");
    this.name = "MembroNaoEncontradoError";
  }
}

/** Transição de status inválida — o caller mapeia para 400 (ADMINMEM-18). */
export class StatusInvalidoError extends Error {
  constructor(origem: MembroStatus, destino: string) {
    super(`status_transicao_invalida: ${origem} -> ${destino}`);
    this.name = "StatusInvalidoError";
  }
}

/**
 * Transições válidas do ciclo de vida (ADMINMEM-17/18): ATIVO→INATIVO,
 * ATIVO→TRANSFERIDO, INATIVO→ATIVO, INATIVO→TRANSFERIDO; TRANSFERIDO é
 * terminal (nenhum destino). Qualquer outra combinação lança
 * `StatusInvalidoError` sem alterar o registro.
 */
export const TRANSICOES: Record<MembroStatus, MembroStatus[]> = {
  ATIVO: ["INATIVO", "TRANSFERIDO"],
  INATIVO: ["ATIVO", "TRANSFERIDO"],
  TRANSFERIDO: [],
};

export async function transicionarStatus(
  id: string,
  novo: MembroStatus
): Promise<MembroAdmin> {
  const atual = await getMembro(id);

  if (!atual) {
    throw new MembroNaoEncontradoError();
  }

  const permitidas = TRANSICOES[atual.status];
  if (!permitidas.includes(novo)) {
    throw new StatusInvalidoError(atual.status, novo);
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("members")
    .update({ status: novo })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as MembroAdmin;
}

/**
 * "Remover" = inativar (soft): preserva o histórico e não apaga nada
 * (ADMINMEM-19). Equivale a transicionarStatus(id, "INATIVO").
 */
export async function inativarMembro(id: string): Promise<MembroAdmin> {
  return transicionarStatus(id, "INATIVO");
}

/** Hard-delete bloqueado por documentos cadastrados — o caller mapeia 409 (ADMINMEM-23). */
export class MembroComDocumentosError extends Error {
  constructor() {
    super("membro_com_documentos");
    this.name = "MembroComDocumentosError";
  }
}

export type DocumentoTipo = "RG" | "CPF" | "comprovante_endereco" | "outro";

export const TIPOS_DOCUMENTO: DocumentoTipo[] = [
  "RG",
  "CPF",
  "comprovante_endereco",
  "outro",
];

export class TipoDocumentoInvalidoError extends Error {
  constructor() {
    super("tipo_documento_invalido");
    this.name = "TipoDocumentoInvalidoError";
  }
}

export class DocumentoNaoEncontradoError extends Error {
  constructor() {
    super("documento_nao_encontrado");
    this.name = "DocumentoNaoEncontradoError";
  }
}

export type Documento = {
  id: string;
  member_id: string;
  tipo: DocumentoTipo;
  descricao: string | null;
  criado_em: string;
};

/**
 * Hard-delete (ADMINMEM-21..23, guardado no handler por ADMIN/SUPER_ADMIN):
 * 1. verifica se o membro existe e se há documentos (membro com docs → 409,
 *    nada é removido); 2. remove a conta auth via service-role; 3. remove a
 *    linha via sessão (RLS `members_delete_admin` como backstop).
 * Se o passo 3 falhar depois do 2, a conta já foi apagada (deleteUser é
 * idempotente) — rollback manual: re-executar o DELETE da linha; nenhuma
 * linha semi-deletada fica (edge case da spec, "rolback manual documentado").
 */
export async function excluirMembro(id: string): Promise<void> {
  const membro = await getMembro(id);
  if (!membro) {
    throw new MembroNaoEncontradoError();
  }

  const supabase = await createServerClient();

  const { data: docs, error: docsError } = await supabase
    .from("member_documents")
    .select("id")
    .eq("member_id", id)
    .limit(1);

  if (docsError) {
    throw docsError;
  }

  if (docs && docs.length > 0) {
    throw new MembroComDocumentosError();
  }

  const admin = createAdminClient();

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
    membro.auth_user_id
  );
  if (deleteAuthError) {
    throw deleteAuthError;
  }

  const { error: deleteError } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw deleteError;
  }
}

/**
 * Lista os metadados de documentos do membro ordenados por `criado_em` desc
 * (ADMINMEM-30). Leituras passam pela RLS `docs_select_admin`.
 */
export async function listDocumentos(memberId: string): Promise<Documento[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("member_documents")
    .select("*")
    .eq("member_id", memberId)
    .order("criado_em", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Documento[];
}

/**
 * Cria um metadado de documento (ADMINMEM-28/31). O `tipo` é validado no
 * serviço (e o check do banco, 0006, protege em profundidade); membro
 * inexistente → `MembroNaoEncontradoError` (404 no handler).
 */
export async function criarDocumento(
  memberId: string,
  tipo: string,
  descricao: string | null
): Promise<Documento> {
  const membro = await getMembro(memberId);
  if (!membro) {
    throw new MembroNaoEncontradoError();
  }

  if (!TIPOS_DOCUMENTO.includes(tipo as DocumentoTipo)) {
    throw new TipoDocumentoInvalidoError();
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("member_documents")
    .insert({
      member_id: memberId,
      tipo: tipo as DocumentoTipo,
      descricao: descricao || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Documento;
}

/**
 * Remove um metadado de documento (ADMINMEM-31). Verifica a existência do
 * documento pertencente ao membro antes de apagar — membro ou doc ausente
 * significam 404 no handler (ADMINMEM-31).
 */
export async function removerDocumento(
  memberId: string,
  docId: string
): Promise<void> {
  const supabase = await createServerClient();

  const { data: doc, error: getError } = await supabase
    .from("member_documents")
    .select("id")
    .eq("id", docId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (getError) {
    throw getError;
  }

  if (!doc) {
    throw new DocumentoNaoEncontradoError();
  }

  const { error } = await supabase
    .from("member_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    throw error;
  }
}