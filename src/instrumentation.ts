import * as Sentry from "@sentry/nextjs";

/**
 * Registro server/edge do Next (convenção estável 15+): carrega o init do
 * Sentry no boot e encaminha erros de request (OBS-01). Sem DSN o SDK
 * opera em NOOP — o boot nunca quebra por causa da observabilidade (OBS-02).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
