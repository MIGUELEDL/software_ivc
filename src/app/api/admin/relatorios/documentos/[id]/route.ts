import { NextResponse } from "next/server";
import { requireEscrita } from "@/lib/admin/http";
import {
  removerDocumento,
  DocumentoNaoEncontradoError,
} from "@/lib/admin/relatorios";

/**
 * DELETE /api/admin/relatorios/documentos/[id] — remove um documento
 * (REL-15/16). Guarda de escrita `relatorios`; inexistente → 404
 * `{error:"nao_encontrado"}`. Sucesso → 200 `{ok:true}`.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("relatorios");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    await removerDocumento(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DocumentoNaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error("DELETE /api/admin/relatorios/documentos/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
