import { describe, expect, it } from "vitest";

import {
  colunasCriarMembro,
  colunasDocumento,
  colunasEditarMembro,
  colunasPerfil,
  comporDadosDocumento,
  dadosDocumento,
  lerDocumentoForm,
  normalizarCpf,
  normalizarDataBatismo,
  normalizarRg,
  type Resultado,
} from "./documento";

/** Side-reading de `r.valor` como o probe faz em JS — aqui com narrowing de tipo e com o `ok` também asseverado. */
function valorDe<T>(r: Resultado<T>): T {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error("esperava ok");
  return r.valor;
}

/**
 * Migração by-value das asserções `D` do tier `--domain` de
 * `scripts/probe-cartao-validade.sh` (CART-01..07 + builders). Nenhum valor
 * esperado é derivado do código sob teste — tudo é literal final (cpf
 * `12345678909`, rg com máscara `12.345.678-9`).
 */

const d = (y: number, m: number, dia: number): Date =>
  new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`
  );
const HOJE = d(2026, 10, 1); // 2026-10-01 no calendário civil

describe("normalizarCpf (CART-05)", () => {
  it("CPF cru: 11 dígitos preservados", () => {
    expect(valorDe(normalizarCpf("12345678909"))).toBe("12345678909");
  });

  it("CPF com espaço em volta é aceito", () => {
    expect(valorDe(normalizarCpf("  12345678909 "))).toBe("12345678909");
  });

  it("CPF com máscara perde a máscara", () => {
    expect(valorDe(normalizarCpf("123.456.789-09"))).toBe("12345678909");
  });

  it("CPF vazio é válido", () => {
    expect(normalizarCpf("").ok).toBe(true);
  });

  it("CPF só espaços resolve para vazio", () => {
    expect(valorDe(normalizarCpf("   "))).toBe("");
  });

  it("CPF de 10 dígitos rejeitado", () => {
    expect(normalizarCpf("1234567890").ok).toBe(false);
  });

  it("CPF de 12 dígitos rejeitado", () => {
    expect(normalizarCpf("123456789099").ok).toBe(false);
  });

  it("CPF só letras rejeitado", () => {
    expect(normalizarCpf("abcdefghijk").ok).toBe(false);
  });

  it("CPF 11 com letra rejeitado", () => {
    expect(normalizarCpf("1234567890a").ok).toBe(false);
  });

  // Controle no FIM: LF, CR e TAB são whitespace, então um `trim()` antes da
  // checagem os apagaria e o CPF entraria limpo (medido na R7 do Verifier).
  it("CPF com newline no meio rejeitado", () => {
    expect(normalizarCpf("123\n45678909").ok).toBe(false);
  });

  it("CPF 11 dígitos + \\n no fim rejeitado", () => {
    expect(normalizarCpf("12345678909\n").ok).toBe(false);
  });

  it("CPF 11 dígitos + \\r no fim rejeitado", () => {
    expect(normalizarCpf("12345678909\r").ok).toBe(false);
  });

  it("CPF 11 dígitos + \\t no fim rejeitado", () => {
    expect(normalizarCpf("12345678909\t").ok).toBe(false);
  });

  it("CPF 11 dígitos + NUL rejeitado", () => {
    expect(normalizarCpf("12345678909\u0000").ok).toBe(false);
  });
});

describe("normalizarRg (CART-07)", () => {
  it("RG com máscara preservada", () => {
    expect(valorDe(normalizarRg(" 12.345.678-9 "))).toBe("12.345.678-9");
  });

  it("RG vazio", () => {
    expect(valorDe(normalizarRg(""))).toBe("");
  });

  it("RG de 20 chars aceito", () => {
    expect(normalizarRg("x".repeat(20)).ok).toBe(true);
  });

  it("RG de 21 chars rejeitado", () => {
    expect(normalizarRg("x".repeat(21)).ok).toBe(false);
  });

  it("RG com newline no meio rejeitado", () => {
    expect(normalizarRg("123\n456").ok).toBe(false);
  });

  it("RG com tab no meio rejeitado", () => {
    expect(normalizarRg("123\t456").ok).toBe(false);
  });

  // LF e TAB no fim somem num `trim()`: o limite de 20 era conferido sobre um
  // valor de 20 que o cliente não enviou.
  it("RG 20 chars + \\n no fim rejeitado", () => {
    expect(normalizarRg("x".repeat(20) + "\n").ok).toBe(false);
  });

  it("RG 20 chars + \\t no fim rejeitado", () => {
    expect(normalizarRg("x".repeat(20) + "\t").ok).toBe(false);
  });
});

describe("normalizarDataBatismo (CART-06)", () => {
  it("batismo passado aceito", () => {
    expect(valorDe(normalizarDataBatismo("2020-05-10", HOJE))).toBe("2020-05-10");
  });

  it("batismo vazio", () => {
    expect(valorDe(normalizarDataBatismo("", HOJE))).toBe("");
  });

  it("batismo hoje aceito", () => {
    expect(normalizarDataBatismo("2026-10-01", HOJE).ok).toBe(true);
  });

  it("batismo futuro rejeitado", () => {
    expect(normalizarDataBatismo("2026-10-02", HOJE).ok).toBe(false);
  });

  it("overflow 02-30 rejeitado", () => {
    expect(normalizarDataBatismo("2026-02-30", HOJE).ok).toBe(false);
  });

  it("mês 13 rejeitado", () => {
    expect(normalizarDataBatismo("2026-13-01", HOJE).ok).toBe(false);
  });

  // O round-trip de ANO é comparação de ano, mês e dia; o ano ZERO é a única
  // peça que só o ano testemunha: `Date.UTC(0, …)` devolve 1900 (o
  // deslocamento clássico; `getUTCFullYear()` discorda de 0).
  it("ano 0 rejeitado (Date.UTC(0) é 1900)", () => {
    expect(normalizarDataBatismo("0000-01-01", HOJE).ok).toBe(false);
  });

  it("ano 0099 cai na janela do deslocamento do Date", () => {
    expect(normalizarDataBatismo("0099-06-15", HOJE).ok).toBe(false);
  });

  // AD-025: a data de batismo é digitada e tem 4 dígitos; a coluna
  // `validade_cartao` é derivada e precisa de 4 a 6 (o par com
  // `fmtData("10000-12-31")` no cartao.test.ts é o contrato).
  it("batismo com 5 dígitos: formato de entrada é YYYY-MM-DD", () => {
    expect(normalizarDataBatismo("10000-12-31", HOJE).ok).toBe(false);
  });

  it("batismo + \\n no fim rejeitado", () => {
    expect(normalizarDataBatismo("2020-05-10\n", HOJE).ok).toBe(false);
  });

  it("batismo + \\r\\n no fim rejeitado", () => {
    expect(normalizarDataBatismo("2020-05-10\r\n", HOJE).ok).toBe(false);
  });

  it("formato DD/MM/YYYY rejeitado", () => {
    expect(normalizarDataBatismo("10/05/2020", HOJE).ok).toBe(false);
  });

  it("sem zero à esquerda rejeitado", () => {
    expect(normalizarDataBatismo("2020-5-1", HOJE).ok).toBe(false);
  });
});

describe("dadosDocumento — agregado (CART-04)", () => {
  it("vazio resolve para 3 NULLs sem erros", () => {
    const agg = dadosDocumento({ rg: "", cpf: "  ", dataBatismo: "" }, HOJE);
    expect(agg.campos).toEqual({});
    expect(agg.dados.rg).toBeNull();
    expect(agg.dados.cpf).toBeNull();
    expect(agg.dados.data_batismo).toBeNull();
  });

  it("válido normaliza o trio", () => {
    const agg2 = dadosDocumento(
      { rg: "12.345.678-9", cpf: "123.456.789-09", dataBatismo: "2020-05-10" },
      HOJE
    );
    expect(agg2.campos).toEqual({});
    expect(agg2.dados).toEqual({
      rg: "12.345.678-9",
      cpf: "12345678909",
      data_batismo: "2020-05-10",
    });
  });

  it("inválido reporta os 3 campos de erro", () => {
    const agg3 = dadosDocumento(
      { rg: "x".repeat(21), cpf: "123", dataBatismo: "2030-01-01" },
      HOJE
    );
    expect(Object.keys(agg3.campos).sort()).toEqual(["cpf", "data_batismo", "rg"]);
  });
});

// Fixtures literais do probe (valores finais, não derivados do código).
const TRIO_DIGITADO = { rg: "12.345.678-9", cpf: "529.982.247-25", data_batismo: "1990-05-04" };
const TRIO_NORMALIZADO = { rg: "12.345.678-9", cpf: "52998224725", data_batismo: "1990-05-04" };

function formDoTrio(extra?: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set("nome", "Maria de Teste");
  fd.set("nascimento", "1990-05-04");
  fd.set("whatsapp", "(83) 99999-0000");
  fd.set("rg", TRIO_DIGITADO.rg);
  fd.set("cpf", TRIO_DIGITADO.cpf);
  fd.set("data_batismo", TRIO_DIGITADO.data_batismo);
  for (const [k, v] of Object.entries(extra || {})) fd.set(k, v);
  return fd;
}

const BASE_CADASTRO = {
  nome: "Maria de Teste",
  nascimento: "1990-05-04",
  whatsapp: "(83) 99999-0000",
  status: "ATIVO",
  matricula: "M-2026-0001",
};
const BASE_PERFIL = { nome: "Maria de Teste", nascimento: "1990-05-04", whatsapp: "(83) 99999-0000" };

describe("comporDadosDocumento — payload pronto (CART-01/02/03/04)", () => {
  it("aceita o trio no cadastro e entrega os valores", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio(), HOJE);
    expect(pronto.ok).toBe(true);
    if (!pronto.ok) return;
    expect(pronto.dados.rg).toBe(TRIO_NORMALIZADO.rg);
    expect(pronto.dados.cpf).toBe(TRIO_NORMALIZADO.cpf);
    expect(pronto.dados.data_batismo).toBe(TRIO_NORMALIZADO.data_batismo);
  });

  it("payload pronto é Object.freeze em runtime e resiste à escrita", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const dados = pronto.dados;
    expect(Object.isFrozen(dados)).toBe(true);
    try {
      (dados as { rg: string }).rg = "999.999.999-9";
    } catch {
      /* modo strict lança; sloppy ignora. Os dois são o efeito certo */
    }
    expect(pronto.dados.rg).toBe(TRIO_NORMALIZADO.rg);
  });

  it("aceita o trio no perfil", () => {
    const pronto = comporDadosDocumento(BASE_PERFIL, {}, formDoTrio(), HOJE);
    expect(pronto.ok).toBe(true);
  });
});

describe("colunasCriarMembro — payload do cadastro admin (CART-01)", () => {
  it("carrega o trio normalizado, auth_user_id e matrícula injetados", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const row = colunasCriarMembro(pronto.dados, "uid-1", "M-2026-0001");
    expect(row.rg).toBe(TRIO_NORMALIZADO.rg);
    expect(row.cpf).toBe(TRIO_NORMALIZADO.cpf);
    expect(row.data_batismo).toBe(TRIO_NORMALIZADO.data_batismo);
    expect(row.auth_user_id).toBe("uid-1");
    expect(row.matricula).toBe("M-2026-0001");
  });

  it("sem rg no payload, a row fica sem rg — o builder não inventa valor", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const row = colunasCriarMembro(
      Object.assign({}, pronto.dados, { rg: null }),
      "uid-1",
      "M-2026-0001"
    );
    expect(row.rg).toBeNull();
  });

  it("sem endereço grava NULL, não ausente, e a coluna vem presente", () => {
    const row = colunasCriarMembro({ nome: "X", nascimento: "2000-01-01", whatsapp: "84" }, "u", "IVC-0002");
    expect(row.cidade).toBeNull();
    expect("logradouro" in row).toBe(true);
  });
});

describe("colunasEditarMembro — payload da edição admin (CART-02)", () => {
  it("carrega o trio normalizado e o atualizado_em injetado", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const row = colunasEditarMembro(pronto.dados, "2026-10-01T12:00:00.000Z");
    expect(row.rg).toBe(TRIO_NORMALIZADO.rg);
    expect(row.cpf).toBe(TRIO_NORMALIZADO.cpf);
    expect(row.data_batismo).toBe(TRIO_NORMALIZADO.data_batismo);
    expect(row.atualizado_em).toBe("2026-10-01T12:00:00.000Z");
  });
});

describe("colunasPerfil — payload da autoedição (CART-03/AD-019)", () => {
  it("carrega o trio normalizado", () => {
    const pronto = comporDadosDocumento(BASE_PERFIL, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const row = colunasPerfil(pronto.dados, "2026-10-01T12:00:00.000Z");
    expect(row.rg).toBe(TRIO_NORMALIZADO.rg);
    expect(row.cpf).toBe(TRIO_NORMALIZADO.cpf);
    expect(row.data_batismo).toBe(TRIO_NORMALIZADO.data_batismo);
  });

  it("grava exatamente 7 colunas, sem status/matricula/criado_em", () => {
    const pronto = comporDadosDocumento(BASE_PERFIL, {}, formDoTrio(), HOJE);
    if (!pronto.ok) throw new Error("esperava ok");
    const row = colunasPerfil(pronto.dados, "2026-10-01T12:00:00.000Z");
    expect(Object.keys(row).sort()).toEqual([
      "atualizado_em",
      "cpf",
      "data_batismo",
      "nascimento",
      "nome",
      "rg",
      "whatsapp",
    ]);
    for (const proibida of ["status", "matricula", "criado_em", "id", "validade_cartao"]) {
      expect(proibida in row).toBe(false);
    }
  });

  it("sem documento limpa as três colunas (CART-04 no caminho do update)", () => {
    const row = colunasPerfil({ nome: "X", nascimento: "2000-01-01", whatsapp: "84" }, "2026-10-01T12:00:00.000Z");
    expect([row.rg, row.cpf, row.data_batismo]).toEqual([null, null, null]);
  });
});

describe("comporDadosDocumento — precedência, vazio, erro e merge (CART-01..07)", () => {
  it("o documento do formulário tem precedência sobre a base", () => {
    const comDoc = comporDadosDocumento(
      Object.assign({}, BASE_CADASTRO, { rg: "VEIO-DA-BASE", cpf: "VEIO-DA-BASE" }),
      {},
      formDoTrio(),
      HOJE
    );
    expect(comDoc.ok).toBe(true);
    if (!comDoc.ok) return;
    expect(comDoc.dados.rg).toBe(TRIO_NORMALIZADO.rg);
    expect(comDoc.dados.cpf).toBe(TRIO_NORMALIZADO.cpf);
  });

  it("rg vazio é ausência, não erro: vira null", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio({ rg: "" }), HOJE);
    expect(pronto.ok).toBe(true);
    if (!pronto.ok) return;
    expect(pronto.dados.rg).toBeNull();
  });

  it("cpf de 3 dígitos faz a composição falhar, com mapa de erros e sem dados", () => {
    const pronto = comporDadosDocumento(BASE_CADASTRO, {}, formDoTrio({ cpf: "123" }), HOJE);
    expect(pronto.ok).toBe(false);
    if (pronto.ok) return;
    expect(pronto.campos.cpf).toBeTruthy();
    expect((pronto as { dados?: unknown }).dados).toBeUndefined();
  });

  it("erro da própria rota também barra a gravação", () => {
    const baseErros = { nome: "Informe seu nome completo." };
    const mBase = comporDadosDocumento(
      { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" },
      baseErros,
      fd({ rg: "12.345.678-9" }),
      HOJE
    );
    expect(mBase.ok).toBe(false);
    if (mBase.ok) return;
    expect(Object.keys(mBase.campos)).toEqual(["nome"]);
  });

  it("erros de documento e da rota convivem no mesmo 400", () => {
    const baseErros = { nome: "Informe seu nome completo." };
    const mErro = comporDadosDocumento(
      { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" },
      baseErros,
      fd({ cpf: "123" }),
      HOJE
    );
    expect(mErro.ok).toBe(false);
    if (mErro.ok) return;
    expect(Object.keys(mErro.campos).sort()).toEqual(["cpf", "nome"]);
    expect("dados" in mErro).toBe(false);
    expect(typeof mErro.campos.cpf).toBe("string");
  });

  it("um único campo inválido derruba o documento inteiro", () => {
    const mParcial = comporDadosDocumento(
      { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" },
      {},
      fd({ rg: "12.345.678-9", cpf: "123" }),
      HOJE
    );
    expect(mParcial.ok).toBe(false);
  });

  it("FormData sem documento é válido e leva NULL, não string vazia", () => {
    const baseDados = { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" };
    const mLimpo = comporDadosDocumento(baseDados, {}, fd({}), HOJE);
    expect(mLimpo.ok).toBe(true);
    if (!mLimpo.ok) return;
    expect(mLimpo.dados.rg).toBeNull();
    expect(mLimpo.dados.cpf).toBeNull();
    expect(mLimpo.dados.data_batismo).toBeNull();
    expect(mLimpo.dados.nome).toBe("Miguel");
    expect("campos" in mLimpo).toBe(false);
    expect(Object.isFrozen(mLimpo.dados)).toBe(true);
  });

  it("CART-01 formulário válido devolve o ramo ok com o trio composto", () => {
    const baseDados = { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" };
    const mOk = comporDadosDocumento(
      baseDados,
      {},
      fd({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }),
      HOJE
    );
    expect(mOk.ok).toBe(true);
    if (!mOk.ok) return;
    expect([mOk.dados.rg, mOk.dados.cpf, mOk.dados.data_batismo]).toEqual([
      "12.345.678-9",
      "12345678909",
      "2020-05-10",
    ]);
    expect(mOk.dados.nome).toBe("Miguel");
    expect("campos" in mOk).toBe(false);
    expect(Object.isFrozen(mOk.dados)).toBe(true);
  });

  it("não muta o payload nem o mapa de erros da rota", () => {
    const baseDados = { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" };
    const baseErros = { nome: "Informe seu nome completo." };
    comporDadosDocumento(baseDados, baseErros, fd({ rg: "12.345.678-9" }), HOJE);
    expect(baseDados).toEqual({
      nome: "Miguel",
      nascimento: "2004-12-28",
      whatsapp: "84999766852",
    });
    expect(baseErros).toEqual({ nome: "Informe seu nome completo." });
  });
});

function fd(o: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
}

describe("lerDocumentoForm — extração do FormData (CART-01/02/03)", () => {
  it("normaliza o trio digitado", () => {
    const viaForm = lerDocumentoForm(
      fd({ rg: " 12.345.678-9 ", cpf: "123.456.789-09", data_batismo: "2020-05-10" }),
      HOJE
    );
    expect(viaForm.dados).toEqual({
      rg: "12.345.678-9",
      cpf: "12345678909",
      data_batismo: "2020-05-10",
    });
    expect(viaForm.campos).toEqual({});
  });

  it("FormData vazio -> 3 NULLs com as 3 chaves presentes", () => {
    const viaFormVazio = lerDocumentoForm(fd({}), HOJE);
    expect(viaFormVazio.dados).toEqual({ rg: null, cpf: null, data_batismo: null });
    expect(Object.keys(viaFormVazio.dados).sort()).toEqual(["cpf", "data_batismo", "rg"]);
  });

  it("erros por campo no FormData", () => {
    const viaFormErro = lerDocumentoForm(
      fd({ rg: "x".repeat(21), cpf: "1", data_batismo: "2030-01-01" }),
      HOJE
    );
    expect(Object.keys(viaFormErro.campos).sort()).toEqual(["cpf", "data_batismo", "rg"]);
  });
});

describe("colunasDocumento — whitelist de colunas (CART-04/AD-019)", () => {
  it("payload vazio -> 3 NULLs", () => {
    expect(colunasDocumento({})).toEqual({ rg: null, cpf: null, data_batismo: null });
  });

  it("payload completo preservado", () => {
    expect(
      colunasDocumento({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" })
    ).toEqual({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" });
  });

  it("string vazia -> NULL", () => {
    expect(colunasDocumento({ rg: "", cpf: "" })).toEqual({
      rg: null,
      cpf: null,
      data_batismo: null,
    });
  });

  it("whitelist barra colunas sensíveis (status/matricula/criado_em)", () => {
    const cheio = {
      rg: "x",
      cpf: "y",
      data_batismo: "z",
      status: "ATIVO",
      matricula: "IVC-1",
      criado_em: "2020-01-01",
    };
    expect(Object.keys(colunasDocumento(cheio)).sort()).toEqual(["cpf", "data_batismo", "rg"]);
  });
});

describe("objetos exatos de insert/update — CART-01/02/03", () => {
  const completo = {
    nome: "Miguel Ernandes",
    nascimento: "2004-12-28",
    whatsapp: "84999766852",
    logradouro: "Rua A",
    numero: "12",
    bairro: "Centro",
    cidade: "Santa Luzia",
    uf: "PB",
    cep: "58900000",
    rg: "12.345.678-9",
    cpf: "12345678909",
    data_batismo: "2020-05-10",
  };
  const ATUALIZADO = "2026-10-01T12:00:00.000Z";

  it("CART-01 create admin leva rg/cpf/batismo ao insert", () => {
    const pCreate = colunasCriarMembro(completo, "uuid-1", "IVC-0001");
    expect(pCreate.rg).toBe("12.345.678-9");
    expect(pCreate.cpf).toBe("12345678909");
    expect(pCreate.data_batismo).toBe("2020-05-10");
    expect(pCreate.auth_user_id).toBe("uuid-1");
    expect(pCreate.matricula).toBe("IVC-0001");
    expect(pCreate.logradouro).toBe("Rua A");
    expect(pCreate.cep).toBe("58900000");
  });

  it("CART-02 edit admin leva rg/cpf/batismo ao update e reanota atualizado_em", () => {
    const pEdit = colunasEditarMembro(completo, ATUALIZADO);
    expect(pEdit.rg).toBe("12.345.678-9");
    expect(pEdit.cpf).toBe("12345678909");
    expect(pEdit.data_batismo).toBe("2020-05-10");
    expect(pEdit.atualizado_em).toBe(ATUALIZADO);
  });

  it("CART-03 autoedição não escreve status/matricula/criado_em/id/validade_cartao", () => {
    const comCosmetico = {
      ...completo,
      status: "ATIVO",
      matricula: "IVC-0001",
      criado_em: "2020-01-01",
    };
    const pPerfil = colunasPerfil(comCosmetico, ATUALIZADO);
    expect(Object.keys(pPerfil).sort()).toEqual([
      "atualizado_em",
      "cpf",
      "data_batismo",
      "nascimento",
      "nome",
      "rg",
      "whatsapp",
    ]);
    expect(pPerfil.rg).toBe("12.345.678-9");
    expect(pPerfil.cpf).toBe("12345678909");
    expect(pPerfil.data_batismo).toBe("2020-05-10");
  });
});