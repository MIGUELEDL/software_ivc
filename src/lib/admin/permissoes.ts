import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES, MODULOS } from "@/lib/auth/rbac";
import type { Nivel } from "@/lib/auth/rbac";

const NIVEIS_VALIDOS: readonly Nivel[] = ["ler", "escrever", "administrar"];

interface PermissaoRow {
  role: string;
  module: string;
  nivel: string;
}

interface AtualizarResult {
  ok: true;
  updated: number;
}

export async function obterMatriz(): Promise<PermissaoRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("permissions")
    .select("role, module, nivel")
    .order("role")
    .order("module");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function atualizarMatriz(
  updates: Array<{ role: string; module: string; nivel: string }>
): Promise<AtualizarResult> {
  const admin = createAdminClient();
  let updated = 0;
  for (const u of updates) {
    if (!ADMIN_ROLES.has(u.role)) {
      throw new Error(`role_invalida: ${u.role}`);
    }
    if (!(MODULOS as readonly string[]).includes(u.module)) {
      throw new Error(`modulo_invalido: ${u.module}`);
    }
    if (!NIVEIS_VALIDOS.includes(u.nivel as Nivel)) {
      throw new Error(`nivel_invalido: ${u.nivel}`);
    }
    const { error } = await admin.from("permissions").upsert(
      { role: u.role, module: u.module, nivel: u.nivel },
      { onConflict: "role,module" }
    );
    if (error) {
      throw error;
    }
    updated++;
  }
  return { ok: true, updated };
}
