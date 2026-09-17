import { createServerClient } from "@/lib/supabase/server";

/**
 * Tipos para a trilha de auditoria (RF-030).
 * Tabela audit_logs: append-only, imutável.
 */

export type AuditLog = {
  id: string;
  autor: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  timestamp: string;
  ip: string | null;
  user_agent: string | null;
  payload: Record<string, unknown> | null;
};

export type AuditoriaFiltros = {
  data_inicio?: string;
  data_fim?: string;
  acao?: string;
  entidade?: string;
  offset?: number;
  limit?: number;
};

/**
 * Extrai IP e user_agent de um Request.
 * IP tenta x-forwarded-for (proxy), fallback para x-real-ip.
 */
export function extrairInfoRequest(request: Request): {
  ip: string | null;
  user_agent: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const user_agent = request.headers.get("user-agent") ?? null;
  return { ip, user_agent };
}

/**
 * Registra uma ação de auditoria na tabela audit_logs.
 * Função append-only: sem UPDATE/DELETE possível.
 *
 * @param params.autor - UUID do usuário que executou a ação (opcional para ações de sistema)
 * @param params.acao - Tipo da ação: criar, editar, excluir, cancelar, baixar, atualizar
 * @param params.entidade - Entidade afetada: membros, eventos, patrimonio, etc.
 * @param params.entidade_id - ID do objeto afetado (opcional)
 * @param params.ip - Endereço IP do cliente (opcional)
 * @param params.user_agent - User-Agent do cliente (opcional)
 * @param params.payload - Dados adicionais da ação (opcional, truncado para 10KB)
 */
export async function registrarAuditoria(params: {
  autor?: string;
  acao: string;
  entidade: string;
  entidade_id?: string;
  ip?: string | null;
  user_agent?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createServerClient();

  // Truncar payload para 10KB se exceder
  let payload = params.payload ?? null;
  if (payload) {
    const payloadStr = JSON.stringify(payload);
    if (payloadStr.length > 10240) {
      payload = JSON.parse(payloadStr.slice(0, 10240) + '"}'); // Truncar e fechar JSON
    }
  }

  const { error } = await supabase.from("audit_logs").insert({
    autor: params.autor ?? null,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidade_id ?? null,
    ip: params.ip ?? null,
    user_agent: params.user_agent ?? null,
    payload,
  });

  if (error) {
    // Log de auditoria não deve bloquear a operação original
    console.error("auditoria: falha ao registrar log", error);
  }
}

/**
 * Lista logs de auditoria com filtros e paginação.
 *
 * @param filtros - Filtros opcionais: data_inicio, data_fim, acao, entidade, offset, limit
 * @returns Objeto com logs (array) e total (count)
 */
export async function listarAuditoria(
  filtros: AuditoriaFiltros
): Promise<{ logs: AuditLog[]; total: number }> {
  const supabase = await createServerClient();

  const {
    data_inicio,
    data_fim,
    acao,
    entidade,
    offset = 0,
    limit = 20,
  } = filtros;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false });

  // Filtros
  if (data_inicio) {
    query = query.gte("timestamp", data_inicio);
  }
  if (data_fim) {
    // Adiciona 23:59:59 ao último dia para incluir todo o dia
    query = query.lte("timestamp", `${data_fim}T23:59:59.999Z`);
  }
  if (acao) {
    query = query.eq("acao", acao);
  }
  if (entidade) {
    query = query.eq("entidade", entidade);
  }

  // Paginação
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("auditoria: falha ao listar logs", error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data as AuditLog[]) ?? [],
    total: count ?? 0,
  };
}
