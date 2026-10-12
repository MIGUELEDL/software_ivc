import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger, reportError, sanitize } from "@/lib/observability/logger";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { captureException } from "@sentry/nextjs";

/**
 * Log estruturado anti-PII (OBS-09) + reportError (OBS-10).
 * Cada asserção mira o valor exato exigido pela spec, não a chamada que o produziu.
 */
describe("sanitize", () => {
  it("remove chaves PII top-level e mantém as demais", () => {
    const out = sanitize({ email: "a@b.c", cpf: "123", descricao: "Doação PIX" }) as Record<string, unknown>;
    expect(out.email).toBe("[redacted]");
    expect(out.cpf).toBe("[redacted]");
    expect(out.descricao).toBe("Doação PIX");
  });

  it("mascara PII mesmo com valor vazio (killer: pular falsy vazaria a chave)", () => {
    const out = sanitize({ email: "", cpf: "123" }) as Record<string, unknown>;
    expect(out.email).toBe("[redacted]");
    expect("cpf" in out).toBe(true);
  });

  it("sanitiza PII aninhada recursivamente", () => {
    const out = sanitize({ pagador: { email: "a@b.c", nome: "Maria" } }) as {
      pagador: Record<string, unknown>;
    };
    expect(out.pagador.email).toBe("[redacted]");
    expect(out.pagador.nome).toBe("Maria");
  });

  it('mascara chaves com sufixo "_pii"', () => {
    const out = sanitize({ observacao_pii: "x", valor: 10 }) as Record<string, unknown>;
    expect(out.observacao_pii).toBe("[redacted]");
    expect(out.valor).toBe(10);
  });

  it("sanitiza elemento a elemento em arrays", () => {
    const out = sanitize([{ email: "a@b.c" }, { nome: "João" }]) as Array<Record<string, unknown>>;
    expect(out[0].email).toBe("[redacted]");
    expect(out[1].nome).toBe("João");
  });

  it("trunca além da profundidade 3 com marcador", () => {
    const deep = { a: { b: { c: { d: { email: "a@b.c" } } } } };
    const out = sanitize(deep) as { a: { b: { c: { d: unknown } } } };
    expect(out.a.b.c.d).toBe("__truncated__");
  });

  it("preserva primitivos intactos", () => {
    expect(sanitize("texto")).toBe("texto");
    expect(sanitize(42)).toBe(42);
    expect(sanitize(true)).toBe(true);
    expect(sanitize(null)).toBe(null);
  });
});

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "sha-teste-123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function lastJson(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
    const arg = spy.mock.calls[spy.mock.calls.length - 1][0] as string;
    return JSON.parse(arg) as Record<string, unknown>;
  }

  it("emite JSON com level, evento, ts, release e meta sanitizada", () => {
    logger.info("webhook.recebido", { email: "a@b.c", tipo: "payment" });
    const entry = lastJson(infoSpy);
    expect(entry.level).toBe("info");
    expect(entry.evento).toBe("webhook.recebido");
    expect(typeof entry.ts).toBe("string");
    expect(entry.release).toBe("sha-teste-123");
    expect(entry.meta).toEqual({ email: "[redacted]", tipo: "payment" });
  });

  it("omite a chave meta quando não há meta", () => {
    logger.info("boot.ok");
    const entry = lastJson(infoSpy);
    expect("meta" in entry).toBe(false);
  });

  it("mapeia cada nível para o console correspondente", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe("reportError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "sha-teste-123");
    vi.mocked(captureException).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("loga em error E captura no Sentry com evento e meta sanitizada", () => {
    const erro = new Error("insert falhou");
    reportError(erro, { evento: "webhook.log_erro", meta: { email: "a@b.c", codigo: "23505" } });

    expect(console.error).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(
      vi.mocked(console.error).mock.calls[0][0] as string,
    ) as { evento: string; meta: Record<string, unknown> };
    expect(logged.evento).toBe("webhook.log_erro");
    expect(logged.meta.email).toBe("[redacted]");
    expect(logged.meta.codigo).toBe("23505");
    expect(logged.meta.erro).toEqual({ name: "Error", message: "insert falhou" });

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureException).mock.calls[0][0]).toBe(erro);
    const options = vi.mocked(captureException).mock.calls[0][1] as {
      extra: { evento: string; meta: Record<string, unknown> };
    };
    expect(options.extra.evento).toBe("webhook.log_erro");
    expect(options.extra.meta.email).toBe("[redacted]");
  });
});
