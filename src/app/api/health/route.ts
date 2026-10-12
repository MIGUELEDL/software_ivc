import { NextResponse } from "next/server";

import { getRelease } from "@/lib/observability/release";

/**
 * GET /api/health — uptime público e raso (OBS-05..08).
 *
 * Sem autenticação (monitores externos), sem consulta a banco/Supabase, sem
 * PII e sem Sentry no caminho: a rota responde mesmo com o Sentry fora.
 * Só `GET` é exportado — demais métodos caem em 405 por convenção.
 */
export function GET() {
  return NextResponse.json({ status: "ok", release: getRelease() });
}
