import { createServerClient } from "@/lib/supabase/server";
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