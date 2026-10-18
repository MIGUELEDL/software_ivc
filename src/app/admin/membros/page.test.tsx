import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMembrosPage from "./page";

const { getClaims, listMembros, contarMembros } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  listMembros: vi.fn(),
  contarMembros: vi.fn(),
}));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin/membros", () => ({ listMembros, contarMembros }));
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
 * TAB-02: o bloco TOTAL exibe o total geral de membros mesmo com busca
 * (`q`) ativa — o número não acompanha o filtro.
 */
describe("/admin/membros — TotalBloco global (TAB-02)", () => {
  it("mantém o total geral mesmo com q filtrando a lista", async () => {
    listMembros.mockResolvedValue([{ id: "m1" }]);
    contarMembros.mockResolvedValue(7);

    const html = renderToStaticMarkup(
      await AdminMembrosPage({ searchParams: Promise.resolve({ q: "ana" }) })
    );

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">7<");
    // A listagem filtrada continua com 1 linha — total ≠ filtrado
    expect(html).toContain('data-testid="lista-membros">1<');
  });

  it("TAB-04: omite o bloco quando a contagem falha", async () => {
    listMembros.mockResolvedValue([]);
    contarMembros.mockRejectedValue(new Error("db down"));

    const html = renderToStaticMarkup(
      await AdminMembrosPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).not.toContain('data-testid="total-bloco"');
  });
});
