import { describe, expect, it } from "vitest";

import { code128 } from "@/lib/barcode/code128";

/**
 * Smoke de alias (FWT-EDGE): exercita o resolver `@/*` de ponta a ponta.
 *
 * Sem este teste, uma config de alias quebrada só apareceria na primeira
 * suíte que importasse por `@/`. Ele falha alto se `vite-tsconfig-paths`
 * deixar de resolver o `paths` do `tsconfig.json`.
 */
describe("alias @/* do tsconfig", () => {
  it("resolve @/lib/barcode/code128 pelo alias e o módulo é executável", () => {
    expect(typeof code128).toBe("function");
    // Code 128 começa sempre com START B (104) = "11010010000".
    expect(code128("IVC-0001").startsWith("11010010000")).toBe(true);
  });
});
