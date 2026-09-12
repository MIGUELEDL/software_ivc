import { createServerClient } from "@/lib/supabase/server";

export type Member = {
  id: string;
  auth_user_id: string;
  nome: string;
  nascimento: string;
  whatsapp: string;
  matricula: string;
  foto_url: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type MemberDados = {
  nome: string;
  nascimento: string;
  whatsapp: string;
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

  return data;
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
export async function createMember(
  authUid: string,
  dados: MemberDados
): Promise<Member> {
  const supabase = await createServerClient();
  const matricula = await generateMatricula();

  const { data, error } = await supabase
    .from("members")
    .insert({ auth_user_id: authUid, ...dados, matricula })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Atualiza nome/nascimento/whatsapp do membro do `authUid` e reanota
 * `atualizado_em`. Erros propagam para o caller.
 */
export async function updateMember(
  authUid: string,
  dados: MemberDados
): Promise<Member> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("members")
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq("auth_user_id", authUid)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}