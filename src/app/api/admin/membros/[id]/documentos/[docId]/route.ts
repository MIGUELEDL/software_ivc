import { NextResponse } from "next/server";
import { requireEscrita } from "@/lib/admin/http";
import {
  removerDocumento,
  DocumentoNaoEncontradoError,
} from "@/lib/admin/membros";

/**
 * DELETE /api/admin/membros/[id]/documentos/[docId] — remove metadado de
 * documento (ADMINMEM-31). Guarda de escrita; documento (ou membro) inexistente
 * → 404 (o serviço verifica o vínculo doc→membro); sucesso → 204.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireEscrita("membros");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id, docId } = await params;

  try {
    await removerDocumento(id, docId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DocumentoNaoEncontradoError) {
      return NextResponse.json(
        { error: "documento_nao_encontrado" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/admin/membros/[id]/documentos/[docId]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}