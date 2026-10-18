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
 * TAB-01/04: bloco TOTAL acima do inventário; omitido em falha de consulta.
 */
describe("/admin/patrimonio — TotalBloco (TAB-01/04)", () => {
  it("TAB-01: exibe o bloco TOTAL com a contagem de bens", async () => {
    listarAssets.mockResolvedValue([
      { id: "a1", name: "Arara", category: "Mobiliário", status: "ATIVO", acquisition_value: 100 },
      { id: "a2", name: "Mesa", category: "Mobiliário", status: "ATIVO", acquisition_value: 200 },
      { id: "a3", name: "Cadeira", category: "Mobiliário", status: "ATIVO", acquisition_value: 50 },
    ]);

    const html = renderToStaticMarkup(await AdminPatrimonioPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">3<");
  });

  it("TAB-04: omite o bloco quando a consulta falha", async () => {
    listarAssets.mockRejectedValue(new Error("boom"));

    const html = renderToStaticMarkup(await AdminPatrimonioPage());

    expect(html).not.toContain('data-testid="total-bloco"');
    expect(html).toContain("Não foi possível carregar o inventário");
  });
});
