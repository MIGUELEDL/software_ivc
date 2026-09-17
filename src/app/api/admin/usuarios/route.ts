import { NextResponse } from "next/server";
import { authAdmin, requireAdministrar, erroCampos } from "@/lib/admin/http";
import {
  listarUsuarios,
  criarUsuario,
  EmailEmUsoError,
  PapelInvalidoError,
} from "@/lib/admin/usuarios";
import { ADMIN_ROLES } from "@/lib/auth/rbac";
import { validarEmail } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

export async function GET(request: Request) {
  const auth = await authAdmin("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? undefined;
  if (role && !ADMIN_ROLES.has(role)) {
    return NextResponse.json({ error: "papel_invalido" }, { status: 400 });
  }
  try {
    const result = await listarUsuarios({ role });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/usuarios", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdministrar("usuarios");
  if (auth instanceof NextResponse) {
    return auth;
  }
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  const role = String(body.role ?? "").trim();
  const campos: Record<string, string> = {};
  if (!email || !validarEmail(email)) {
    campos.email = "Informe um e-mail válido.";
  }
  if (!role || !ADMIN_ROLES.has(role)) {
    campos.role = "Papel inválido.";
  }
  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }
  try {
    const result = await criarUsuario({ email, role });
    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "criar",
      entidade: "usuarios",
      entidade_id: result.id,
      ip,
      user_agent,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof EmailEmUsoError) {
      return NextResponse.json({ error: "email_em_uso" }, { status: 409 });
    }
    if (error instanceof PapelInvalidoError) {
      return NextResponse.json({ error: "papel_invalido" }, { status: 400 });
    }
    console.error("POST /api/admin/usuarios", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
