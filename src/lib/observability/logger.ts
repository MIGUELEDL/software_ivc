import * as Sentry from "@sentry/nextjs";

import { getRelease } from "@/lib/observability/release";

/**
 * Log estruturado anti-PII (OBS-09) + `reportError` (OBS-10).
 *
 * Saída: uma linha JSON por chamada (`{ level, evento, ts, release, meta? }`)
 * no stdout — capturada pelos function logs da Vercel. Nenhuma chave PII
 * chega ao log nem ao Sentry: `sanitize` mascara antes de emitir.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const MASKED = "[redacted]";
const TRUNCATED = "__truncated__";
const MAX_DEPTH = 3;

const PII_KEYS = new Set([
  "email",
  "cpf",
  "rg",
  "foto",
  "telefone",
  "endereco",
  "senha",
  "token",
  "password",
  "secret",
]);

function isPiiKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PII_KEYS.has(lower) || lower.endsWith("_pii");
}

/**
 * Mascara chaves PII (recursivo até MAX_DEPTH; além disso trunca com
 * marcador). Idempotente: valor já mascarado continua mascarado.
 */
export function sanitize(meta: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return TRUNCATED;
  if (Array.isArray(meta)) return meta.map((item) => sanitize(item, depth + 1));
  if (meta !== null && typeof meta === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      out[key] = isPiiKey(key) ? MASKED : sanitize(value, depth + 1);
    }
    return out;
  }
  return meta;
}

function emit(level: LogLevel, evento: string, meta?: unknown): void {
  const entry: Record<string, unknown> = {
    level,
    evento,
    ts: new Date().toISOString(),
    release: getRelease(),
  };
  if (meta !== undefined) entry.meta = sanitize(meta);
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "info") console.info(line);
  else console.log(line);
}

export const logger = {
  debug: (evento: string, meta?: unknown): void => emit("debug", evento, meta),
  info: (evento: string, meta?: unknown): void => emit("info", evento, meta),
  warn: (evento: string, meta?: unknown): void => emit("warn", evento, meta),
  error: (evento: string, meta?: unknown): void => emit("error", evento, meta),
};

/**
 * Caminho único de falha operacional: loga em error e captura no Sentry
 * com o mesmo evento + meta sanitizada. O status HTTP da rota chamadora
 * não muda (a captura nunca propaga).
 */
export function reportError(
  erro: unknown,
  contexto: { evento: string; meta?: unknown },
): void {
  const base =
    contexto.meta !== null &&
    typeof contexto.meta === "object" &&
    !Array.isArray(contexto.meta)
      ? (contexto.meta as Record<string, unknown>)
      : { meta: contexto.meta };
  const erroInfo =
    erro instanceof Error ? { name: erro.name, message: erro.message } : erro;
  logger.error(contexto.evento, { ...base, erro: erroInfo });
  try {
    Sentry.captureException(erro, {
      extra: { evento: contexto.evento, meta: sanitize(contexto.meta) },
    });
  } catch {
    // Falha de envio (rede/quota) nunca propaga: o log acima já registrou.
  }
}
