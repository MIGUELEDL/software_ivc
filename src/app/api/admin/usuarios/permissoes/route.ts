import { NextResponse } from "next/server";
import { requireAdministrar } from "@/lib/admin/http";
import { obterMatriz, atualizarMatriz } from "@/lib/admin/permissoes";

export async function GET() {
  const auth = await requireAdministrar("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  try {
    const matrix = await obterMatriz();
    return NextResponse.json({ matrix });
  } catch (error) {
    console.error("GET /api/admin/usuarios/permissoes", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdministrar("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  const body = await request.json();
  const updates = body.updates;
  if (!Array.isArray(updates)) {
    return NextResponse.json(
      { error: "dados_invalidos", campos: { updates: "Array esperado." } },
      { status: 400 }
    );
  }
  try {
    const result = await atualizarMatriz(updates);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("nivel_invalido")) {
      return NextResponse.json({ error: "nivel_invalido" }, { status: 400 });
    }
    if (msg.startsWith("role_invalida") || msg.startsWith("modulo_invalido")) {
      return NextResponse.json({ error: "dados_invalidos" }, { status: 400 });
    }
    console.error("PUT /api/admin/usuarios/permissoes", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
