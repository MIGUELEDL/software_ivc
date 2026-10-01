/**
 * Cálculo da validade anual do cartão de membro (CART-09..CART-12).
 *
 * Regra (decidida pelo usuário): o cartão **nunca vence**. Nasce na data de
 * registro e é renovado sozinho a cada ano, sem intervenção manual e sem
 * escrita no banco — a validade exibida é o *próximo aniversário* do registro
 * que ainda não passou.
 *
 *   criado_em = 2026-09-13, hoje = 2026-10-01  ->  2027-09-13
 *   criado_em = 2026-09-13, hoje = 2027-09-13  ->  2027-09-13  (limite inclusivo)
 *   criado_em = 2026-09-13, hoje = 2027-09-14  ->  2028-09-13  (renovou sozinho)
 *
 * A coluna `members.validade_cartao` guarda o **ciclo-base** (registro + 1 ano,
 * mantido por trigger na migration `0024`) e serve a relatórios/CSV. Ela não
 * rola com a passagem do tempo porque um trigger só dispara em escrita; o
 * valor que o membro vê é calculado aqui. As duas fontes derivam de `criado_em`
 * com a mesma regra, logo são coerentes por construção.
 *
 * Módulo puro e determinístico: `hoje` é injetado, nunca lido do relógio
 * interno. Toda a aritmética é feita em calendário civil local e comparada
 * como `YYYY-MM-DD` — imune ao deslocamento de fuso que `toISOString()`
 * introduziria ao atravessar a meia-noite UTC.
 */

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fuso civil da igreja (Santa Luzia-PB). O cálculo é ancorado aqui em vez do
 * fuso do processo: em produção a Vercel roda UTC, então "o dia local" mudaria
 * conforme o deploy e o mesmo membro veria a validade virar de um dia para o
 * outro. O trigger SQL usa o mesmo fuso — as duas fontes não podem divergir.
 */
const FUSO_CIVIL = "America/Sao_Paulo";

function diasNoMes(ano: number, mes: number): number {
  // `new Date(ano, mes, 0)` devolve o último dia do mês `mes` (1-based).
  return new Date(ano, mes, 0).getDate();
}

function formatar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// `en-CA` formata como ISO (YYYY-MM-DD) — evita montar a string à mão e
// funciona igual em qualquer ICU do runtime.
const FORMATADOR_CIVIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_CIVIL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` do instante no fuso civil da igreja (independente do TZ do processo). */
export function civilDe(data: Date): string {
  return FORMATADOR_CIVIL.format(data);
}

/**
 * `criadoIso` somado a `anos` anos, com clamp de 29/02 para 28/02 (CART-10):
 * 29 de fevereiro não existe em ano não bissexto, e 01/03 inventaria um mês
 * inteiro de validade que o membro não tem.
 */
export function aniversario(criadoIso: string, anos: number): string | null {
  if (!FORMATO_DATA.test(criadoIso)) {
    return null;
  }

  const [anoBase, mes, dia] = criadoIso.split("-").map(Number);

  // Valida o calendário *antes* de somar: `2026-13-01` passaria pelo formato
  // e viraria `2027-13-01`, uma data que não existe.
  if (
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > diasNoMes(anoBase, mes) ||
    !Number.isInteger(anoBase)
  ) {
    return null;
  }

  const anoAlvo = anoBase + anos;
  const diaAjustado = Math.min(dia, diasNoMes(anoAlvo, mes));

  return formatar(anoAlvo, mes, diaAjustado);
}

/**
 * Validade do ciclo corrente: o menor aniversário de `criadoEm` (a partir de
 * 1 ano) que **não** é anterior a `hoje`.
 *
 * Devolve `null` quando `criadoEm` é ausente ou não é uma data válida — o
 * cartão então exibe `—` em vez de quebrar (CART-12).
 */
/**
 * Converte um `timestamptz` (o `criado_em`, serializado como ISO com offset)
 * na data civil `YYYY-MM-DD` **no calendário local**, usando os mesmos
 * getters que `calcularValidadeCartao` aplica a `hoje`.
 *
 * Importante: os dois lados da comparação passam por cá, então mesmo num
 * servidor UTC com `criado_em` gravado em -03:00, o dia do registro e o dia de
 * hoje vêm do mesmo fuso e não há deslocamento de um dia na fronteira
 * (CART-11).
 *
 * Devolve `null` para entrada ausente ou não parseável.
 */
export function dataCivil(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return civilDe(data);
}

export function calcularValidadeCartao(
  criadoEm: string | null | undefined,
  hoje: Date
): string | null {
  if (!criadoEm) {
    return null;
  }

  // Aceita as duas formas que o dado assume: `YYYY-MM-DD` (já civil, usado nos
  // testes e no backfill) e o ISO completo do `timestamptz` `criado_em` lido
  // do banco. Só o segundo passa por `dataCivil` — reinterpretar uma data já
  // civil como UTC a deslocaria para o dia anterior em fusos negativos.
  const civil = FORMATO_DATA.test(criadoEm)
    ? criadoEm
    : dataCivil(criadoEm);

  if (civil === null || !FORMATO_DATA.test(civil)) {
    return null;
  }

  const hojeIso = civilDe(hoje);

  // Um registro é sempre criado no passado, mas um `criado_em` futuro (dado
  // inconsistente) não deve ser "corrigido" para hoje: a validade passa a
  // contar a partir daquela data.
  for (let anos = 1; anos <= 200; anos += 1) {
    const candidato = aniversario(civil, anos);

    if (candidato === null) {
      return null;
    }

    if (candidato >= hojeIso) {
      return candidato;
    }
  }

  return null;
}
