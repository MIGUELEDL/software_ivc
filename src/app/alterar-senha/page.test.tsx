/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AlterarSenhaPage from "./page";

const { createBrowserSupabaseClient } = vi.hoisted(() => ({
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient }));

const resetPasswordForEmail = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  createBrowserSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      resetPasswordForEmail,
    },
  });
});

afterEach(cleanup);

/**
 * Regressão comportamental SEN-01: enviar o link entra no estado "Confira seu
 * e-mail" e chama resetPasswordForEmail com redirect para /atualizar-senha.
 */
describe("/alterar-senha — envio do link (SEN-01)", () => {
  it("mostra 'Confira seu e-mail' após envio bem-sucedido", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AlterarSenhaPage />);

    const campo = screen.getByLabelText("E-mail");
    await user.type(campo, "membro@exemplo.com");
    await user.click(
      screen.getByRole("button", { name: /Enviar link de confirmação/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Confira seu e-mail")).toBeTruthy();
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("membro@exemplo.com", {
      redirectTo: expect.stringContaining("/atualizar-senha"),
    });
    expect(screen.getByText(/Reenviar link/)).toBeTruthy();
  });

  it("fica no formulário com erro quando o envio falha", async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: { message: "Muitas tentativas. Aguarde." },
    });
    const user = userEvent.setup();
    render(<AlterarSenhaPage />);

    await user.type(screen.getByLabelText("E-mail"), "membro@exemplo.com");
    await user.click(
      screen.getByRole("button", { name: /Enviar link de confirmação/ })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Muitas tentativas. Aguarde.")
      ).toBeTruthy();
    });
    expect(screen.queryByText("Confira seu e-mail")).toBeNull();
  });
});
