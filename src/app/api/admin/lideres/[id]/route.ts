import { NextResponse } from "next/server";
import { requireEscrita, erroCampos } from "@/lib/admin/http";
import {
  atualizarLider,
  LiderNaoEncontradoError,
  StatusLiderInvalidoError,
  type LiderPatch,
  type LiderStatus,
} from "@/lib/admin/lideranca";

/**
 * PATCH /api/admin/lideres/[id] — atualiza campos enviados (IGR-18), incluindo
 * `status` para soft-delete ATIVO↔INATIVO (IGR-19). Guarda de escrita
 * `igrejas`; líder inexistente → 404; campo inválido → 400 `{error, campos}`;
 * sucesso → 200 `{ lider }`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("igrejas");
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

  const dados: LiderPatch = {};
  const campos: Record<string, string> = {};

  if (body.name !== undefined) {
    const valor = String(body.name).trim();
    if (!valor) {
      campos.name = "Não deixe o nome vazio.";
    } else {
      dados.name = valor;
    }
  }

  if (body.role !== undefined) {
    const valor = String(body.role).trim();
    if (!valor) {
      campos.role = "Não deixe o cargo vazio.";
    } else {
      dados.role = valor;
    }
  }

  if (body.order !== undefined) {
    const order = Number(body.order);
    if (Number.isNaN(order) || !Number.isInteger(order) || order < 0) {
      campos.order = "Ordem deve ser um inteiro >= 0.";
    } else {
      dados.order = order;
    }
  }

  if (body.status !== undefined) {
    if (body.status !== "ATIVO" && body.status !== "INATIVO") {
      campos.status = "Status deve ser ATIVO ou INATIVO.";
    } else {
      dados.status = body.status as LiderStatus;
    }
  }

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  try {
    const lider = await atualizarLider(id, dados);
    return NextResponse.json({ lider });
  } catch (error) {
    if (error instanceof LiderNaoEncontradoError) {
      return NextResponse.json(
        { error: "lider_nao_encontrado" },
        { status: 404 }
      );
    }
    if (error instanceof StatusLiderInvalidoError) {
      return erroCampos({ status: "Status deve ser ATIVO ou INATIVO." });
    }
    console.error("PATCH /api/admin/lideres/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}