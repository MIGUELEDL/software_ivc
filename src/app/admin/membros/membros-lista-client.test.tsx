/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MembrosListaClient } from "./membros-lista-client";

afterEach(cleanup);

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const MEMBROS = ["m1", "m2", "m3", "m4", "m5", "m6"].map((id) => ({
  id,
  nome: `Membro ${id}`,
  matricula: `IVC-000${id.slice(1)}`,
  status: "ATIVO",
}));

function textoBarra(container: HTMLElement): string {
  return container.textContent ?? "";
}

beforeEach(() => {
  push.mockClear();
});

/**
 * TAB-06: a faixa TOTAL fica embutida no cabeçalho do card da tabela
 * (padrão usuários), não como bloco flutuante acima.
 */
describe("MembrosListaClient — faixa TOTAL no card (TAB-06)", () => {
  it("renderiza TotalBloco com o total passado como prop", () => {
    const { container } = render(
      <MembrosListaClient membros={MEMBROS.slice(0, 3)} total={42} />
    );

    const strip = screen.getByTestId("total-bloco");
    expect(strip.textContent).toContain("42");
    // O strip é descendente do card da tabela (overflow-x-auto + tabela-scroll)
    expect(
      container.querySelector(".tabela-scroll [data-testid='total-bloco']")
    ).not.toBeNull();
  });
});

/**
 * Regressão comportamental CART-01: no máximo 4 marcações — a 5ª é bloqueada
 * com aviso; o botão de impressão leva os ids selecionados.
 */
describe("MembrosListaClient — limite de 4 cartões (CART-01)", () => {
  it("bloqueia a 5ª marcação e mantém 4 de 4 com aviso", async () => {
    const user = userEvent.setup();
    const { container } = render(<MembrosListaClient membros={MEMBROS} total={MEMBROS.length} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(6);

    for (const checkbox of checkboxes.slice(0, 4)) {
      await user.click(checkbox);
    }
    expect(textoBarra(container)).toContain("4 de 4 cartões selecionados");

    await user.click(checkboxes[4]);

    expect(textoBarra(container)).toContain("4 de 4 cartões selecionados");
    expect(textoBarra(container)).toContain("(máximo 4 por folha)");
    expect((checkboxes[4] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[3] as HTMLInputElement).checked).toBe(true);
  });

  it("desmarcar libera espaço para outra marcação", async () => {
    const user = userEvent.setup();
    const { container } = render(<MembrosListaClient membros={MEMBROS} total={MEMBROS.length} />);

    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes.slice(0, 4)) {
      await user.click(checkbox);
    }
    await user.click(checkboxes[0]);
    await user.click(checkboxes[4]);

    expect(textoBarra(container)).toContain("4 de 4 cartões selecionados");
    expect((checkboxes[4] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
  });

  it("navega para a impressão com os ids selecionados", async () => {
    const user = userEvent.setup();
    render(<MembrosListaClient membros={MEMBROS} total={MEMBROS.length} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[2]);

    await user.click(
      screen.getByRole("button", { name: /Imprimir cartões \(2\)/ })
    );

    expect(push).toHaveBeenCalledWith("/admin/membros/imprimir?ids=m1,m3");
  });
});
