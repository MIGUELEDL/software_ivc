import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import type { AuthClaims } from "@/lib/auth/claims";
import {
  isAdminRole,
  isAdminWriterRole,
  isHardDeleteRole,
} from "@/lib/auth/rbac";

/**
 * Guardas dos route handlers `/api/admin/*` — os proxies de página não cobrem
 * `/api` (design, sec. Route Handlers). Convenção: cada guarda retorna as
 * claims quando autoriza, ou um `NextResponse` de erro (401/403) que o handler
 * devolve diretamente (`instanceof NextResponse`).
 *
 * Formato de erro (padrão painel-membro): 401 `{ error: "nao_autenticado" }`,
 * 403 `{ error: "nao_autorizado" }`, 400 `{ error: "dados_invalidos", campos }`.
 */

/** 400 por campo no shape do painel-membro (design, sec. Error Handling). */
export function erroCampos(campos: Record<string, string>): NextResponse {
  return NextResponse.json(
    { error: "dados_invalidos", campos },
    { status: 400 }
  );
}

function negar(mensagem: "nao_autenticado" | "nao_autorizado", status: 401 | 403) {
  return NextResponse.json({ error: mensagem }, { status });
}

/**
 * Guarda de leitura (ADMINMEM-32): qualquer papel admin autenticado passa —
 * leitores (FINANCEIRO/PATRIMONIAL/LIDER) leem. Sem sessão → 401; papel
 * não-admin (ex.: MEMBRO) → 403.
 */
export async function authAdmin(): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  if (!isAdminRole(claims.role ?? "")) {
    return negar("nao_autorizado", 403);
  }
  return claims;
}

/**
 * Guarda de escrita (ADMINMEM-33): SECRETARIA/ADMIN/SUPER_ADMIN. Sem sessão →
 * 401; leitor ou não-admin → 403.
 */
export async function requireWriter(): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  if (!isAdminWriterRole(claims.role ?? "")) {
    return negar("nao_autorizado", 403);
  }
  return claims;
}

/**
 * Guarda de hard-delete (ADMINMEM-21..23/34): ADMIN/SUPER_ADMIN. Sem sessão →
 * 401; SECRETARIA e demais → 403 (secretaria inativa, não apaga).
 */
export async function requireHardDelete(): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  if (!isHardDeleteRole(claims.role ?? "")) {
    return negar("nao_autorizado", 403);
  }
  return claims;
}