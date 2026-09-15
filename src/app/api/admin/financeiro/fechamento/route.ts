import { NextResponse } from "next/server";
import { authAdmin, requireEscrita } from "@/lib/admin/http";
import { fecharCaixa, listarFechamentos } from "@/lib/admin/financeiro";

/**
 * GET /api/admin/financeiro/fechamento — lista os fechamentos de caixa
 * anteriores (FIN-09/AC-20), ordenados por `created_at` desc. Guarda de
 * leitura `financeiro`. Sucesso → 200 `{ fechamentos }`.
 */
export async function GET() {
  const auth = await authAdmin("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const fechamentos = await listarFechamentos();
    return NextResponse.json({ fechamentos });
  } catch (error) {
    console.error("GET /api/admin/financeiro/fechamento", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * POST /api/admin/financeiro/fechamento — fecha o caixa (FIN-09/10, AC-22):
 * agrega as transações CONCILIADO sem `cash_close_id`, cria o snapshot
 * imutável em `cash_closes` e marca as transações incluídas. Guarda de escrita
 * `financeiro`; sem transações CONCILIADO → 400
 * `{error:"sem_transacoes_para_fechar"}` (AC-23). Sucesso → 201
 * `{ fechamento }`.
 */
export async function POST() {
  const auth = await requireEscrita("financeiro");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const fechamento = await fecharCaixa();
    if (!fechamento) {
      return NextResponse.json(
        { error: "sem_transacoes_para_fechar" },
        { status: 400 }
      );
    }
    return NextResponse.json({ fechamento }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/financeiro/fechamento", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}