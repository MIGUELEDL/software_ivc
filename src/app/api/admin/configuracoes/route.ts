import { NextResponse } from "next/server";
import { authAdmin, requireAdministrar } from "@/lib/admin/http";
import {
  obterConfiguracoes,
  atualizarConfiguracoes,
  SETTINGS_KEYS,
  type SettingKey,
} from "@/lib/admin/configuracoes";

export async function GET() {
  const auth = await authAdmin("configuracoes");
  if (auth instanceof NextResponse) {
    return auth;
  }
  try {
    const settings = await obterConfiguracoes();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("GET /api/admin/configuracoes", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdministrar("configuracoes");
  if (auth instanceof NextResponse) {
    return auth;
  }
  try {
    const body = await request.json();
    const raw = body?.settings;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "campo_obrigatorio", campos: { settings: "Informe as configuracoes." } },
        { status: 400 }
      );
    }
    const keysSet = new Set(SETTINGS_KEYS);
    const invalid = Object.keys(raw).filter((k) => !keysSet.has(k as SettingKey));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "chave_invalida", chaves: invalid },
        { status: 400 }
      );
    }
    await atualizarConfiguracoes(raw);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/configuracoes", error);
    const msg = error instanceof Error ? error.message : "erro_interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
