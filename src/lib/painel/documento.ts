/**
 * Normalização e validação dos dados de documento do cartão de membro
 * (CART-04..CART-07). Módulo puro: sem I/O e sem relógio próprio — `hoje` é
 * sempre injetado pelo caller para que o comportamento seja determinístico em
 * teste. Só depende de `civilDe`, o calendário civil compartilhado com o
 * cálculo de validade.
 *
 * Convenção: campo **vazio** é válido e resolve para `""`; o caller converte
 * `""` em `null` antes de gravar, porque `NULL` e `""` são estados distintos
 * e a coluna é nullable (`0020_member_card_columns.sql`).
 */

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

import { civilDe } from "./validade";

const SOMENTE_DIGITOS = /^\d+$/;

/** RG: texto livre por estado (SSP varia), apenas saneado e limitado. */
const RG_MAX = 20;

/**
 * Remove qualquer caractere de controle (inclusive CR/LF/TAB) — impede que
 * um dado de documento quebre o layout de/impressão do cartão ID-1.
 */
function temControle(valor: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(valor);
}

/**
 * CPF: aceita apenas dígitos e exige exatamente 11 (CART-05). Máscara é
 * tolerada na entrada (o usuário digita `123.456.789-09`) mas **não** é
 * persistida — o cartão ID-1 não comporta máscara e duas representações do
 * mesmo CPF quebrariam a busca por ele.
 */
export function normalizarCpf(valor: string): Resultado<string> {
  const bruto = valor.trim();

  if (temControle(bruto)) {
    return { ok: false, erro: "Informe um CPF com 11 dígitos." };
  }

  if (bruto.length === 0) {
    return { ok: true, valor: "" };
  }

  const digitos = bruto.replace(/\D/g, "");

  // `digitos` vazio com entrada não vazia ("abcdefghijk") cai aqui: é CPF
  // inválido, não CPF ausente.
  if (!SOMENTE_DIGITOS.test(digitos) || digitos.length !== 11) {
    return { ok: false, erro: "Informe um CPF com 11 dígitos." };
  }

  return { ok: true, valor: digitos };
}

/**
 * RG: `trim`, limite de 20 caracteres e rejeição de caractere de controle
 * (CART-07). Sem normalização de máscara — o formato varia por estado.
 */
export function normalizarRg(valor: string): Resultado<string> {
  const limpo = valor.trim();

  if (temControle(limpo)) {
    return { ok: false, erro: "Informe um RG válido." };
  }

  if (limpo.length === 0) {
    return { ok: true, valor: "" };
  }

  if (limpo.length > RG_MAX) {
    return {
      ok: false,
      erro: `Informe um RG com no máximo ${RG_MAX} caracteres.`,
    };
  }

  return { ok: true, valor: limpo };
}

/**
 * Data de batismo em `YYYY-MM-DD`: data real no calendário e não posterior a
 * `hoje` (CART-06). Mesma guarda de três passos de `validarNascimento`
 * (`src/app/api/painel/perfil/route.ts`).
 */
export function normalizarDataBatismo(
  valor: string,
  hoje: Date
): Resultado<string> {
  const bruto = valor.trim();

  if (temControle(bruto)) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  if (bruto.length === 0) {
    return { ok: true, valor: "" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  const [ano, mes, dia] = bruto.split("-").map(Number);

  // Validação de calendário por round-trip em UTC: `new Date(y, m, d)` depende
  // do fuso do processo, então num servidor em UTC+14 a checagem de overflow
  // (2026-02-30 -> 01/03) poderia escapar.
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  // Comparação de dias civis, não de instantes: uma data é "futura" quando está
  // depois do dia de hoje no calendário da igreja. Usar `Date` aqui faria o
  // resultado variar com o TZ do deploy.
  if (bruto > civilDe(hoje)) {
    return {
      ok: false,
      erro: "A data de batismo não pode ser futura.",
    };
  }

  return { ok: true, valor: bruto };
}

export type DadosDocumentoEntrada = {
  rg: string;
  cpf: string;
  dataBatismo: string;
};

export type DadosDocumento = {
  rg: string | null;
  cpf: string | null;
  data_batismo: string | null;
};

/**
 * Agrega os três campos e monta a mensagem de erro por campo, no mesmo
 * formato `{ dados, campos }` usado por `validarFormulario`. Campo vazio
 * resolve para `null` (CART-04).
 */
export function dadosDocumento(
  entrada: DadosDocumentoEntrada,
  hoje: Date
): { dados: DadosDocumento; campos: Record<string, string> } {
  const rg = normalizarRg(entrada.rg);
  const cpf = normalizarCpf(entrada.cpf);
  const batismo = normalizarDataBatismo(entrada.dataBatismo, hoje);

  const campos: Record<string, string> = {};
  if (rg.ok === false) campos.rg = rg.erro;
  if (cpf.ok === false) campos.cpf = cpf.erro;
  if (batismo.ok === false) campos.data_batismo = batismo.erro;

  const paraColuna = (r: Resultado<string>): string | null =>
    r.ok === true && r.valor !== "" ? r.valor : null;

  return {
    dados: {
      rg: paraColuna(rg),
      cpf: paraColuna(cpf),
      data_batismo: paraColuna(batismo),
    },
    campos,
  };
}
