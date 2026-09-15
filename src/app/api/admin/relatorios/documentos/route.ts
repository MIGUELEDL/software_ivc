import { NextResponse } from "next/server";
import { authAdmin, requireEscrita, erroCampos } from "@/lib/admin/http";
import {
  listarDocumentos,
  subirDocumento,
  DocumentoTituloInvalidoError,
  DocumentoCategoriaInvalidaError,
  DocumentoTipoInvalidoError,
  DocumentoTamanhoInvalidoError,
} from "@/lib/admin/relatorios";
import type { DocumentoCategoria } from "@/lib/admin/relatorios-constants";
import { DOCUMENT_CATEGORIES } from "@/lib/admin/relatorios-constants";

/**
 * POST /api/admin/relatorios/documentos — sobe um documento (REL-09/10/12).
 * Guarda de escrita `relatorios` (escritores = FINANCEIRO/ADMIN/SUPER_ADMIN);
 * leitores → 403 `nao_autorizado`; anon → 401. Multipart: `title`,
 * `category`, `description?`, `file`. Validação por campo → 400
 * `{ error:"dados_invalidos", campos }` (REL-10). Sucesso → 201 `{ documento }`.
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("relatorios");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("file");

  const campos: Record<string, string> = {};
  if (!title) {
    campos.title = "Informe o título do documento.";
  }
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(category)) {
    campos.category = "Categoria inválida.";
  }
  if (!(file instanceof File) || file.size === 0) {
    campos.file = "Selecione um arquivo.";
  }
  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  try {
    const documento = await subirDocumento(
      {
        title,
        category: category as DocumentoCategoria,
        description: description || null,
      },
      file as File
    );
    return NextResponse.json({ documento }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentoTituloInvalidoError) {
      return erroCampos({ title: "Informe o título do documento." });
    }
    if (error instanceof DocumentoCategoriaInvalidaError) {
      return erroCampos({ category: "Categoria inválida." });
    }
    if (error instanceof DocumentoTipoInvalidoError) {
      return erroCampos({ file: "Tipo de arquivo não permitido." });
    }
    if (error instanceof DocumentoTamanhoInvalidoError) {
      return NextResponse.json(
        { error: "arquivo_grande" },
        { status: 413 }
      );
    }
    console.error("POST /api/admin/relatorios/documentos", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * GET /api/admin/relatorios/documentos — lista os documentos (REL-11).
 * Guarda de leitura `relatorios`. Query param `categoria` (opcional) filtra
 * por categoria (valores fora do enum são ignorados — fail-open na leitura).
 */
export async function GET(request: Request) {
  const auth = await authAdmin("relatorios");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const categoriaParam = searchParams.get("categoria");
  const categoria =
    categoriaParam && (DOCUMENT_CATEGORIES as readonly string[]).includes(categoriaParam)
      ? (categoriaParam as DocumentoCategoria)
      : undefined;

  try {
    const documentos = await listarDocumentos(categoria);
    return NextResponse.json({ documentos });
  } catch (error) {
    console.error("GET /api/admin/relatorios/documentos", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}