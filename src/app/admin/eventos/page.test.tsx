import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminEventosPage from "./page";

const { getClaims, listarEventos } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  listarEventos: vi.fn(),
}));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin/eventos", () => ({ listarEventos }));
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
 * TAB-01/03/04: bloco TOTAL acima da listagem com a contagem; omitido em
 * falha de consulta; exibe 0 na listagem vazia.
 */
describe("/admin/eventos — TotalBloco (TAB-01/03/04)", () => {
  it("TAB-01: exibe o bloco TOTAL com a contagem de eventos", async () => {
    listarEventos.mockResolvedValue([
      { id: "e1", title: "Culto", date: "2026-01-01", time: "19:00", location: "Templo", visivel: true, status: "EM ABERTO" },
      { id: "e2", title: "Reunião", date: "2026-01-02", time: "20:00", location: "Templo", visivel: false, status: "CONCLUIDO" },
    ]);

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain("TOTAL");
    expect(html).toContain(">2<");
  });

  it("TAB-04: omite o bloco quando a consulta falha", async () => {
    listarEventos.mockRejectedValue(new Error("boom"));

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).not.toContain('data-testid="total-bloco"');
    expect(html).toContain("Não foi possível carregar os eventos");
  });

  it("TAB-03: exibe 0 no bloco quando a listagem está vazia", async () => {
    listarEventos.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">0<");
    expect(html).toContain("Nenhum evento cadastrado");
  });
});
