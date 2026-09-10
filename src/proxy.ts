import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClaimsFromRequest } from "@/lib/auth/claims";
import { isAdminRole, isMemberRole } from "@/lib/auth/rbac";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = await getClaimsFromRequest(request);

  const isPainelArea = pathname.startsWith("/painel");
  const isAdminArea = pathname.startsWith("/admin");
  const isTrocarSenha = pathname === "/trocar-senha";

  // No session (or invalid/expired token) → area login.
  if (!claims) {
    if (isPainelArea) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isAdminArea) {
      return NextResponse.redirect(new URL("/login/admin", request.url));
    }
    if (isTrocarSenha) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Forced password change blocks protected areas until changed (AUTH-12).
  if (claims.forcePasswordChange && (isPainelArea || isAdminArea)) {
    return NextResponse.redirect(new URL("/trocar-senha", request.url));
  }

  // Admin session in member area → admin area (AUTH-13).
  if (isPainelArea && isAdminRole(claims.role ?? "")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Member-only area: only MEMBRO (and admins, handled above) get through;
  // any other session → member login (AUTH-19 treat as no area).
  if (isPainelArea && !isMemberRole(claims.role ?? "")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin area: any non-admin session → admin login (AUTH-14, AUTH-19).
  if (isAdminArea && !isAdminRole(claims.role ?? "")) {
    return NextResponse.redirect(new URL("/login/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/admin/:path*", "/trocar-senha"],
};