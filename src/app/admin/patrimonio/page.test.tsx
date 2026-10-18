import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPatrimonioPage from "./page";

const { getClaims, listarAssets } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  listarAssets: vi.fn(),
}));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin/assets", () => ({ listarAssets }));
vi.mock("./delete-button", () => ({ DeleteAssetButton: () => null }));
vi.mock("next/link", () => ({
  default: function LinkMock({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ role: "ADMIN" });
});

/**
 * TAB-06/07: faixa TOTAL embutida no cabeçalho do card da tabela (padrão
 * usuários); falha = card de erro sem strip.
 */
describe("/admin/patrimonio — faixa TOTAL no card (TAB-06/07)", () => {
  it("TAB-06: a faixa TOTAL fica dentro do card da tabela, no cabeçalho", async () => {
    listarAssets.mockResolvedValue([
      { id: "a1", name: "Arara", category: "Mobiliário", status: "ATIVO", acquisition_value: 100 },
      { id: "a2", name: "Mesa", category: "Mobiliário", status: "ATIVO", acquisition_value: 200 },
      { id: "a3", name: "Cadeira", category: "Mobiliário", status: "ATIVO", acquisition_value: 50 },
    ]);

    const html = renderToStaticMarkup(await AdminPatrimonioPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">3<");
    expect(html).toContain(
      "p-4 border-b border-white/10 flex items-center justify-between"
    );
    expect(html.indexOf('data-testid="total-bloco"')).toBeGreaterThan(
      html.indexOf("tabela-scroll")
    );
  });

  it("TAB-07: falha de consulta mostra card de erro sem a faixa TOTAL", async () => {
    listarAssets.mockRejectedValue(new Error("boom"));

    const html = renderToStaticMarkup(await AdminPatrimonioPage());

    expect(html).not.toContain('data-testid="total-bloco"');
    expect(html).toContain("Não foi possível carregar o inventário");
  });

  it("TAB-06: vazio = TOTAL 0 e mensagem no mesmo card", async () => {
    listarAssets.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminPatrimonioPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">0<");
    expect(html).toContain("Nenhum bem cadastrado");
    expect(html).not.toContain("<table");
  });
});
