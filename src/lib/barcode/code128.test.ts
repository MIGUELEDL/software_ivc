import { describe, expect, it } from "vitest";

import { CODE128_TABLE, code128, code128Runs } from "./code128";
import { camposCartao } from "../painel/cartao";

/**
 * Migração by-value do bloco runtime de `scripts/probe-barcode.sh` (BRC-02,
 * BRC-03, BRC-05) para Vitest. Cada asserção do probe tem aqui o mesmo valor
 * esperado — sem reescrita que perca discriminação.
 */

// Sequência exata de módulos para "IVC-0001" (checksum 10), transcrita do probe.
const IVC_0001 =
  "11010010000" + // START B (104)
  "11000100010" +
  "11101011000" +
  "10001000110" +
  "10011011100" + // IVC-
  "10011101100" +
  "10011101100" +
  "10011101100" +
  "10011100110" + // 0001
  "11001000100" + // checksum 10
  "11000111010" +
  "11"; // STOP + terminação

describe("CODE128_TABLE — invariantes estruturais (BRC-03)", () => {
  it("os 107 símbolos têm 11 módulos binários cada", () => {
    for (let v = 0; v <= 106; v += 1) {
      expect(CODE128_TABLE[v]).toMatch(/^[01]{11}$/);
    }
  });

  it("cada símbolo tem número par de barras (ones)", () => {
    for (let v = 0; v <= 106; v += 1) {
      const ones = (CODE128_TABLE[v].match(/1/g) || []).length;
      expect(ones % 2).toBe(0);
    }
  });

  it("cada símbolo tem (11 - ones) ímpar (paridade barra/espaço)", () => {
    for (let v = 0; v <= 106; v += 1) {
      const ones = (CODE128_TABLE[v].match(/1/g) || []).length;
      expect((11 - ones) % 2).toBe(1);
    }
  });

  it("nenhum run de barra ou espaço passa de 4 módulos", () => {
    for (let v = 0; v <= 106; v += 1) {
      const runs = CODE128_TABLE[v].match(/1+|0+/g) || [];
      expect(runs.every((r) => r.length <= 4)).toBe(true);
    }
  });
});

describe("CODE128_TABLE — ancoragens da fonte (BRC-02)", () => {
  const anchors: [number, string][] = [
    [103, "11010000100"],
    [104, "11010010000"],
    [105, "11010011100"],
    [106, "11000111010"],
    [40, "11000101000"],
    [41, "11000100010"],
    [54, "11101011000"],
    [35, "10001000110"],
    [13, "10011011100"],
    [16, "10011101100"],
    [17, "10011100110"],
    [24, "11101001100"],
    [25, "11100101100"],
    [34, "10001011000"],
    [56, "11100010110"],
    [67, "10000101100"],
    [78, "11000010100"],
    [87, "11110010100"],
  ];

  it.each(anchors)("valor %i tem o padrão da fonte", (v, exp) => {
    expect(CODE128_TABLE[v]).toBe(exp);
  });
});

describe("code128 — sequência, determinismo e distinção (BRC-02/05)", () => {
  it("codifica IVC-0001 na sequência exata com checksum 10", () => {
    expect(code128("IVC-0001")).toBe(IVC_0001);
  });

  it("é determinístico para a mesma matrícula", () => {
    expect(code128("IVC-0001")).toBe(code128("IVC-0001"));
  });

  it("distingue matrículas diferentes", () => {
    expect(code128("IVC-0001")).not.toBe(code128("IVC-0002"));
  });
});

describe("code128Runs — quiet zone, total e orientação (BRC-03/05)", () => {
  // `code128Runs` é chamado DENTRO de cada `it` (não na coleta do describe):
  // um mutante que quebre a conversão crasharia a coleta do arquivo inteiro e
  // o runner o reportaria como "sobrevivente" com 0 testes — a chamada viva em
  // cada teste torna o crash um teste falhando.
  it("começa e termina com quiet zone (espaço)", () => {
    const runs = code128Runs(IVC_0001, 8);
    expect(runs[0].bar).toBe(false);
    expect(runs[runs.length - 1].bar).toBe(false);
  });

  it("preserva o total de módulos (sequência + 2 quiet zones de 8)", () => {
    const runs = code128Runs(IVC_0001, 8);
    const total = runs.reduce((s, r) => s + r.modules, 0);
    expect(total).toBe(IVC_0001.length + 16);
  });

  it("reconstrói a sequência original a partir dos runs (orientação preservada)", () => {
    const runs = code128Runs(IVC_0001, 8);
    let rebuilt = "";
    for (let i = 1; i < runs.length - 1; i += 1) {
      rebuilt += (runs[i].bar ? "1" : "0").repeat(runs[i].modules);
    }
    expect(rebuilt).toBe(IVC_0001);
  });

  it("o primeiro segmento após a quiet zone é barra", () => {
    const runs = code128Runs(IVC_0001, 8);
    expect(runs[1].bar).toBe(true);
  });

  it("RLE: agrupa runs consecutivos da mesma cor (IVC-0001 abre com barra dupla)", () => {
    const runs = code128Runs(IVC_0001, 8);
    expect(runs[1].modules).toBe(2);
    expect(runs.some((r) => r.modules > 1)).toBe(true);
  });
});

describe("mapper do cartão alimenta o barcode (BRC-01)", () => {
  it("camposCartao projeta a matrícula e o barcode a codifica", () => {
    const campos = camposCartao(
      {
        matricula: "IVC-0001",
        nome: "Maria",
        nascimento: "1990-01-01",
        whatsapp: "83",
        rg: null,
        cpf: null,
        data_batismo: null,
        criado_em: "2026-01-01T12:00:00Z",
        foto_url: null,
      },
      new Date("2026-06-01T12:00:00-03:00")
    );

    expect(campos.id).toBe("IVC-0001");
    expect(code128(campos.id)).toBe(IVC_0001);
  });
});

describe("code128 — intervalo ASCII 32-126", () => {
  it("lança RangeError para byte fora do intervalo", () => {
    expect(() => code128("IVC-\u00e7")).toThrow(RangeError);
  });

  it("mensagem do RangeError aponta a posição do caractere", () => {
    expect(() => code128("IVC-\u00e7")).toThrow(/na posição 4/);
  });

  it("aceita EXATAMENTE os limites 32 (espaço) e 126 (~)", () => {
    expect(() => code128("A B")).not.toThrow();
    expect(() => code128("~")).not.toThrow();
  });

  it("rejeita logo abaixo de 32 (controle) e acima de 126 (DEL)", () => {
    expect(() => code128("IVC-\u001f")).toThrow(RangeError);
    expect(() => code128("IVC-\u007f")).toThrow(RangeError);
  });
});
