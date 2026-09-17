import { NextResponse } from "next/server";
import { requireEscrita, erroCampos } from "@/lib/admin/http";
import {
  atualizarAsset,
  BemNaoEncontradoError,
  type AssetPatch,
} from "@/lib/admin/assets";
import { validateAsset } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * PATCH /api/admin/assets/[id] — atualiza apenas os campos enviados (PAT-08),
 * incluindo `status` `ATIVO`/`INATIVO` (soft-delete/baixa — PAT-10). Guarda
 * de escrita `patrimonio`; campo inválido → 400 `{error, campos}`; bem
 * inexistente → 404 `{error:"nao_encontrado"}` (PAT-09); tombo duplicado →
 * 409 `{error:"numero_patrimonio_duplicado"}` (PAT-06). **Sem rota DELETE**
 * (PAT-03 — só soft-delete via status).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("patrimonio");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const resultado = validateAsset(body, "parcial");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const asset = await atualizarAsset(id, resultado.dados as AssetPatch);
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "editar",
      entidade: "patrimonio",
      entidade_id: id,
      ip,
      user_agent,
      payload: resultado.dados as Record<string, unknown>,
    });
    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof BemNaoEncontradoError) {
      return NextResponse.json(
        { error: "nao_encontrado" },
        { status: 404 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "numero_patrimonio_duplicado" },
        { status: 409 }
      );
    }
    console.error("PATCH /api/admin/assets/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}