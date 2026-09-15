import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/admin/http";
import {
  gerarCSVFinanceiro,
  gerarCSVMembros,
  gerarCSVEventos,
  gerarCSVPatrimonio,
} from "@/lib/admin/relatorios";
import {
  RELATORIO_TIPOS,
} from "@/lib/admin/relatorios-constants";

/**
 * GET /api/admin/relatorios/exportar — exporta um relatório em CSV (REL-02..06).
 * Guarda de leitura `relatorios`. Query: `tipo`
 * (`financeiro|membros|eventos|patrimonio`) + `data_inicio`/`data_fim`
 * (financeiro). Response `text/csv; charset=utf-8` com
 * `Content-Disposition: attachment` e BOM `\uFEFF` (REL-08). Tipo inválido
 * ou ausente → 400 `{ error: "tipo_invalido" }` (REL-07).
 */
export async function GET(request: Request) {
  const auth = await authAdmin("relatorios");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (!tipo || !(RELATORIO_TIPOS as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: "tipo_invalido" }, { status: 400 });
  }

  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  try {
    let resultado: { csv: string; filename: string };

    if (tipo === "financeiro") {
      resultado = await gerarCSVFinanceiro({
        dataInicio: dataInicio ?? undefined,
        dataFim: dataFim ?? undefined,
      });
    } else if (tipo === "membros") {
      resultado = await gerarCSVMembros();
    } else if (tipo === "eventos") {
      resultado = await gerarCSVEventos();
    } else {
      resultado = await gerarCSVPatrimonio();
    }

    return new Response(resultado.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${resultado.filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/relatorios/exportar", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}