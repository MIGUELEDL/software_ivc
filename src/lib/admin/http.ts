import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import type { AuthClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import type { Modulo, Nivel } from "@/lib/auth/rbac";

/**
 * Guardas dos route handlers `/api/admin/*` — os proxies de página não cobrem
 * `/api` (design, sec. Route Handlers). Convenção: cada guarda retorna as
 * claims quando autoriza, ou um `NextResponse` de erro (401/403) que o handler
 * devolve diretamente (`instanceof NextResponse`).
 *
 * Autoridade por módulo vem da matriz `permissions` via `can()` (AD-015):
 * leitura = ler, escrita = escrever, hard-delete = administrar. Negativa é
 * registrada no log do servidor (MATRIZ-20 — observabilidade de negação).
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

/** Nega 403 e registra a negativa no log do servidor (MATRIZ-20). */
function negarPermissao(
  papel: string,
  modulo: Modulo,
  nivel: Nivel
): NextResponse {
  console.error(
    `rbac: acesso negado papel=${papel} modulo=${modulo} nivel=${nivel}`
  );
  return negar("nao_autorizado", 403);
}

/**
 * Guarda de leitura por módulo: exige `can(papel, modulo, 'ler')` — qualquer
 * papel admin com leitura na matriz passa; leitor sem linha no módulo → 403.
 * Sem sessão → 401.
 */
export async function authAdmin(
  modulo: Modulo
): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  const papel = claims.role ?? "";
  if (!(await can(papel, modulo, "ler"))) {
    return negarPermissao(papel, modulo, "ler");
  }
  return claims;
}

/**
 * Guarda de escrita por módulo: exige `can(papel, modulo, 'escrever')`.
 * Sem sessão → 401; leitor ou não-admin → 403 (negativa logada).
 */
export async function requireEscrita(
  modulo: Modulo
): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  const papel = claims.role ?? "";
  if (!(await can(papel, modulo, "escrever"))) {
    return negarPermissao(papel, modulo, "escrever");
  }
  return claims;
}

/**
 * Guarda de administrar por módulo (hard-delete e afins): exige
 * `can(papel, modulo, 'administrar')`. Sem sessão → 401; demais papéis → 403
 * (negativa logada).
 */
export async function requireAdministrar(
  modulo: Modulo
): Promise<AuthClaims | NextResponse> {
  const claims = await getClaims();
  if (!claims) {
    return negar("nao_autenticado", 401);
  }
  const papel = claims.role ?? "";
  if (!(await can(papel, modulo, "administrar"))) {
    return negarPermissao(papel, modulo, "administrar");
  }
  return claims;
}