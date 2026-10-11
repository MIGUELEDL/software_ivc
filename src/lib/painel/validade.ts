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

/**
 * Ano com 4 a 6 dígitos, não 4 fixos (AD-025). O trigger `members_ciclo_base`
 * grava o ciclo-base com `make_date(ano + 1, ...)`: um `criado_em` de
 * 9999-12-31 vira `10000-12-31` na coluna. Com `\d{4}` fixo esse valor não
 * casava e o TS devolvia `—` para um registro que o banco tinha derivado — os
 * dois lados discordando sobre dado já gravado, que é a forma mais cara de
 * divergir.
 *
 * ## Resíduo conhecido: a janela NÃO é um intervalo
 *
 * Quatro rodadas de verificação (R5, R6, R7 e a R8) documentaram esta janela
 * por texto, e **todas erraram** — porque ela não é uma faixa. `diasNoMes`
 * pergunta o *último dia do mês*, então o `Date` quebra no **mês** em que esse
 * último dia passa do teto, não no ano. Por isso a regra, não a faixa:
 *
 * - **TS**: `Date` medido até `+275760-09-13T00:00:00.000Z`. No ano 275760 os
 *   meses 1..8 são representáveis e 9..12 não. Acima de 275760, nada.
 * - **SQL**: `criado_em` é `timestamptz` e aceita até `294276-12-31` (o 5874897
 *   que eu citei duas vezes é o teto do `date`, que o `make_date` alcança mas não
 *   é o gargalo).
 *
 * Onde os dois discordam, o TS devolve `null` porque não tem como representar a
 * data. **Não fechável** sem trocar o transporte (texto civil), e por isso
 * `probe-cartao-validade.sh` mede a transição em vez de confiar numa frase: o
 * gate se move se a semântica do `Date` mudar, o texto não. Ver `aniversario`.
 */
const FORMATO_DATA = /^\d{4,6}-\d{2}-\d{2}$/;

/**
 * Ordem cronológica por componentes, e não por string (AD-025).
 *
 * A comparação lexical é correta enquanto todo ano tem 4 dígitos, e quebra
 * exatamente onde o banco já quebra: `"10000-12-31" >= "2026-01-01"` é `false`,
 * porque `"1"` ordena antes de `"2"`. O efeito era `calcularValidadeCartao`
 * devolvendo `null` (cartao mostrando `—`) para um registro cujo
 * `validade_cartao` o trigger tinha gravado como `10000-12-31`. Para anos de 4
 * dígitos a ordem por componente dá o mesmo resultado que a lexical, então nada
 * que já passasse muda.
 */
function compararDatas(a: string, b: string): number {
  const [anoA, mesA, diaA] = a.split("-").map(Number);
  const [anoB, mesB, diaB] = b.split("-").map(Number);

  if (anoA !== anoB) {
    return anoA - anoB;
  }
  if (mesA !== mesB) {
    return mesA - mesB;
  }
  return diaA - diaB;
}

/**
 * Fuso civil da igreja (Santa Luzia-PB). O cálculo é ancorado aqui em vez do
 * fuso do processo: em produção a Vercel roda UTC, então "o dia local" mudaria
 * conforme o deploy e o mesmo membro veria a validade virar de um dia para o
 * outro. O trigger SQL usa o mesmo fuso — as duas fontes não podem divergir.
 */
// Stryker disable next-line StringLiteral: mutar o fuso ("") faz o Intl lançar
// RangeError no import → nenhum teste chega a rodar; artefato de load, não buraco.
const FUSO_CIVIL = "America/Sao_Paulo";

/**
 * Último dia do mês, ou `null` se o ano não é representável pelo `Date`.
 *
 * Não pode devolver `NaN`: `dia > NaN` é `false`, então uma validação de
 * calendário escrita com este valor **passava em silêncio** e o `formatar`
 * despejava `"275761-09-NaN"` dentro de uma data — quebrando o contrato
 * `YYYY-MM-DD | null`. Foi a R6 que mediu isso com `275760-09-12`.
 */
function diasNoMes(ano: number, mes: number): number | null {
  // `new Date(ano, mes, 0)` devolve o último dia do mês `mes` (1-based).
  const dias = new Date(ano, mes, 0).getDate();
  return Number.isNaN(dias) ? null : dias;
}

