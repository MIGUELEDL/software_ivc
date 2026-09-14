import { NextResponse } from "next/server";
import { requireEscrita, erroCampos } from "@/lib/admin/http";
import {
  criarLider,
  IgrejaNaoEncontradaError,
  type LiderDados,
} from "@/lib/admin/lideranca";

/**
 * POST /api/admin/igrejas/[id]/lideres — cria líder com `status='ATIVO'`
 * (IGR-16). Guarda de escrita `igrejas`; igreja inexistente → 404 (IGR-17);
 * validação por campo (nome/cargo/ordem) → 400 `{error, campos}`; sucesso →
 * 201 `{ lider }`.
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

  let body: { name?: unknown; role?: unknown; order?: unknown };
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim();
  const order = Number(body.order);

  const campos: Record<string, string> = {};
  if (!name) {
    campos.name = "Informe o nome do líder.";
  }
  if (!role) {
    campos.role = "Informe o cargo.";
  }
  if (
    body.order !== undefined &&
    (Number.isNaN(order) || !Number.isInteger(order) || order < 0)
  ) {
    campos.order = "Ordem deve ser um inteiro >= 0.";
  }

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  try {
    const dados: LiderDados = { name, role };
    if (body.order !== undefined) {
      dados.order = order;
    }

    const lider = await criarLider(id, dados);
    return NextResponse.json({ lider }, { status: 201 });
  } catch (error) {
    if (error instanceof IgrejaNaoEncontradaError) {
      return NextResponse.json(
        { error: "igreja_nao_encontrada" },
        { status: 404 }
      );
    }
    console.error("POST /api/admin/igrejas/[id]/lideres", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}