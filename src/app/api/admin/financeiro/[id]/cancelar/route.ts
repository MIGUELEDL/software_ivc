import { NextResponse } from "next/server";
import { requireEscrita } from "@/lib/admin/http";
import {
  cancelarLancamento,
  LancamentoNaoCancelavelError,
  LancamentoNaoEncontradoError,
} from "@/lib/admin/financeiro";

/**
 * POST /api/admin/financeiro/[id]/cancelar — cancela um lançamento PENDENTE
 * (soft-delete, FIN-05/AC-9): status → `CANCELADO`. Guarda de escrita
 * `financeiro`; lançamento não-PENDENTE → 400
 * `{error:"transacao_nao_cancelavel"}` (AC-10); inexistente → 404
 * `{error:"nao_encontrado"}` (AC-11). Sucesso → 200 `{ lancamento }`.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    const lancamento = await cancelarLancamento(id);
    return NextResponse.json({ lancamento });
  } catch (error) {
    if (error instanceof LancamentoNaoCancelavelError) {
      return NextResponse.json(
        { error: "transacao_nao_cancelavel" },
        { status: 400 }
      );
    }
    if (error instanceof LancamentoNaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error("POST /api/admin/financeiro/[id]/cancelar", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}