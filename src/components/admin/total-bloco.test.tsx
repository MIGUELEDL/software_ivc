/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TotalBloco } from "./total-bloco";

afterEach(cleanup);

/**
 * TAB-01/03: bloco de totalização das listagens do admin — rótulo TOTAL
 * acima, número exibido inclusive quando zero.
 */
describe("TotalBloco (TAB-01/03)", () => {
  it("exibe o rótulo TOTAL e o número de registros", () => {
    render(<TotalBloco total={42} />);

    expect(screen.getByText("TOTAL")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("TAB-03: exibe 0 quando a listagem está vazia", () => {
    render(<TotalBloco total={0} />);

    expect(screen.getByText("TOTAL")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("tom claro usa texto escuro para fundos claros (ex.: fechamento)", () => {
    const { container } = render(<TotalBloco total={5} tom="claro" />);

    const valor = screen.getByText("5");
    expect(valor.className).toContain("text-text-dark");
    expect(container.querySelector('[data-testid="total-bloco"]')).toBeTruthy();
  });
});
