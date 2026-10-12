import * as Sentry from "@sentry/nextjs";

import { sanitize } from "@/lib/observability/logger";
import { getRelease } from "@/lib/observability/release";

/**
 * Opções compartilhadas do Sentry nos 3 runtimes (OBS-01/02/03):
 * errors-only (sem tracing/replay), sem PII default e scrub defensivo
 * no `beforeSend`. DSN ausente/vazio → `undefined` (SDK em NOOP).
 */
export interface SentrySharedOptions {
  dsn: string | undefined;
  release: string;
  sendDefaultPii: boolean;
  beforeSend: (event: Sentry.ErrorEvent) => Sentry.ErrorEvent | null;
}

export function cleanDsn(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  return raw;
}

export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.extra !== null && typeof event.extra === "object") {
    event.extra = sanitize(event.extra) as Record<string, unknown>;
  }
  if (event.contexts !== null && typeof event.contexts === "object") {
    event.contexts = sanitize(event.contexts) as Record<string, Sentry.Context>;
  }
  return event;
}

export function sentryOptions(dsnEnv: string | undefined): SentrySharedOptions {
  return {
    dsn: cleanDsn(dsnEnv),
    release: getRelease(),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  };
}
