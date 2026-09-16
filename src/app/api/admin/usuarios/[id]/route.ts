import { NextResponse } from "next/server";
import { requireAdministrar } from "@/lib/admin/http";
import {
  editarPapel,
  NaoEncontradoError,
  AutoModificacaoError,
  SuperAdminProtegidoError,
  PapelInvalidoError,
} from "@/lib/admin/usuarios";
import { ADMIN_ROLES } from "@/lib/auth/rbac";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdministrar("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  const { id } = await params;
  const body = await request.json();
  const role = String(body.role ?? "").trim();
  if (!role || !ADMIN_ROLES.has(role)) {
    return NextResponse.json({ error: "papel_invalido" }, { status: 400 });
  }
  try {
    const result = await editarPapel(id, role, auth.sub);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NaoEncontradoError) {
      return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });
    }
    if (error instanceof AutoModificacaoError) {
      return NextResponse.json(
        { error: "auto_modificacao_nao_permitida" },
        { status: 403 }
      );
    }
    if (error instanceof SuperAdminProtegidoError) {
      return NextResponse.json(
        { error: "super_admin_protegido" },
        { status: 403 }
      );
    }
    if (error instanceof PapelInvalidoError) {
      return NextResponse.json({ error: "papel_invalido" }, { status: 400 });
    }
    console.error("PATCH /api/admin/usuarios/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
