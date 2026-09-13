import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import type { AuthClaims } from "@/lib/auth/claims";
import { can, isAdminRole } from "@/lib/auth/rbac";

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
 * Guarda de leitura: qualquer papel admin autenticado passa — a autoridade
 * fina por módulo vira `can()`; o merge para guardas module-aware acontece na
 * evolução deste arquivo (T3 da matriz). Sem sessão → 401; papel não-admin
 * (ex.: MEMBRO) → 403.
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
 * Guarda de escrita em membros (paridade com a policy 0006): decide pela
 * matriz `can("membros","escrever")` (SECRETARIA/ADMIN/SUPER_ADMIN). Sem
 * sessão → 401; leitor ou não-admin → 403. Ainda com assinatura fixa no
 * módulo membros até os callers migrarem para `requireEscrita(modulo)`.
 */
export async function requireWriter(): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  if (!(await can(claims.role ?? "", "membros", "escrever"))) {
    return negar("nao_autorizado", 403);
  }
  return claims;
}

/**
 * Guarda de hard-delete em membros (paridade com a policy 0006): decide pela
 * matriz `can("membros","administrar")` (ADMIN/SUPER_ADMIN — SECRETARIA e
 * demais → 403, secretaria inativa e não apaga).
 */
export async function requireHardDelete(): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  if (!(await can(claims.role ?? "", "membros", "administrar"))) {
    return negar("nao_autorizado", 403);
  }
  return claims;
}