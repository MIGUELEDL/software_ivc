import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Configuração única do Vitest para o piloto de domínio puro (FWT-01).
 *
 * - `tsconfigPaths()` resolve o alias `@/*` a partir do `paths` do
 *   `tsconfig.json` — sem duplicar a lista aqui.
 * - `environment: "node"` padrão: só módulos puros (AD-031). Testes de
 *   componente React (.test.tsx) optam por jsdom via docblock
 *   `@vitest-environment jsdom` — sem mudar o ambiente global do piloto.
 * - `include` cobre `*.test.ts` (rotas/lógica) e `*.test.tsx` (componentes);
 *   SSR/Postgres continuam com probes bash.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    reporters: ["default"],
  },
});