function formatar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// `en-CA` formata como ISO (YYYY-MM-DD) — evita montar a string à mão e
// funciona igual em qualquer ICU do runtime.
// Stryker disable next-line StringLiteral,ObjectLiteral: locale/objeto do Intl
// são avaliados no import; mutá-los derruba o load (RangeError) ou é equivalente
// neste fuso (TZ do processo) — artefato, não buraco de teste.
const FORMATADOR_CIVIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_CIVIL,
  // Stryker disable next-line StringLiteral: opção avaliada no import; mudá-la
  // derruba o load ou é equivalente no fuso da igreja — artefato.
  year: "numeric",
  // Stryker disable next-line StringLiteral: idem (artefato de load/fuso).
  month: "2-digit",
  // Stryker disable next-line StringLiteral: idem (artefato de load/fuso).
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
  const diasBase = diasNoMes(anoBase, mes);

  if (
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    !Number.isInteger(anoBase) ||
    // Stryker disable next-line ConditionalExpression: `diasBase === null` só
    // ocorre com anoBase inrepresentável; anoAlvo=anoBase+anos segue
    // inrepresentável → mesmo null (equivalente, provado por fuzz diferencial).
    diasBase === null ||
    dia > diasBase
  ) {
    return null;
  }

  const anoAlvo = anoBase + anos;
  const diasAlvo = diasNoMes(anoAlvo, mes);

  if (diasAlvo === null) {
    return null;
  }

  return formatar(anoAlvo, mes, Math.min(dia, diasAlvo));
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
  // Stryker disable next-line ConditionalExpression,BlockStatement: criadoEm
  // ausente/'' resulta em `civil === null` e devolve null do mesmo modo (equivalente).
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

  // Stryker disable next-line ConditionalExpression,LogicalOperator: `civil` é
  // sempre null ou YYYY-MM-DD válido (invariante de dataCivil/FORMATO_DATA), então
  // `===null` e `||`→`&&` não alteram o resultado (equivalente).
  if (civil === null || !FORMATO_DATA.test(civil)) {
    return null;
  }

  const hojeIso = civilDe(hoje);

  // O número de candidatos é derivado da distância entre os anos, nunca um teto
  // arbitrário. Um teto fixo de 200 (AD-025) fazia um `criado_em` mais antigo
  // devolver `null` — enquanto o trigger já tinha gravado `1801-06-01` para um
  // registro de 1800. Era divergência sobre dado gravado, do mesmo tipo da do ano
  // de 5 dígitos, e na janela baixa ela é fechável: aqui não há teto de runtime,
  // só aritmética de ano.
  // Stryker disable next-line StringLiteral: "-"→"" só muda `anoCivil` para 0,
  // o que apenas AUMENTA o teto `passos`; o 1º candidato vencedor é o mesmo
  // (folga = equivalente, ver comentário de `passos`).
  const anoCivil = Number(civil.slice(0, civil.indexOf("-")));
  const anoHoje = Number(hojeIso.slice(0, hojeIso.indexOf("-")));

  // `passos` é o maior `anos` que pode ser o vencedor, e ele é exato: o
  // aniversário k tem ano `anoCivil + k`, então o maior k ainda capaz de
  // alcançar o ano de hoje é `anoHoje - anoCivil + 1`. Folga aqui é mutante
  // EQUIVALENTE — o gate não distingue `+1` de `+2`, e um `+9` silencioso
  // seria o mesmo teto arbitrário que o bug corrigido veio tirar.
  // Stryker disable next-line ArithmeticOperator: `-`→`+` altera só o teto
  // `passos`; com anoCivil≥0 apenas o aumenta → mesmo 1º candidato (equivalente).
  const passos = Math.max(1, anoHoje - anoCivil + 1);

  // Um registro é sempre criado no passado, mas um `criado_em` futuro (dado
  // inconsistente) não deve ser "corrigido" para hoje: a validade passa a
  // contar a partir daquela data. Nesse caso `passos` é 1 e o primeiro
  // aniversário é o candidato — o mesmo comportamento de antes.
  for (let anos = 1; anos <= passos; anos += 1) {
    const candidato = aniversario(civil, anos);

    if (candidato === null) {
      return null;
    }

    if (compararDatas(candidato, hojeIso) >= 0) {
      return candidato;
    }
  }

  return null;
}
