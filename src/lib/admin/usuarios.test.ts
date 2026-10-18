import { beforeEach, describe, expect, it, vi } from "vitest";

import { listarUsuarios } from "./usuarios";

const { createAdminClient } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

function montarUsers() {
  const users = [
    { id: "u1", email: "a@x.com", app_metadata: { role: "ADMIN" }, created_at: "2026-01-01", last_sign_in_at: null },
    { id: "u2", email: "b@x.com", app_metadata: { role: "FINANCEIRO" }, created_at: "2026-01-02", last_sign_in_at: null },
    { id: "u3", email: "c@x.com", app_metadata: { role: "FINANCEIRO" }, created_at: "2026-01-03", last_sign_in_at: null },
    { id: "u4", email: "m@x.com", app_metadata: { role: "MEMBRO" }, created_at: "2026-01-04", last_sign_in_at: null },
  ];
  const listUsers = vi.fn().mockResolvedValue({
    data: { users },
    error: null,
  });
  createAdminClient.mockReturnValue({ auth: { admin: { listUsers } } });
  return listUsers;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * TAB-05: `total` é a contagem do resultado filtrado por papel — não o total
 * geral de usuários admin.
 */
describe("listarUsuarios — total do filtro (TAB-05)", () => {
  it("total reflete o filtro de papel", async () => {
    montarUsers();

    const resultado = await listarUsuarios({ role: "FINANCEIRO" });

    expect(resultado.total).toBe(2);
    expect(resultado.users.map((u) => u.id)).toEqual(["u2", "u3"]);
  });

  it("sem filtro de papel, total = papéis admin listados", async () => {
    montarUsers();

    const resultado = await listarUsuarios();

    expect(resultado.total).toBe(3);
    // MEMBRO não é papel admin da listagem
    expect(resultado.users.some((u) => u.id === "u4")).toBe(false);
  });
});
