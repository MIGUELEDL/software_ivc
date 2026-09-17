import { NextResponse } from "next/server";
import { authAdmin, requireAdministrar, erroCampos } from "@/lib/admin/http";
import { listarAuditoria, registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

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

/**
 * POST /api/admin/auditoria — cria um log de auditoria (uso interno).
 * Guarda de administrar `auditoria`; body com acao (required), entidade (required),
 * entidade_id (optional), payload (optional).
 */
export async function POST(request: Request) {
  const auth = await requireAdministrar("auditoria");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON invalido." });
  }
  if (!body) {
    return erroCampos({ form: "Corpo JSON invalido." });
  }

  const acao = typeof body.acao === "string" ? body.acao.trim() : "";
  const entidade = typeof body.entidade === "string" ? body.entidade.trim() : "";
  const entidade_id = typeof body.entidade_id === "string" ? body.entidade_id.trim() : undefined;
  const payload = typeof body.payload === "object" && body.payload !== null
    ? (body.payload as Record<string, unknown>)
    : undefined;

  const campos: Record<string, string> = {};
  if (!acao) campos.acao = "Informe a acao.";
  if (!entidade) campos.entidade = "Informe a entidade.";

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  const { ip, user_agent } = extrairInfoRequest(request);

  await registrarAuditoria({
    autor: auth.sub,
    acao,
    entidade,
    entidade_id,
    ip,
    user_agent,
    payload,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
