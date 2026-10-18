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

/**
 * Regressão do glitch do 4º cartão na pré-visualização: o CSS de impressão
 * não pode usar position:fixed (mídia paginada faz o Chrome omitir/repintar
 * o último par no preview do Ctrl+P); o layout é fluxo estático centrado.
 */
describe("/admin/membros/imprimir — CSS de impressão sem position:fixed", () => {
  it("coluna de pares em fluxo estático (padding-top 12mm, sem fixed)", async () => {
    getMembro.mockResolvedValue({
      id: "m1",
      matricula: "IVC-0001",
      nome: "Membro Teste",
      nascimento: "1990-01-01",
      whatsapp: "",
      rg: null,
      cpf: null,
      data_batismo: null,
      criado_em: "2026-01-01T00:00:00Z",
      foto_url: null,
    });

    const jsx = await ImprimirPage({
      searchParams: Promise.resolve({ ids: "m1" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("#cartao-print");
    expect(html).not.toContain("position: fixed");
    expect(html).toContain("padding: 12mm 0 0");
    // space-y-8 (margin-top 2rem) é zerado no print — só o gap de 8mm conta.
    expect(html).toContain("margin-top: 0 !important");
  });
});
