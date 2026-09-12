import { NextResponse } from "next/server";
import { requireWriter, erroCampos } from "@/lib/admin/http";
import {
  criarDocumento,
  TIPOS_DOCUMENTO,
  MembroNaoEncontradoError,
  TipoDocumentoInvalidoError,
} from "@/lib/admin/membros";

/**
 * POST /api/admin/membros/[id]/documentos — cria metadado de documento
 * (ADMINMEM-28/31). Guarda de escrita; `tipo` fora de
 * {RG, CPF, comprovante_endereco, outro} → 400 por campo; membro inexistente →
 * 404; sucesso → 201 `{ documento }`.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireWriter();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  const formData = await request.formData();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!TIPOS_DOCUMENTO.includes(tipo as (typeof TIPOS_DOCUMENTO)[number])) {
    return erroCampos({ tipo: "Tipo de documento inválido." });
  }

  try {
    const documento = await criarDocumento(id, tipo, descricao || null);
    return NextResponse.json({ documento }, { status: 201 });
  } catch (error) {
    if (error instanceof MembroNaoEncontradoError) {
      return NextResponse.json(
        { error: "membro_nao_encontrado" },
        { status: 404 }
      );
    }
    if (error instanceof TipoDocumentoInvalidoError) {
      return erroCampos({ tipo: "Tipo de documento inválido." });
    }
    console.error("POST /api/admin/membros/[id]/documentos", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}