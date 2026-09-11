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
 * Gera a próxima matrícula no formato IVC-#### (max+1 sobre as existentes).
 * A constraint unique de `matricula` protege contra corrida (409 no perdedor).
 */
export async function generateMatricula(): Promise<string> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.from("members").select("matricula");

  if (error) {
    throw error;
  }

  const max = (data ?? []).reduce((acc, row) => {
    const n = Number.parseInt(String(row.matricula ?? "").replace(/^IVC-/, ""), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);

  return `IVC-${String(max + 1).padStart(4, "0")}`;
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