import { NextResponse } from "next/server";
import { requireAdministrar } from "@/lib/admin/http";
import { redefinirSenha, NaoEncontradoError } from "@/lib/admin/usuarios";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdministrar("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  const { id } = await params;
  try {
    const result = await redefinirSenha(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    console.error("POST /api/admin/usuarios/[id]/senha", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
