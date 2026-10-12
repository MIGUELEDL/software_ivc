import { afterEach, describe, expect, it, vi } from "vitest";

import { getRelease } from "@/lib/observability/release";

/**
 * Fonte única do release (OBS-03): SHA do deploy na Vercel ou "unknown".
 */
describe("getRelease", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna o SHA quando VERCEL_GIT_COMMIT_SHA está definido", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123def456");
    expect(getRelease()).toBe("abc123def456");
  });

  it('retorna "unknown" quando a variável está ausente ou vazia', () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    expect(getRelease()).toBe("unknown");
  });

  it('retorna "unknown" quando a variável é string em branco', () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "   ");
    expect(getRelease()).toBe("unknown");
  });
});
