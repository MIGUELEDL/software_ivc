import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/admin/http";
import {
  urlDownloadDocumento,
  DocumentoNaoEncontradoError,
} from "@/lib/admin/relatorios";

/**
 * GET /api/admin/relatorios/documentos/[id]/download — redireciona para a
 * signed URL de download (REL-14). Guarda de leitura `relatorios`; inexistente
 * → 404 `{error:"nao_encontrado"}`. Sucesso → 307 redirect para a URL
 * assinada (60s).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authAdmin("relatorios");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    const url = await urlDownloadDocumento(id);
    return NextResponse.redirect(url, { status: 307 });
  } catch (error) {
    if (error instanceof DocumentoNaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error(
      "GET /api/admin/relatorios/documentos/[id]/download",
      error
    );
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
