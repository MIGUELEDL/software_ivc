import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { createServerClient, createClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const SENHA_FORTE = "NovaSenha123";

function fazerRequest(senha: string): Request {
  return new Request("http://localhost/api/auth/atualizar-senha", {
    method: "POST",
    body: new URLSearchParams({ new_password: senha }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function montarSession(appMetadata: Record<string, unknown> | null) {
  const updateUser = vi.fn().mockResolvedValue({
    data: { user: { id: "u1", app_metadata: appMetadata } },
    error: null,
  });
  createServerClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "u1" } } },
      }),
      updateUser,
    },
  });
  return updateUser;
}

function montarServiceRole() {
  const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });
  createClient.mockReturnValue({
    auth: { admin: { updateUserById } },
  });
  return updateUserById;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
});

/**
 * Regressão comportamental SEN-02: política AUTH-11, sessão obrigatória,
 * limpeza de force_password_change (service role) e redirect final.
 */
describe("POST /api/auth/atualizar-senha (SEN-02)", () => {
  it("rejeita senha fraca antes de qualquer sessão", async () => {
    const res = await POST(fazerRequest("curta"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/atualizar-senha?error=weak_password"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redireciona auth_required quando não há sessão de recuperação", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        updateUser: vi.fn(),
      },
    });

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/atualizar-senha?error=auth_required"
    );
  });

  it("troca a senha, limpa force_password_change e redireciona ao login", async () => {
    const updateUser = montarSession({
      role: "MEMBRO",
      force_password_change: true,
    });
    const updateUserById = montarServiceRole();

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?ok=password");
    expect(updateUser).toHaveBeenCalledWith({ password: SENHA_FORTE });
    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: {
        role: "MEMBRO",
        force_password_change: false,
      },
    });
  });

  it("não mexe no service role quando a flag não está presente", async () => {
    const updateUser = montarSession({ role: "MEMBRO" });
    const updateUserById = montarServiceRole();

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?ok=password");
    expect(updateUser).toHaveBeenCalledWith({ password: SENHA_FORTE });
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
