import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/admin/http";
import { listarAuditoria } from "@/lib/admin/auditoria";

/**
 * GET /api/admin/auditoria — lista logs de auditoria com filtros e paginação.
 * Guarda de leitura `auditoria`; filtros por data_inicio, data_fim, acao, entidade;
 * paginação via offset/limit (default 20 por página).
 */
export async function GET(request: Request) {
  const auth = await authAdmin("auditoria");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);

  const data_inicio = searchParams.get("data_inicio") ?? undefined;
  const data_fim = searchParams.get("data_fim") ?? undefined;
  const acao = searchParams.get("acao") ?? undefined;
  const entidade = searchParams.get("entidade") ?? undefined;
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  // Validação: data_inicio não pode ser posterior a data_fim
  if (data_inicio && data_fim && data_inicio > data_fim) {
    return NextResponse.json(
      { error: "datas_invalidas" },
      { status: 400 }
    );
  }

  const { logs, total } = await listarAuditoria({
    data_inicio,
    data_fim,
    acao,
    entidade,
    offset,
    limit,
  });

  return NextResponse.json({ logs, total });
}
