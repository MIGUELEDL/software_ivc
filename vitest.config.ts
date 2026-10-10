import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Configuração única do Vitest para o piloto de domínio puro (FWT-01).
 *
 * - `tsconfigPaths()` resolve o alias `@/*` a partir do `paths` do
 *   `tsconfig.json` — sem duplicar a lista aqui.
 * - `environment: "node"`: só módulos puros, sem DOM no piloto.
 * - `include` restrito a `src/** /*.test.ts`: rotas/SSR/Postgres continuam
 *   cobertos pelos probes bash (AD-031).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: ["default"],
  },
});
