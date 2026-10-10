import { describe, expect, it } from "vitest";

import { aniversario, calcularValidadeCartao, civilDe, dataCivil } from "./validade";

/**
 * Migração by-value das asserções `V` do tier `--domain` de
 * `scripts/probe-cartao-validade.sh` (CART-04/09/10/11/12/15/16, AD-020,
 * AD-025). Todo instante é construído com offset explícito (-03:00 ou Z) —
 * zero `new Date()` lendo o relógio.
 */

// Instantes com deslocamento explícito de -03:00 (fuso civil da igreja).
const d = (y: number, m: number, dia: number): Date =>
  new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`
  );
const HOJE = d(2026, 10, 1); // 2026-10-01 no calendário civil

describe("aniversario — clamp de 29/02 (CART-12/CART-10)", () => {
  it("29/02 + 1 ano vira 28/02", () => {
    expect(aniversario("2024-02-29", 1)).toBe("2025-02-28");
  });

  it("29/02 + 4 anos volta a 29/02 (bissexto)", () => {
    expect(aniversario("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("29/02 + 2 anos vira 28/02", () => {
    expect(aniversario("2024-02-29", 2)).toBe("2026-02-28");
  });

  it("28/02 + 1 ano continua 28/02", () => {
    expect(aniversario("2023-02-28", 1)).toBe("2024-02-28");
  });
});

describe("civilDe — fronteira do dia civil no fuso da igreja (CART-11/AD-020)", () => {
  const FRONTEIRA = new Date("2026-10-02T00:30:00Z");
  const DIA_IGREJA = "2026-10-01";

  it("00:30Z de 02/10 ainda é 01/10 no fuso da igreja (−03:00)", () => {
    expect(civilDe(FRONTEIRA)).toBe(DIA_IGREJA);
  });

  it("witness: o dia UTC deste instante difere do dia da igreja", () => {
    expect(FRONTEIRA.toISOString().slice(0, 10)).not.toBe(DIA_IGREJA);
  });

  it("no meio do dia da igreja, o dia civil concorda com UTC", () => {
    expect(civilDe(new Date("2026-10-01T12:00:00Z"))).toBe("2026-10-01");
  });
});

describe("calcularValidadeCartao — fronteira civil (CART-11)", () => {
  it("usa o dia civil da igreja para o hoje do servidor", () => {
    expect(calcularValidadeCartao("2026-09-13", new Date("2026-10-02T00:30:00Z"))).toBe(
      "2027-09-13"
    );
  });

  it("aniversário de 30 anos na fronteira mantém o ciclo corrente", () => {
    expect(calcularValidadeCartao("1996-10-01", new Date("2026-10-02T00:30:00Z"))).toBe(
      "2026-10-01"
    );
  });

  it("controle: um dia antes da fronteira não muda de ano", () => {
    expect(calcularValidadeCartao("1996-09-30", new Date("2026-10-02T00:30:00Z"))).toBe(
      "2027-09-30"
    );
  });
});

describe("calcularValidadeCartao — rolagem com limite inclusivo (CART-09/10)", () => {
  it("mesmo ano -> +1 ano", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2026, 10, 1))).toBe("2027-09-13");
  });

  it("1 dia antes do aniversário -> ainda +1", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2027, 9, 13))).toBe("2027-09-13");
  });

  it("1 dia depois -> +2 (renovou)", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2027, 9, 14))).toBe("2028-09-13");
  });

  it("limite inclusivo no próprio dia", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2027, 9, 13))).toBe("2027-09-13");
  });

  it("ciclo ainda corrente em 2031 -> 2031-09-13", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2031, 1, 1))).toBe("2031-09-13");
  });

  it("5 anos depois -> +6 (renovou)", () => {
    expect(calcularValidadeCartao("2026-09-13", d(2031, 9, 14))).toBe("2032-09-13");
  });

  it("registro hoje -> +1 ano", () => {
    expect(calcularValidadeCartao("2026-01-01", d(2026, 1, 1))).toBe("2027-01-01");
  });

  it("criado_em futuro conta a partir dele", () => {
    expect(calcularValidadeCartao("2030-06-15", d(2026, 10, 1))).toBe("2031-06-15");
  });

  it("29/02/2024 com hoje 01/03/2025 -> 28/02/2026", () => {
    expect(calcularValidadeCartao("2024-02-29", d(2025, 3, 1))).toBe("2026-02-28");
  });
});

describe("criado_em como timestamptz ISO (CART-11)", () => {
  it("aceita ISO com Z", () => {
    expect(calcularValidadeCartao("2026-09-13T14:22:31.123Z", HOJE)).toBe("2027-09-13");
  });

  it("aceita ISO com offset -03:00", () => {
    expect(calcularValidadeCartao("2026-09-13T00:30:00-03:00", HOJE)).toBe("2027-09-13");
  });

  it("aceita ISO 23:30 -03:00", () => {
    expect(calcularValidadeCartao("2026-09-13T23:30:00-03:00", HOJE)).toBe("2027-09-13");
  });

  it("cálculo fixo no calendário civil (TZ do processo não interfere)", () => {
    expect(
      calcularValidadeCartao("2026-09-13T23:30:00-03:00", new Date("2027-09-14T00:30:00-03:00"))
    ).toBe("2028-09-13");
  });
});

describe("dataCivil — dia civil do timestamptz no fuso da igreja", () => {
  it("00:30 -03:00 é o mesmo dia", () => {
    expect(dataCivil("2026-09-13T00:30:00-03:00")).toBe("2026-09-13");
  });

  it("23:30 -03:00 não vira dia 14", () => {
    expect(dataCivil("2026-09-13T23:30:00-03:00")).toBe("2026-09-13");
  });

  it("00:30Z é dia anterior no Brasil", () => {
    expect(dataCivil("2026-09-14T00:30:00Z")).toBe("2026-09-13");
  });

  it("lixo -> null", () => {
    expect(dataCivil("lixo")).toBeNull();
  });

  it("null -> null", () => {
    expect(dataCivil(null)).toBeNull();
  });
});

describe("ano de 5 dígitos (CART-16/AD-025)", () => {
  it("aniversario produz ano de 5 dígitos", () => {
    expect(aniversario("9999-12-31", 1)).toBe("10000-12-31");
  });

  it("calcularValidadeCartao concorda com o ciclo-base do trigger", () => {
    expect(calcularValidadeCartao("9999-12-31T23:59:59+00:00", HOJE)).toBe("10000-12-31");
  });

  it("entrada já civil de 5 dígitos segue com saída de 5 dígitos", () => {
    expect(calcularValidadeCartao("10000-12-31", HOJE)).toBe("10001-12-31");
  });

  it("ano de 4 dígitos segue igual (controle de não-regressão)", () => {
    expect(calcularValidadeCartao("9999-01-01T00:00:00+00:00", HOJE)).toBe("9999-12-31");
  });
});

describe("janela baixa de anos (AD-025)", () => {
  it("criado_em de 226 anos atrás acha o aniversário corrente", () => {
    expect(calcularValidadeCartao("1800-06-01", HOJE)).toBe("2027-06-01");
  });

  it("criado_em de 326 anos atrás também", () => {
    expect(calcularValidadeCartao("1700-01-01", HOJE)).toBe("2027-01-01");
  });

  it("criado_em no mesmo ano, aniversário ainda depois de hoje", () => {
    expect(calcularValidadeCartao("2020-12-31", HOJE)).toBe("2026-12-31");
  });
});

describe("teto do Date — contrato YYYY-MM-DD | null (sem NaN)", () => {
  it("ano no teto do Date devolve null, nunca data com NaN", () => {
    expect(calcularValidadeCartao("275760-09-12", HOJE)).toBeNull();
  });

  it("aniversario no teto devolve null", () => {
    expect(aniversario("275760-09-12", 1)).toBeNull();
  });

  it("mês representável, ano-alvo não: null em vez de dado inválido", () => {
    expect(aniversario("275760-01-01", 1)).toBeNull();
  });

  it("ano de 5 dígitos continua sendo derivado, não cortado", () => {
    expect(aniversario("9999-12-31", 1)).toBe("10000-12-31");
  });

  it("o Date representa o ano 275760 só até agosto (meses 1..8)", () => {
    const mesesRepresentaveis: number[] = [];
    for (let mes = 1; mes <= 12; mes += 1) {
      const ultimoDia = new Date(275760, mes, 0);
      if (!Number.isNaN(ultimoDia.getDate())) {
        mesesRepresentaveis.push(mes);
      }
    }
    expect(mesesRepresentaveis).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each([1, 8])("somar 1 ano até o mês %i do ano-teto ainda é representável", (mes) => {
    const civil = `275759-${String(mes).padStart(2, "0")}-15`;
    expect(aniversario(civil, 1)).toBe(`275760-${String(mes).padStart(2, "0")}-15`);
  });

  it.each([9, 12])("somar 1 ano até o mês %i do ano-teto devolve null", (mes) => {
    const civil = `275759-${String(mes).padStart(2, "0")}-15`;
    expect(aniversario(civil, 1)).toBeNull();
  });
});

describe("datas inexistentes — mês/dia 00 (CART-04)", () => {
  it.each(["2026-00-15", "2026-13-01", "2026-01-00", "2026-01-32"])(
    "aniversario(%s, 1) -> null",
    (invalido) => {
      expect(aniversario(invalido, 1)).toBeNull();
    }
  );
});

describe("calcularValidadeCartao — entrada inválida ou ausente (CART-15)", () => {
  it("null -> null", () => {
    expect(calcularValidadeCartao(null, HOJE)).toBeNull();
  });

  it("undefined -> null", () => {
    expect(calcularValidadeCartao(undefined, HOJE)).toBeNull();
  });

  it("vazio -> null", () => {
    expect(calcularValidadeCartao("", HOJE)).toBeNull();
  });

  it("formato inválido -> null", () => {
    expect(calcularValidadeCartao("13/09/2026", HOJE)).toBeNull();
  });

  it("mês inválido -> null", () => {
    expect(calcularValidadeCartao("2026-13-01", HOJE)).toBeNull();
  });

  it("aniversario inválido -> null", () => {
    expect(aniversario("nao-data", 1)).toBeNull();
  });
});