import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

const { createServerClient, listarIgrejas, listarLideresAtivos, obterConfiguracoes } =
  vi.hoisted(() => ({
    createServerClient: vi.fn(),
    listarIgrejas: vi.fn(),
    listarLideresAtivos: vi.fn(),
    obterConfiguracoes: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({ createServerClient }));
vi.mock("@/lib/admin/lideranca", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/admin/lideranca")>();
  return { ...original, listarIgrejas, listarLideresAtivos };
});
vi.mock("@/lib/admin/configuracoes", () => ({ obterConfiguracoes }));

beforeEach(() => {
  vi.clearAllMocks();
  listarIgrejas.mockResolvedValue([]);
  listarLideresAtivos.mockResolvedValue([]);
  obterConfiguracoes.mockResolvedValue({ settings: {} });
  createServerClient.mockResolvedValue({
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
});

/**
 * Regressão comportamental ANI-01/04: o resultado da RPC
 * `aniversariantes_do_dia` é repassado ao banner da home — descartar o dado
 * aqui (fallback silencioso) derruba esta asserção.
 */
describe("Home — banner de aniversário via RPC (ANI-01)", () => {
  it("renderiza o banner com os nomes devolvidos pela RPC", async () => {
    createServerClient.mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: ["Maria das Vitórias Silva"], error: null }),
    });

    const jsx = await Home();
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Hoje tem aniversário!");
    expect(html).toContain("Feliz aniversário, Maria das Vitórias Silva!");
    expect(html).toContain(
      "Que Deus abençoe você com muita saúde"
    );
  });

  it("sem aniversariante a home não renderiza o banner", async () => {
    const jsx = await Home();
    const html = renderToStaticMarkup(jsx);

    expect(html).not.toContain("Hoje tem aniversário!");
    expect(html).toContain("Igreja"); // home continua no ar (degradação)
  });
});
