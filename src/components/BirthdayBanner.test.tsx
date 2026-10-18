/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { BirthdayBanner } from "./BirthdayBanner";

afterEach(cleanup);

/**
 * Regressão comportamental ANI-02/03/04: formatação "A, B e C", supressão
 * com lista vazia e dispensa pelo X (em memória).
 */
describe("BirthdayBanner (ANI-02/03/04)", () => {
  it("não renderiza nada com lista vazia", () => {
    const { container } = render(<BirthdayBanner aniversariantes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("formata um nome só sem conector", () => {
    render(<BirthdayBanner aniversariantes={["Maria"]} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Feliz aniversário, Maria!");
    expect(status.textContent).toContain(
      "Que Deus abençoe você com muita saúde"
    );
  });

  it("junta múltiplos nomes com vírgula e 'e' (ANI-02)", () => {
    render(
      <BirthdayBanner aniversariantes={["Ana", "Bia", "Caio"]} />
    );
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Feliz aniversário, Ana, Bia e Caio!");
    expect(status.textContent).toContain(
      "Que Deus abençoe vocês com muita saúde"
    );
  });

  it("dispensa a saudação pelo botão X (ANI-03)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BirthdayBanner aniversariantes={["Maria"]} />
    );

    await user.click(
      screen.getByRole("button", { name: "Fechar saudação de aniversário" })
    );

    expect(container.firstChild).toBeNull();
  });
});
