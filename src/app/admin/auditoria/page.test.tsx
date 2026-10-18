import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAuditoriaPage from "./page";

const { getClaims, listarAuditoria } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  listarAuditoria: vi.fn(),
}));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/admin/auditoria", () => ({ listarAuditoria }));
vi.mock("./auditoria-filtros", () => ({
  default: () => <div data-testid="auditoria-filtros" />,
}));

function logsFixture(quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `log-${i}`,
    user_id: "u1",
    user_email: "admin@x.com",
    action: "criar",
    entity: "membros",
    entity_id: "m1",
    created_at: "2026-10-18T12:00:00Z",
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ role: "ADMIN" });
});

/**
 * TAB-05: auditoria paginada — o TOTAL exibe o total filtrado (todas as
 * páginas, vindo do count de `listarAuditoria`), não o tamanho do array da
 * página corrente (20) nem um count global separado.
 */
describe("/admin/auditoria — TotalBloco do filtro (TAB-05)", () => {
  it("TOTAL = total filtrado (45) mesmo com 20 logs na página", async () => {
    listarAuditoria.mockResolvedValue({
      logs: logsFixture(20),
      total: 45,
    });

    const html = renderToStaticMarkup(
      await AdminAuditoriaPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain('data-testid="total-bloco"');
    expect(html).toContain(">45<");
    // Discrimina contra o tamanho da página corrente (20) e contra o total
    // geral sem filtro — o número vem do count com filtros de listarAuditoria.
    expect(html).not.toContain(">20<");
  });

  it("filtro de ação reduz o total exibido", async () => {
    listarAuditoria.mockResolvedValue({
      logs: logsFixture(3),
      total: 3,
    });

    const html = renderToStaticMarkup(
      await AdminAuditoriaPage({ searchParams: Promise.resolve({ acao: "criar" }) })
    );

    expect(html).toContain(">3<");
    expect(listarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "criar" })
    );
  });
});
