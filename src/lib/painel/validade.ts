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

function diasNoMes(ano: number, mes: number): number {
  // `new Date(ano, mes, 0)` devolve o último dia do mês `mes` (1-based).
  return new Date(ano, mes, 0).getDate();
}

function formatar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
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
export function calcularValidadeCartao(
  criadoEm: string | null | undefined,
  hoje: Date
): string | null {
  if (!criadoEm || !FORMATO_DATA.test(criadoEm)) {
    return null;
  }

  const hojeIso = formatar(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    hoje.getDate()
  );

  // Um registro é sempre criado no passado, mas um `criado_em` futuro (dado
  // inconsistente) não deve ser "corrigido" para hoje: a validade passa a
  // contar a partir daquela data.
  for (let anos = 1; anos <= 200; anos += 1) {
    const candidato = aniversario(criadoEm, anos);

    if (candidato === null) {
      return null;
    }

    if (candidato >= hojeIso) {
      return candidato;
    }
  }

  return null;
}
