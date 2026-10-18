import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ImprimirPage from "./page";

const { getMembro } = vi.hoisted(() => ({ getMembro: vi.fn() }));
vi.mock("@/lib/admin/membros", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/membros")>();
  return { ...original, getMembro };
});

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Regressão comportamental CART-05: busca vazia/inválida exercita o ramo de
 * aviso "Nenhum membro válido selecionado" (a condição precisa ser a verdade
 * booleana para membros vazios — ramo morto por off-by-one não passa aqui).
 */
describe("/admin/membros/imprimir — estado vazio (CART-05)", () => {
  it("mostra o aviso quando nenhum id resolve em membro", async () => {
    getMembro.mockRejectedValue(new Error("id invalido"));

    const jsx = await ImprimirPage({
      searchParams: Promise.resolve({ ids: "nao-existe,ou-tambem-nao" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Nenhum membro válido selecionado");
    expect(html).toContain("marque de 1 a 4 membros");
    expect(getMembro).toHaveBeenCalledWith("nao-existe");
  });

  it("mostra o aviso quando o param ids está vazio", async () => {
    const jsx = await ImprimirPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Nenhum membro válido selecionado");
    expect(getMembro).not.toHaveBeenCalled();
  });
});
