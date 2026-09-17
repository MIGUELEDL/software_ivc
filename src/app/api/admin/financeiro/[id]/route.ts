import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import {
  atualizarLancamento,
  buscarLancamento,
  LancamentoConciliadoError,
  LancamentoNaoEncontradoError,
  type LancamentoPatch,
} from "@/lib/admin/financeiro";
import { validarLancamento } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * GET /api/admin/financeiro/[id] — detalhe de um lançamento (FIN-01/AC-6).
 * Guarda de leitura `financeiro`; inexistente → 404 `{error:"nao_encontrado"}`
 * (AC-11). Sucesso → 200 `{ lancamento }`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authAdmin("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    const lancamento = await buscarLancamento(id);
    return NextResponse.json({ lancamento });
  } catch (error) {
    if (error instanceof LancamentoNaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error("GET /api/admin/financeiro/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/financeiro/[id] — atualiza apenas os campos enviados de um
 * lançamento PENDENTE (FIN-05/AC-7). Guarda de escrita `financeiro`; campo
 * inválido → 400 `{error, campos}` (AC-4); lançamento CONCILIADO → 400
 * `{error:"transacao_conciliada"}` (AC-8); inexistente → 404
 * `{error:"nao_encontrado"}` (AC-11). Sucesso → 200 `{ lancamento }`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }
  if (!body) {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const resultado = validarLancamento(body, "parcial");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const lancamento = await atualizarLancamento(
      id,
      resultado.dados as LancamentoPatch
    );
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "editar",
      entidade: "financeiro",
      entidade_id: id,
      ip,
      user_agent,
      payload: resultado.dados as Record<string, unknown>,
    });
    return NextResponse.json({ lancamento });
  } catch (error) {
    if (error instanceof LancamentoConciliadoError) {
      return NextResponse.json(
        { error: "transacao_conciliada" },
        { status: 400 }
      );
    }
    if (error instanceof LancamentoNaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error("PATCH /api/admin/financeiro/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}