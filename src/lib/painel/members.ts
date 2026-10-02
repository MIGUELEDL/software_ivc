import { createServerClient } from "@/lib/supabase/server";
import { colunasCriarMembro, colunasPerfil } from "@/lib/painel/documento";
import { comoCliente } from "@/lib/painel/gravacao";
import type { DepsEscritaMember } from "@/lib/painel/gravacao";
import type { DadosProntos } from "@/lib/painel/documento";

export type Member = {
  id: string;
  auth_user_id: string;
  nome: string;
  nascimento: string;
  whatsapp: string;
  matricula: string;
  foto_url: string | null;
  rg: string | null;
  cpf: string | null;
  data_batismo: string | null;
  validade_cartao: string | null;
  criado_em: string;
  atualizado_em: string;
};

/**
 * Dados de cadastro do membro. `rg`, `cpf` e `data_batismo` alimentam o
 * cartão de membro e são **opcionais**: `undefined` ou `null` significam "não
 * informado" e são gravados como `NULL` — nunca como string vazia (CART-04).
 *
 * A lista é uma whitelist: nenhum caller consegue gravar `status`,
 * `matricula` ou `criado_em` a partir daqui (a policy `members_update_own` é
 * por linha, sem filtro de coluna — ver Risks & Concerns do design).
 */
export type MemberDados = {
  nome: string;
  nascimento: string;
  whatsapp: string;
  rg?: string | null;
  cpf?: string | null;
  data_batismo?: string | null;
};

/**
 * Busca o membro pelo `auth_user_id` (claims.sub). Retorna null quando não
 * há registro; lança o erro do banco em falha real de consulta.
 */
export async function getMemberByAuthUid(
  authUid: string
): Promise<Member | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", authUid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Member;
}

/**
 * Gera a próxima matrícula IVC-#### via RPC `proxima_matricula` (0005),
 * que usa `nextval` na sequence versionada `members_matricula_seq` (0001:5).
 *
 * Usei RPC `security definer` em vez de max+1 sobre `select("matricula")`
 * porque o client autenticado enxerga apenas as próprias linhas de `members`
 * (RLS `members_select_own`, 0001:44-46): um membro em autocadastro veria `[]`
 * → max=0 → sempre `IVC-0001` → colisão com o seed (23505 → 409 permanente,
 * bug real reproduzido live no round 3 do verifier). `nextval` em sequence é
 * imune a RLS e garante matrícula única mesmo na corrida (23505 no perdedor).
 */
export async function generateMatricula(): Promise<string> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("proxima_matricula");

  if (error || typeof data !== "string") {
    throw error ?? new Error("falha ao gerar matricula via proxima_matricula");
  }

  return data;
}

/**
 * Cria o registro do membro ligado ao `authUid`, gerando a matrícula.
 * Erros (ex.: unique violation 23505) propagam para o caller mapear (409).
 */
/**
 * Mesmo contrato do service admin (`0d4d1a4`, AD-024): o que chega aqui não é
 * "os dados do membro", é o ramo `ok: true` de `comporDadosDocumento`.
 *
 * `MemberDados` declara `rg`/`cpf`/`data_batismo` opcionais porque é o tipo da
 * ENTRADA da rota, antes da validação. No service a opacidade não tem razão: as
 * três chaves já foram decididas. Abertas, elas deixavam passar
 * `{ nome, nascimento, whatsapp }` e gravar a row com documento nulo sem ninguém
 * ter olhado o formulário.
 */
export async function createMember(
  authUid: string,
  dados: DadosProntos<MemberDados>,
  deps: DepsEscritaMember = {}
): Promise<Member> {
  const supabase = deps.cliente ?? comoCliente(await createServerClient());
  const matricula = deps.matricula ?? (await generateMatricula());

  const { data, error } = await supabase
    .from("members")
    .insert(colunasCriarMembro(dados, authUid, matricula))
    .select()
    .single();

  if (error) {
    throw error;
  }

  // `ClienteEscrita` apaga o tipo da row de propósito — o mesmo cliente serve
  // aos quatro caminhos e o probe injeta um fake que devolve `unknown`. A
  // forma da row é garantida pelos builders de coluna, que são allowlist
  // fechada; aqui o cast só recupera o que o cliente real tipava.
  return data as Member;
}

/**
 * Atualiza nome/nascimento/whatsapp e os dados de documento do membro do
 * `authUid` e reanota `atualizado_em`. Erros propagam para o caller.
 *
 * A montagem é uma whitelist explícita de colunas (nunca `...dados`) porque a
 * policy `members_update_own` restringe a linha, não as colunas: espalhar o
 * objeto permitiria ao membro escrever `status`/`matricula`/`criado_em`.
 */
export async function updateMember(
  authUid: string,
  dados: DadosProntos<MemberDados>,
  deps: Pick<DepsEscritaMember, "cliente"> = {}
): Promise<Member> {
  const supabase = deps.cliente ?? comoCliente(await createServerClient());

  const { data, error } = await supabase
    .from("members")
    .update(colunasPerfil(dados, new Date().toISOString()))
    .eq("auth_user_id", authUid)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Mesmo contrato apagado de `createMember`: a forma da row vem da
  // allowlist fechada de `colunasPerfil`, o cast só recupera a tipagem que o
  // cliente real fornecia.
  return data as Member;
}