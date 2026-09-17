import { NextResponse } from "next/server";
import { requireAdministrar } from "@/lib/admin/http";
import {
  excluirMembro,
  MembroComDocumentosError,
  MembroNaoEncontradoError,
} from "@/lib/admin/membros";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * DELETE /api/admin/membros/[id] — hard-delete (ADMINMEM-21..23/34).
 * Guarda ADMIN/SUPER_ADMIN (SECRETARIA → 403); membro com documentos → 409
 * (nada é removido); membro inexistente → 404; sucesso → 204 com a conta auth
 * removida junto. "Remover" comum (inativar) fica na rota de status.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdministrar("membros");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    await excluirMembro(id);
    const { ip, user_agent } = extrairInfoRequest(_request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "excluir",
      entidade: "membros",
      entidade_id: id,
      ip,
      user_agent,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof MembroComDocumentosError) {
      return NextResponse.json(
        { error: "membro_com_documentos" },
        { status: 409 }
      );
    }
    if (error instanceof MembroNaoEncontradoError) {
      return NextResponse.json(
        { error: "membro_nao_encontrado" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/admin/membros/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}