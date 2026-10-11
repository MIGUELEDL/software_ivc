import { describe, expect, it } from "vitest";

import { camposCartao, fmtData } from "./cartao";

/**
 * Migração by-value das asserções `C` do tier `--domain` de
 * `scripts/probe-cartao-validade.sh` (CART-08/09/10/15 + fmtData).
 * `hoje` sempre injetado via helper `d(...)` com offset -03:00 (fuso civil
 * da igreja) — nada lê o relógio.
 */

const d = (y: number, m: number, dia: number): Date =>
  new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`
  );

// Fixture real do IVC-0001: criado_em 02:01Z = 12/09 23:01 no Brasil.
const base = {
  matricula: "IVC-0001",
  nome: "Miguel Ernandes",
  nascimento: "2004-12-28",
  whatsapp: "84999766852",
  rg: "12.345.678-9",
  cpf: "12345678909",
  data_batismo: "2020-05-10",
  criado_em: "2026-09-13T02:01:52.560567+00:00",
  foto_url: null,
};

describe("camposCartao — projeção do row (CART-08/09)", () => {
  it("lê rg/cpf do row", () => {
    const c1 = camposCartao(base, d(2026, 10, 1));
    expect(c1.rg).toBe("12.345.678-9");
    expect(c1.cpf).toBe("12345678909");
  });

  it("formata o batismo em pt-BR", () => {
    const c1 = camposCartao(base, d(2026, 10, 1));
    expect(c1.baptismDate).toBe("10/05/2020");
  });

  it("validade no dia civil da igreja: 02:01Z do IVC-0001 -> 12/09, não 13/09", () => {
    const c1 = camposCartao(base, d(2026, 10, 1));
    expect(c1.validity).toBe("12/09/2027");
  });

  it("mesmo dia civil em UTC e -03:00 dá o mesmo resultado", () => {
    const c2 = camposCartao({ ...base, criado_em: "2026-09-13T12:00:00-03:00" }, d(2026, 10, 1));
    expect(c2.validity).toBe("13/09/2027");
  });

  it("projeta id (matrícula), nome e foto", () => {
    const c1 = camposCartao(base, d(2026, 10, 1));
    expect(c1.id).toBe("IVC-0001");
    expect(c1.name).toBe("Miguel Ernandes");
    expect(c1.photo).toBeUndefined();
  });
});

describe("camposCartao — NULL em documento vira — (CART-08)", () => {
  it("rg/cpf/batismo NULL -> travessão e validade intacta", () => {
    const c2 = camposCartao({ ...base, rg: null, cpf: null, data_batismo: null }, d(2026, 10, 1));
    expect(c2.rg).toBe("—");
    expect(c2.cpf).toBe("—");
    expect(c2.baptismDate).toBe("—");
    expect(c2.validity).toBe("12/09/2027");
  });
});

describe("camposCartao — validade exibida é o ciclo corrente (CART-09/10)", () => {
  it("1 dia após a validade => renovou", () => {
    const c3 = camposCartao(base, d(2027, 9, 13));
    expect(c3.validity).toBe("12/09/2028");
  });

  it("limite inclusivo no próprio dia", () => {
    const c4 = camposCartao(base, d(2027, 9, 12));
    expect(c4.validity).toBe("12/09/2027");
  });

  it("véspera ainda é o ciclo atual", () => {
    expect(camposCartao(base, d(2027, 9, 11)).validity).toBe("12/09/2027");
  });

  it("determinismo: mesma entrada, mesmo dia => mesmo resultado", () => {
    expect(camposCartao(base, d(2026, 10, 1)).validity).toBe(
      camposCartao(base, d(2026, 10, 1)).validity
    );
  });
});

describe("camposCartao — criado_em ausente/inválido vira — (CART-15)", () => {
  // A coluna é nullable no schema: `null` e `undefined` são estados reais do
  // row, não valores que o tipo proíbe. Cada caso é um assert individual,
  // como no probe (CART-15, não CART-12).
  it("criado_em vazio -> —", () => {
    expect(camposCartao({ ...base, criado_em: "" }, d(2026, 10, 1)).validity).toBe("—");
  });

  it("criado_em inválido -> —", () => {
    expect(camposCartao({ ...base, criado_em: "lixo" }, d(2026, 10, 1)).validity).toBe("—");
  });

  it("criado_em null -> —", () => {
    expect(camposCartao({ ...base, criado_em: null }, d(2026, 10, 1)).validity).toBe("—");
  });

  it("criado_em undefined -> —", () => {
    expect(camposCartao({ ...base, criado_em: undefined }, d(2026, 10, 1)).validity).toBe("—");
  });

  it("criado_em ausente não derruba os outros campos", () => {
    const c8 = camposCartao({ ...base, criado_em: undefined }, d(2026, 10, 1));
    expect(c8.name).toBe(base.nome);
  });
});

describe("fmtData — formato pt-BR e inválidos (CART-08)", () => {
  it("formata em pt-BR", () => {
    expect(fmtData("2026-09-13")).toBe("13/09/2026");
  });

  it("null -> —", () => {
    expect(fmtData(null)).toBe("—");
  });

  it("formato errado -> —", () => {
    expect(fmtData("13/09/2026")).toBe("—");
  });

  it("espaço na frente -> — (a âncora ^ exige a data no início)", () => {
    expect(fmtData(" 2026-09-13")).toBe("—");
  });

  it("data inexistente 02-30 -> —", () => {
    expect(fmtData("2026-02-30")).toBe("—");
  });

  it("ano 0 -> — (Date.UTC(0) é 1900)", () => {
    expect(fmtData("0000-01-01")).toBe("—");
  });

  it("sem zero à esquerda -> —", () => {
    expect(fmtData("2026-1-1")).toBe("—");
  });

  it("ano de 3 dígitos -> —", () => {
    expect(fmtData("999-12-31")).toBe("—");
  });

  it("ano de 4 dígitos com zero à esquerda cai no round-trip -> —", () => {
    expect(fmtData("0099-12-31")).toBe("—");
  });

  it("dia a mais -> —", () => {
    expect(fmtData("2026-12-311")).toBe("—");
  });

  it("sufixo numérico extra -> — (a âncora $ exige a data inteira)", () => {
    // "2026-12-311" não distingue: o dia 311 estoura o round-trip. Já
    // "2026-01-01-09" faz o split gerar 4 partes; sem a âncora $ o mutante lê
    // [2026,1,1] (4ª ignorada) e formata a data em vez de recusar.
    expect(fmtData("2026-01-01-09")).toBe("—");
  });
});

describe("fmtData — round-trip de 4 a 6 dígitos (AD-025)", () => {
  it("ano de 5 dígitos faz round-trip", () => {
    expect(fmtData("10000-12-31")).toBe("31/12/10000");
  });

  it("mostra o ano de 5 dígitos que a coluna derivada tem", () => {
    expect(fmtData("10000-12-31")).toBe("31/12/10000");
  });

  it("acima do teto do Date continua recusando", () => {
    expect(fmtData("275760-09-14")).toBe("—");
  });

  it("aceita o ano de 6 dígitos", () => {
    expect(fmtData("100000-12-31")).toBe("31/12/100000");
  });

  it("recusa o ano de 7 dígitos, acima do FORMATO_DATA", () => {
    expect(fmtData("1000000-12-31")).toBe("—");
  });
});