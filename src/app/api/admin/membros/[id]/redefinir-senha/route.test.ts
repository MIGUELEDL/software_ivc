import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { requireAdministrar, getMembro, createAdminClient, registrarAuditoria } =
  vi.hoisted(() => ({
    requireAdministrar: vi.fn(),
    getMembro: vi.fn(),
    createAdminClient: vi.fn(),
    registrarAuditoria: vi.fn(),
  }));

vi.mock("@/lib/admin/http", () => ({ requireAdministrar }));
vi.mock("@/lib/admin/membros", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/membros")>();
  return { ...original, getMembro };
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/admin/auditoria", () => ({
  registrarAuditoria,
  extrairInfoRequest: vi.fn(() => ({ ip: "127.0.0.1", user_agent: "vitest" })),
}));

const PARAMS = { params: Promise.resolve({ id: "membro-1" }) };

function fazerRequest(): Request {
  return new Request("http://localhost/api/admin/membros/membro-1/redefinir-senha", {
    method: "POST",
  });
}

function montarAdmin(authUser: { app_metadata: Record<string, unknown> | null }) {
  const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: authUser },
    error: null,
  });
  createAdminClient.mockReturnValue({
    auth: { admin: { getUserById, updateUserById } },
  });
  return { updateUserById, getUserById };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Regressão comportamental SEN-04/05: guarda 403 de papel não-administrador,
 * payload da troca (senha temporária de 16 chars + force_password_change
 * true preservando role) e auditoria `redefinir_senha` sem senha.
 */
describe("POST /redefinir-senha — guard e payload (SEN-04/05)", () => {
  it("retorna 403 e não toca no banco para papel sem administrar membros", async () => {
    requireAdministrar.mockResolvedValue(
      NextResponse.json({ error: "nao_autorizado" }, { status: 403 })
    );

    const res = await POST(fazerRequest(), PARAMS);

    expect(res.status).toBe(403);
    expect(getMembro).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o membro não existe", async () => {
    requireAdministrar.mockResolvedValue({ sub: "admin-1" });
    getMembro.mockResolvedValue(null);

    const res = await POST(fazerRequest(), PARAMS);

    expect(res.status).toBe(404);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("devolve senha temporária de 16 chars, força troca e preserva role (payload)", async () => {
    requireAdministrar.mockResolvedValue({ sub: "admin-1" });
    getMembro.mockResolvedValue({
      id: "membro-1",
      auth_user_id: "auth-user-1",
    });
    const { updateUserById } = montarAdmin({
      app_metadata: { role: "MEMBRO" },
    });

    const res = await POST(fazerRequest(), PARAMS);
    const body = (await res.json()) as { senha: string };

    expect(res.status).toBe(200);
    expect(body.senha).toMatch(/^[a-zA-Z0-9]{16}$/);

    expect(updateUserById).toHaveBeenCalledTimes(1);
    const [userId, attrs] = updateUserById.mock.calls[0] as [
      string,
      { password: string; app_metadata: Record<string, unknown> },
    ];
    expect(userId).toBe("auth-user-1");
    // payload conjunção: mesma senha no corpo E no update
    expect(attrs.password).toBe(body.senha);
    expect(attrs.app_metadata.force_password_change).toBe(true);
    expect(attrs.app_metadata.role).toBe("MEMBRO");
  });

  it("audita redefinir_senha sem payload de senha", async () => {
    requireAdministrar.mockResolvedValue({ sub: "admin-1" });
    getMembro.mockResolvedValue({
      id: "membro-1",
      auth_user_id: "auth-user-1",
    });
    montarAdmin({ app_metadata: { role: "MEMBRO" } });

    const res = await POST(fazerRequest(), PARAMS);
    const body = (await res.json()) as { senha: string };

    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
    const arg = registrarAuditoria.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toEqual(
      expect.objectContaining({
        autor: "admin-1",
        acao: "redefinir_senha",
        entidade: "membros",
        entidade_id: "membro-1",
      })
    );
    expect(JSON.stringify(arg)).not.toContain(body.senha);
  });
});
