/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordInput } from "./PasswordInput";

afterEach(cleanup);

/**
 * Regressão comportamental SEN-06: o olho alterna apenas o `type` —
 * name/value/required permanecem intactos para o formulário submeter igual.
 */
describe("PasswordInput — olho mostrar/ocultar (SEN-06)", () => {
  it("começa oculto e alterna type preservando name/value", async () => {
    const user = userEvent.setup();
    render(
      <PasswordInput
        name="password"
        defaultValue="segredo123"
        required
        data-testid="senha"
      />
    );

    const input = screen.getByTestId("senha") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.name).toBe("password");
    expect(input.required).toBe(true);

    const mostrar = screen.getByRole("button", { name: "Mostrar senha" });
    expect(mostrar.getAttribute("aria-pressed")).toBe("false");

    await user.click(mostrar);

    expect(input.type).toBe("text");
    expect(input.value).toBe("segredo123");
    expect(input.name).toBe("password");
    const ocultar = screen.getByRole("button", { name: "Ocultar senha" });
    expect(ocultar.getAttribute("aria-pressed")).toBe("true");

    await user.click(ocultar);

    expect(input.type).toBe("password");
    expect(input.value).toBe("segredo123");
  });
});
