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
 * TAB-06/07: faixa TOTAL embutida no cabeçalho do card da tabela (padrão
 * usuários); vazio = TOTAL 0 + mensagem no mesmo card; falha = card de erro
 * sem strip.
 */
describe("/admin/eventos — faixa TOTAL no card (TAB-06/07)", () => {
  it("TAB-06: a faixa TOTAL fica dentro do card da tabela, no cabeçalho", async () => {
    listarEventos.mockResolvedValue([
      { id: "e1", title: "Culto", date: "2026-01-01", time: "19:00", location: "Templo", visivel: true, status: "EM ABERTO" },
      { id: "e2", title: "Reunião", date: "2026-01-02", time: "20:00", location: "Templo", visivel: false, status: "CONCLUIDO" },
    ]);

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain("TOTAL");
    expect(html).toContain(">2<");
    // Padrão usuários: strip p-4 border-b flex items-center justify-between
    expect(html).toContain(
      "p-4 border-b border-white/10 flex items-center justify-between"
    );
    // O strip aparece depois da abertura do card (tabela-scroll) — embutido.
    expect(html.search("tabela-scroll")).toBeGreaterThan(-1);
    expect(html.indexOf('data-testid="total-bloco"')).toBeGreaterThan(
      html.indexOf("tabela-scroll")
    );
  });

  it("TAB-07: falha de consulta mostra card de erro sem a faixa TOTAL", async () => {
    listarEventos.mockRejectedValue(new Error("boom"));

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).not.toContain('data-testid="total-bloco"');
    expect(html).toContain("Não foi possível carregar os eventos");
  });

  it("TAB-06: vazio = TOTAL 0 e mensagem no mesmo card", async () => {
    listarEventos.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminEventosPage());

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">0<");
    expect(html).toContain("Nenhum evento cadastrado");
    expect(html).toContain(
      "p-4 border-b border-white/10 flex items-center justify-between"
    );
    // Vazio: sem tabela, mas com o card que hospeda a faixa.
    expect(html).not.toContain("<table");
  });
});
