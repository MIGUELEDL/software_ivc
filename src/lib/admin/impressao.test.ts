import { describe, expect, it } from "vitest";

import { parseIdsImpressao, MAXIMO_CARTOES_POR_FOLHA } from "./impressao";

/**
 * Regressão comportamental CART-03 (tier de unidade): o query `ids` é
 * normalizado e cortado no máximo de pares por folha — 6 ids → 4 (prova E2E
 * em localhost); entradas vazias/espaços são descartadas.
 */
describe("parseIdsImpressao — corte de pares por folha (CART-03)", () => {
  it("corta em MAXIMO_CARTOES_POR_FOLHA quando há ids demais", () => {
    const seis = "a,b,c,d,e,f";
    const resultado = parseIdsImpressao(seis);
    expect(resultado).toEqual(["a", "b", "c", "d"]);
    expect(resultado).toHaveLength(MAXIMO_CARTOES_POR_FOLHA);
  });

  it("mantém até 4 ids sem cortar", () => {
    expect(parseIdsImpressao("a,b,c,d")).toEqual(["a", "b", "c", "d"]);
  });

  it("remove espaços e entradas vazias", () => {
    expect(parseIdsImpressao(" a , ,b,,  c  ")).toEqual(["a", "b", "c"]);
  });

  it("devolve lista vazia para string vazia", () => {
    expect(parseIdsImpressao("")).toEqual([]);
    expect(parseIdsImpressao(",,,")).toEqual([]);
  });
});
