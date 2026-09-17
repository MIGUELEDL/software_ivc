import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import {
  criarLancamento,
  listarLancamentos,
  TIPOS_LANCAMENTO,
  STATUS_LANCAMENTO,
  type LancamentoFiltros,
  type StatusLancamento,
} from "@/lib/admin/financeiro";
import { validarLancamento } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * POST /api/admin/financeiro — cria um lançamento financeiro (FIN-01/AC-3).
 * Guarda de escrita `financeiro`; validação por campo via `validarLancamento`
 * com modo `completo` → 400 `{error, campos}` (FIN-02/AC-4); sucesso → 201
 * `{ lancamento }` com status default `PENDENTE`. Violação de UNIQUE (23505)
 * → 409 `{error:"cadastro_duplicado"}`.
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }
  if (!body) {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const resultado = validarLancamento(body, "completo");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const lancamento = await criarLancamento(resultado.dados);
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "criar",
      entidade: "financeiro",
      entidade_id: lancamento.id,
      ip,
      user_agent,
    });
    return NextResponse.json({ lancamento }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "cadastro_duplicado" },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/financeiro", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * GET /api/admin/financeiro — lista lançamentos financeiros (FIN-01/AC-1,
 * FIN-11/AC-26) ordenados por `data` desc. Guarda de leitura `financeiro`.
 * Filtros cumulativos via query params: `tipo` (RECEITA|DESPESA), `status`
 * (um ou mais, separados por vírgula — ex.: `PENDENTE,CONCILIADO`),
 * `data_inicio`/`data_fim` (período inclusivo) e `busca` (ILIKE na
 * `descricao`). O service layer filtra por um único status; múltiplos
 * statuses são aplicados em memória sobre o resultado.
 */
export async function GET(request: Request) {
  const auth = await authAdmin("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);

  const filtros: LancamentoFiltros = {};

  const tipo = searchParams.get("tipo");
  if (tipo && (TIPOS_LANCAMENTO as readonly string[]).includes(tipo)) {
    filtros.tipo = tipo as LancamentoFiltros["tipo"];
  }

  const statuses = (searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    statuses.length === 1 &&
    (STATUS_LANCAMENTO as readonly string[]).includes(statuses[0]!)
  ) {
    filtros.status = statuses[0] as StatusLancamento;
  }

  const dataInicio = searchParams.get("data_inicio");
  if (dataInicio) {
    filtros.dataInicio = dataInicio;
  }
  const dataFim = searchParams.get("data_fim");
  if (dataFim) {
    filtros.dataFim = dataFim;
  }
  const busca = searchParams.get("busca");
  if (busca) {
    filtros.busca = busca;
  }

  try {
    let lancamentos = await listarLancamentos(filtros);
    if (statuses.length > 1) {
      lancamentos = lancamentos.filter((l) => statuses.includes(l.status));
    }
    return NextResponse.json({ lancamentos });
  } catch (error) {
    console.error("GET /api/admin/financeiro", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}