import { describe, expect, it } from "vitest";

import { PIX } from "./constants";
import { PIX_PAYLOAD, buildBrCode, buildBrCodePessoal } from "./pix";

/**
 * Suíte ad-hoc do payload BR Code estático (FWT-07, AD-012). Os valores
 * esperados são literais finais do Manual de Padrões do PIX/BCB e da decisão
 * AD-012 — não são derivados do código sob teste.
 *
 * Camada de prova: débito da chave CNPJ com máscara. `PIX.key` deriva de
 * `CHURCH.cnpj` via `replace(/\D/g, "")` (correção bb3a62f, restaurada em T6)
 * e o payload NÃO pode conter `.`, `/` ou `-` no campo 01 — o painel/dizimo
 * (buildBrCodePessoal) consome `PIX.key` diretamente.
 */

const MAI = "000201";
const MCC_ZERO = "52040000";
const MOEDA_986 = "5303986";
const PAIS_BR = "5802BR";
const CHAVE_CNPJ_DIGITOS = "68683917000171";
// Campo 01 do EMV: id 01 + len 14 + os 14 dígitos do CNPJ.
const CAMPO_CHAVE_DIGITOS = `0114${CHAVE_CNPJ_DIGITOS}`;

// Payload final verificado no app bancário (doacao-pix/validation.md, commit
// bb3a62f): literal transcrito, CRC `20BF` e nada derivado do encoder.
const PAYLOAD_OFICIAL =
  "00020126360014BR.GOV.BCB.PIX0114686839170001715204000053039865802BR5921IGREJA VIRTUDE CRISTA6011SANTA LUZIA62070503***630420BF";

describe("PIX.key — chave institucional sem máscara (AD-012)", () => {
  it("deriva de CHURCH.cnpj com só dígitos", () => {
    expect(PIX.key).toBe(CHAVE_CNPJ_DIGITOS);
    expect(PIX.key).toMatch(/^[0-9]+$/);
  });
});

describe("buildBrCode — payload estático PIX_PAYLOAD (AD-012)", () => {
  it("abre com o MAI 000201 e o campo 26 com o GUI do BCB", () => {
    expect(PIX_PAYLOAD.startsWith(MAI)).toBe(true);
    expect(PIX_PAYLOAD).toContain("0014BR.GOV.BCB.PIX");
  });

  it("chave CNPJ no campo 01 sem máscara (só dígitos)", () => {
    // Se a chave entrasse mascarada, o campo 01 seria `011968.683.917/0001-71`
    // e este literal de 14 dígitos não apareceria.
    expect(PIX_PAYLOAD).toContain(CAMPO_CHAVE_DIGITOS);
    expect(PIX_PAYLOAD).not.toContain("68.683.917/0001-71");
  });

  it("MCC 0000 (52040000) e moeda 986 (5303986)", () => {
    expect(PIX_PAYLOAD).toContain(MCC_ZERO);
    expect(PIX_PAYLOAD).toContain(MOEDA_986);
  });

  it("país BR (5802BR)", () => {
    expect(PIX_PAYLOAD).toContain(PAIS_BR);
  });

  it("nome/cidade projetados sem acento, em caixa alta, até 25/15", () => {
    expect(PIX_PAYLOAD).toContain("5921IGREJA VIRTUDE CRISTA");
    expect(PIX_PAYLOAD).toContain("6011SANTA LUZIA");
    expect(PIX_PAYLOAD).not.toContain("Virtude Crist");
    expect(PIX_PAYLOAD).not.toContain("ã");
  });

  it("TXID do QR estático é o placeholder *** (campo 62/05)", () => {
    expect(PIX_PAYLOAD).toContain("62070503***");
  });

  it("CRC16 duplo byte em 6304, 4 hex maiúsculo no fim", () => {
    expect(PIX_PAYLOAD).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("é o literal final do payload oficial (CRC 20BF embutido)", () => {
    expect(PIX_PAYLOAD).toBe(PAYLOAD_OFICIAL);
  });
});

describe("buildBrCode — projeção de nome/cidade e CRC a partir de entrada crua", () => {
  it("acento composto adjacente a letra vira a base, sem inserir espaço", () => {
    // NFD + strip de marca: "aãb" -> "aab". Sem a decomposição, o "ã" cairia
    // no replace de não-alfanuméricos e viraria espaço ("a b").
    const p = buildBrCode({ key: "1", receiverName: "Igreja aãb c", receiverCity: "X" });
    expect(p).toContain("5912IGREJA AAB C");
  });

  it("espaços múltiplos colapsam em um só", () => {
    const p = buildBrCode({ key: "1", receiverName: "A  B", receiverCity: "C" });
    expect(p).toContain("5903A B");
  });

  it("caractere inválido entre letras vira espaço (não some)", () => {
    const p = buildBrCode({ key: "1", receiverName: "Dr.Jose", receiverCity: "C" });
    expect(p).toContain("5907DR JOSE");
  });

  it("trim remove espaço nas pontas do nome", () => {
    const p = buildBrCode({ key: "1", receiverName: "Igreja ", receiverCity: "C" });
    expect(p).toContain("5906IGREJA");
  });

  it("nome acima de 25 chars é cortado no limite do campo 59", () => {
    const p = buildBrCode({ key: "1", receiverName: "A".repeat(30), receiverCity: "C" });
    expect(p).toContain("5925" + "A".repeat(25));
  });
});

describe("buildBrCodePessoal — txid = matrícula do membro (AD-012)", () => {
  const MATRICULA = "M-2026-0001";

  it("mesmo payload institucional do QR público: MAI, chave, MCC, moeda, país", () => {
    const pessoal = buildBrCodePessoal(MATRICULA);
    expect(pessoal.startsWith(MAI)).toBe(true);
    expect(pessoal).toContain(CAMPO_CHAVE_DIGITOS);
    expect(pessoal).toContain(MCC_ZERO);
    expect(pessoal).toContain(MOEDA_986);
    expect(pessoal).toContain(PAIS_BR);
  });

  it("difere do público só no campo 62: txid vira a matrícula", () => {
    const pessoal = buildBrCodePessoal(MATRICULA);
    // id 05 + len 11 + "M-2026-0001" dentro do campo 62 (15 chars ao todo).
    expect(pessoal).toContain("62150511" + MATRICULA);
    expect(pessoal).not.toContain("62070503***");
    // Tudo antes do campo 62 é idêntico ao payload público.
    const antes = (p: string) => p.slice(0, p.indexOf("62"));
    expect(antes(pessoal)).toBe(antes(PIX_PAYLOAD));
  });

  it("assinatura CRC16/6304 idem", () => {
    expect(buildBrCodePessoal(MATRICULA)).toMatch(/6304[0-9A-F]{4}$/);
  });
});