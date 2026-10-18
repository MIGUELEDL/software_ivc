/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtualizarSenhaForm } from "./atualizar-senha-form";

const { createBrowserSupabaseClient } = vi.hoisted(() => ({
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabaseClient }));

function montarSupabase(sessao: { user: { id: string } } | null) {
  createBrowserSupabaseClient.mockReturnValue({
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: sessao } }),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
  window.location.search = "";
});

afterEach(cleanup);

/**
 * Regressão comportamental SEN-03: link inválido/expirado (erro GoTrue na URL)
 * → estado de erro com ação "Pedir novo link" apontando para /alterar-senha;
 * com sessão de recovery → form nova senha.
 */
describe("AtualizarSenhaForm — link inválido e sessão (SEN-03)", () => {
  it("sem sessão mostra ação 'Pedir novo link' para /alterar-senha", async () => {
    montarSupabase(null);
    window.location.hash = "#error=access_denied&error_description=expired";

    render(<AtualizarSenhaForm serverError={null} />);

    await screen.findByRole("alert");
    const link = screen.getByRole("link", { name: /Pedir novo link/ });
    expect(link.getAttribute("href")).toBe("/alterar-senha");
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });

  it("com sessão de recovery exibe o form de nova senha", async () => {
    montarSupabase({ user: { id: "u1" } });

    render(<AtualizarSenhaForm serverError={null} />);

    await screen.findByLabelText("Nova senha");
    expect(screen.getByLabelText("Confirmar senha")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Salvar nova senha/ })
    ).toBeTruthy();
  });
});
