import { NextResponse } from "next/server";
import { requireEscrita } from "@/lib/admin/http";
import {
  subirFotoMembro,
  MembroNaoEncontradoError,
} from "@/lib/admin/membros";
import {
  FotoTipoInvalidoError,
  FotoTamanhoInvalidoError,
} from "@/lib/admin/lideranca";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * POST /api/admin/membros/[id]/foto — upload de foto no bucket
 * `fotos-membros` (mesmo path do auto-upload: `members/{id}/foto-4x4.{ext}`,
 * upsert). Guarda de escrita `membros`; tipo inválido → 400; tamanho → 413;
 * inexistente → 404; sucesso → 200 `{ ok:true, foto_url }` + auditoria.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("membros");
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
    const { foto_url } = await subirFotoMembro(id, file);
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "editar",
      entidade: "membros",
      entidade_id: id,
      ip,
      user_agent,
      payload: { foto_url },
    });
    return NextResponse.json({ ok: true, foto_url });
  } catch (error) {
    if (error instanceof MembroNaoEncontradoError) {
      return NextResponse.json(
        { error: "membro_nao_encontrado" },
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
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
