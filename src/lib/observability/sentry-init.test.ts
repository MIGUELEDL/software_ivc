import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Sentry from "@sentry/nextjs";

import {
  cleanDsn,
  sentryOptions,
} from "@/lib/observability/sentry-options";

/**
 * Smoke do wiring Sentry (OBS-01/02/03): fábrica de opções + init real
 * sem DSN / com DSN malformado nunca lança; release aplicado; scrub no beforeSend.
 */
describe("sentryOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia DSN ausente/vazio para undefined (NOOP) e aplica o release", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "sha-teste-123");
    const sem = sentryOptions(undefined);
    expect(sem.dsn).toBeUndefined();
    expect(sem.release).toBe("sha-teste-123");
    expect(sem.sendDefaultPii).toBe(false);
    const vazio = sentryOptions("   ");
    expect(vazio.dsn).toBeUndefined();
    // Errors-only por construção: sem tracing, sem replay.
    expect("tracesSampleRate" in sem).toBe(false);
    expect("replaysSessionSampleRate" in sem).toBe(false);
  });

  it("preserva DSN válido", () => {
    const opts = sentryOptions("https://chave@o0.ingest.sentry.io/0");
    expect(opts.dsn).toBe("https://chave@o0.ingest.sentry.io/0");
  });

  it("beforeSend remove PII de extra/contexts e mantém o resto", () => {
    const opts = sentryOptions(undefined);
    const out = opts.beforeSend({
      extra: { email: "a@b.c", codigo: "23505" },
      contexts: { dados: { cpf: "123", modulo: "financeiro" } },
    } as unknown as Sentry.ErrorEvent);
    expect(out?.extra).toEqual({ email: "[redacted]", codigo: "23505" });
    expect(out?.contexts).toEqual({ dados: { cpf: "[redacted]", modulo: "financeiro" } });
  });
});

describe("cleanDsn", () => {
  it("devolve undefined para ausente/vazio e o valor para DSN preenchido", () => {
    expect(cleanDsn(undefined)).toBeUndefined();
    expect(cleanDsn("")).toBeUndefined();
    expect(cleanDsn("https://x@o0.ingest.sentry.io/0")).toBe("https://x@o0.ingest.sentry.io/0");
  });
});

describe("init real sem DSN / malformado (OBS-02)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    delete process.env.NEXT_RUNTIME;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.NEXT_RUNTIME;
  });

  it("register() com NEXT_RUNTIME=nodejs não lança sem DSN", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const mod = await import("@/instrumentation");
    await expect(mod.register()).resolves.toBeUndefined();
  });

  it("register() com NEXT_RUNTIME=edge não lança sem DSN", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const mod = await import("@/instrumentation");
    await expect(mod.register()).resolves.toBeUndefined();
  });

  it("init com DSN malformado não lança (SDK tolera, opera degradado)", async () => {
    vi.stubEnv("SENTRY_DSN", "nao-e-um-dsn");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const mod = await import("@/instrumentation");
    await expect(mod.register()).resolves.toBeUndefined();
  });

  it("onRequestError é o hook do SDK", async () => {
    const Sentry = await import("@sentry/nextjs");
    const mod = await import("@/instrumentation");
    expect(mod.onRequestError).toBe(Sentry.captureRequestError);
  });
});
