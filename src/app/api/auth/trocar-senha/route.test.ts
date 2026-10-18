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
  return new Request("http://localhost/api/auth/trocar-senha", {
    method: "POST",
    body: new URLSearchParams({ new_password: senha }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function montarSession() {
  const updateUser = vi.fn().mockResolvedValue({
    data: { user: { id: "u1", app_metadata: { role: "MEMBRO" } } },
    error: null,
  });
  const refreshSession = vi.fn().mockResolvedValue({
    data: { session: { user: { id: "u1" } } },
    error: null,
  });
  createServerClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "u1" } } },
      }),
      updateUser,
      refreshSession,
    },
  });
  return { updateUser, refreshSession };
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
 * AUTH-22/23/24: a rota limpa force_password_change, atualiza a sessão no
 * cookie (refresh) para o proxy não devolver o usuário ao form e redireciona
 * para /trocar-senha?success=1 — a página decide o destino por papel.
 */
describe("POST /api/auth/trocar-senha (AUTH-22..24)", () => {
  it("AUTH-23: rejeita senha fraca antes de qualquer sessão", async () => {
    const res = await POST(fazerRequest("curta"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/trocar-senha?error=weak_password"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("AUTH-23: rejeita senha sem número antes de qualquer sessão", async () => {
    const res = await POST(fazerRequest("SomenteLetras"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/trocar-senha?error=weak_password"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("AUTH-24: auth_required quando não há sessão", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        updateUser: vi.fn(),
        refreshSession: vi.fn(),
      },
    });

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/trocar-senha?error=auth_required"
    );
  });

  it("AUTH-24: auth_required quando updateUser falha", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "u1" } } },
        }),
        updateUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("update failed"),
        }),
        refreshSession: vi.fn(),
      },
    });

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/trocar-senha?error=auth_required"
    );
  });

  it("AUTH-22: sucesso limpa a flag, atualiza a sessão e redireciona para ?success=1", async () => {
    const { updateUser, refreshSession } = montarSession();
    const updateUserById = montarServiceRole();

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/trocar-senha?success=1");
    // Discrimina o comportamento antigo: destino NÃO é /painel nem /admin
    // direto — a página decide após a caixa de sucesso.
    expect(location).not.toContain("/painel");
    expect(location).not.toMatch(/\/admin$/);

    expect(updateUser).toHaveBeenCalledWith({ password: SENHA_FORTE });
    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: { role: "MEMBRO", force_password_change: false },
    });
    // A sessão só é atualizada DEPOIS da limpeza da flag no banco — refresh
    // antes disso relerria a flag antiga e o proxy devolveria ao form.
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession.mock.invocationCallOrder[0]).toBeGreaterThan(
      updateUserById.mock.invocationCallOrder[0]
    );
  });

  it("retorna 500 quando a limpeza da flag falha", async () => {
    montarSession();
    createClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: {},
            error: new Error("admin update failed"),
          }),
        },
      },
    });

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(500);
  });

  it("retorna 500 quando a service role key não está configurada", async () => {
    montarSession();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await POST(fazerRequest(SENHA_FORTE));

    expect(res.status).toBe(500);
  });
});
