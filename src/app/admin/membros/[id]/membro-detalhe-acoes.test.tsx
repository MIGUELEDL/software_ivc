/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RedefinirSenhaButton } from "./membro-detalhe-acoes";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const SENHA_TEMP = "aB3dEfGhIjKlMn90";

/** O setup() do user-event sempre anexa o próprio stub de clipboard — por isso
 * o spy é (re)instalado DEPOIS do setup, não no beforeEach. */
function instalarClipboardSpy() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
  instalarClipboardSpy();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ senha: SENHA_TEMP }),
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Regressão comportamental SEN-04: o modal exibe a senha UMA vez com botão
 * copiar funcional (clipboard recebe a senha) e dispensa ao fechar.
 */
describe("RedefinirSenhaButton — modal de senha única (SEN-04)", () => {
  it("abre o modal com a senha, copia para o clipboard e dispensa", async () => {
    // writeToClipboard: false + spy reinstalado após o setup (ver helper).
    const user = userEvent.setup({ writeToClipboard: false });
    const writeText = instalarClipboardSpy();
    render(<RedefinirSenhaButton membroId="membro-1" />);

    await user.click(screen.getByRole("button", { name: /Redefinir senha/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(SENHA_TEMP);
    expect(refresh).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: /Copiar senha/ })
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SENHA_TEMP);
    });
    expect(screen.getByText("Copiada!")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("não chama a rota quando o confirm é cancelado", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<RedefinirSenhaButton membroId="membro-1" />);

    await user.click(screen.getByRole("button", { name: /Redefinir senha/ }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
