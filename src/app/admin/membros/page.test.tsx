import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMembrosPage from "./page";

const { getClaims, listMembros } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  listMembros: vi.fn(),
}));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin/membros", () => ({ listMembros }));
vi.mock("./membros-lista-client", () => ({
  MembrosListaClient: ({ membros }: { membros: { id: string }[] }) => (
    <div data-testid="lista-membros">{membros.length}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ role: "ADMIN" });
});

/**
 * TAB-05: o bloco TOTAL exibe a contagem do resultado do filtro (`q`), não o
 * total geral da tabela — com busca retornando 1 de 7, TOTAL = 1.
 * TAB-07: falha de consulta → sem strip.
 */
describe("/admin/membros — TotalBloco do filtro (TAB-05/07)", () => {
  it("TAB-05: TOTAL = contagem do resultado filtrado, não o total geral", async () => {
    // Filtro `q=ana` retornou 1 membro (de um total maior não visível aqui)
    listMembros.mockResolvedValue([{ id: "m1" }]);

    const html = renderToStaticMarkup(
      await AdminMembrosPage({ searchParams: Promise.resolve({ q: "ana" }) })
    );

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">1<");
    // Discrimina contra o total geral (7): se a página mostrasse o total
    // geral, apareceria 7 mesmo com a busca retornando 1.
    expect(html).not.toContain(">7<");
    expect(html).toContain('data-testid="lista-membros">1<');
  });

  it("TAB-05: lista cheia sem filtro → TOTAL = tamanho da lista", async () => {
    listMembros.mockResolvedValue([
      { id: "m1" },
      { id: "m2" },
      { id: "m3" },
    ]);

    const html = renderToStaticMarkup(
      await AdminMembrosPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain(">3<");
  });

  it("TAB-07: omite o bloco quando a consulta falha", async () => {
    listMembros.mockRejectedValue(new Error("db down"));

    const html = renderToStaticMarkup(
      await AdminMembrosPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).not.toContain('data-testid="total-bloco"');
  });
});
