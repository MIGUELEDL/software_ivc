import { NextResponse } from "next/server";
import { requireEscrita } from "@/lib/admin/http";
import {
  subirFotoLider,
  LiderNaoEncontradoError,
  FotoTipoInvalidoError,
  FotoTamanhoInvalidoError,
} from "@/lib/admin/lideranca";

/**
 * POST /api/admin/lideres/[id]/foto — upload de foto no bucket
 * `fotos-lideranca` (IGR-20/21/25). Guarda de escrita `igrejas`; Foto
 * inválida → 400/413; inexistente → 404; sucesso → 200 `{ ok:true, photo_url }`.
 * Re-upload (upsert) sobrescreve a foto anterior (design, sec. Storage).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("igrejas");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  const formData = await request.formData();
  const file = formData.get("foto");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "foto_invalida" }, { status: 400 });
  }

  try {
    const { photo_url } = await subirFotoLider(id, file);
    return NextResponse.json({ ok: true, photo_url });
  } catch (error) {
    if (error instanceof LiderNaoEncontradoError) {
      return NextResponse.json(
        { error: "lider_nao_encontrado" },
        { status: 404 }
      );
    }
    if (error instanceof FotoTipoInvalidoError) {
      return NextResponse.json(
        { error: "foto_tipo_invalido" },
        { status: 400 }
      );
    }
    if (error instanceof FotoTamanhoInvalidoError) {
      return NextResponse.json(
        { error: "foto_tamanho_invalido" },
        { status: 413 }
      );
    }
    console.error("POST /api/admin/lideres/[id]/foto", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}