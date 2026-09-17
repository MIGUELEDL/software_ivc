import { NextResponse } from "next/server";
import { requireEscrita, erroCampos } from "@/lib/admin/http";
import {
  atualizarEvento,
  EventoNaoEncontradoError,
  type EventoPatch,
} from "@/lib/admin/eventos";
import { validarEvento } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * PATCH /api/admin/eventos/[id] — atualiza apenas os campos enviados
 * (EVT-08), incluindo `visivel` (toggle — EVT-11) e `status` `ATIVO`/`INATIVO`
 * (soft-delete — EVT-10). Guarda de escrita `eventos`; campo inválido → 400
 * `{error, campos}`; evento inexistente → 404 `{error:"nao_encontrado"}`
 * (EVT-09); sucesso → 200 `{ evento }`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("eventos");
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

  const resultado = validarEvento(body, "parcial");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const evento = await atualizarEvento(id, resultado.dados as EventoPatch);
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "editar",
      entidade: "eventos",
      entidade_id: id,
      ip,
      user_agent,
      payload: resultado.dados as Record<string, unknown>,
    });
    return NextResponse.json({ evento });
  } catch (error) {
    if (error instanceof EventoNaoEncontradoError) {
      return NextResponse.json(
        { error: "nao_encontrado" },
        { status: 404 }
      );
    }
    console.error("PATCH /api/admin/eventos/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}