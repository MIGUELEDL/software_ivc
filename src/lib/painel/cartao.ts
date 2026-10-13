import { calcularValidadeCartao } from "./validade";

/**
 * Campos exibidos no cartão de membro, já formatados para exibição.
 *
 * Vive fora do componente porque `MemberCard` é um arquivo de 200 linhas de
 * JSX com posições em milímetros: assertar o conteúdo do cartão lendo o JSX não
 * é possível, e renderizá-lo exige o runtime do Next. O mapeamento — a parte que
 * decide *o que* o membro lê — fica aqui, puro e testável.
 */

/** Subconjunto de `Member` que o cartão consome. */
export type MembroCartao = {
  matricula: string;
  nome: string;
  nascimento: string;
  whatsapp: string;
  rg: string | null;
  cpf: string | null;
  data_batismo: string | null;
  // Anulável de propósito: a coluna tem `default now()` mas é nullable no
  // schema, e CART-15 exige `—` para registro "ausente", não só para registro
  // ilegível. Tipar como `string` não-nulável tiraria o caso do tipo.
  criado_em: string | null | undefined;
  foto_url: string | null;
};

export type CartaoCampos = {
  id: string;
  name: string;
  baptismDate: string;
  cpf: string;
  birthDate: string;
  validity: string;
  photo: string | undefined;
};

export const VAZIO = "—";

/**
 * `YYYY-MM-DD` → `dd/mm/aaaa`; ausente ou data inexistente vira `—`.
 *
 * O round-trip em UTC é o que rejeita `2026-02-30`: só reformatar a string
 * imprimiria "30/02/2026", um dia que não existe no calendário, e o cartão
 * impresso mentiria sobre a data de batismo do membro.
 */
export function fmtData(valor: string | null | undefined): string {
  // 4 a 6 dígitos no ano, e não 4 fixos, pelo mesmo motivo do `FORMATO_DATA`
  // (AD-025): o trigger deriva `10000-12-31` de um `criado_em` de 9999, e um
  // cartao que mostra `—` para uma data que a coluna tem e discorda do dado
  // gravado. O round-trip em UTC abaixo ja rejeita o que o `Date` nao
  // representa (acima de `+275760-09-13`).
  if (!valor || !/^\d{4,6}-\d{2}-\d{2}$/.test(valor)) {
    return VAZIO;
  }

  // `split` já garante o zero à esquerda, então os textos saem com dois
  // dígitos (`05`, não `5`). As comparações usam os números.
  const [ano, mes, dia] = valor.split("-");
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  const diaNum = Number(dia);
  const data = new Date(Date.UTC(anoNum, mesNum - 1, diaNum));

  if (
    data.getUTCFullYear() !== anoNum ||
    // Stryker disable next-line ConditionalExpression: mês fora de 1..12 sempre
    // muda o ano (checado acima) → nunca é o único termo verdadeiro (equivalente).
    data.getUTCMonth() !== mesNum - 1 ||
    // Stryker disable next-line ConditionalExpression: dia fora do mês sempre
    // muda o mês (checado acima) → nunca é o único termo verdadeiro (equivalente).
    data.getUTCDate() !== diaNum
  ) {
    return VAZIO;
  }

  return `${dia}/${mes}/${ano}`;
}

/**
 * Monta os campos do cartão a partir da linha atual do membro (CART-08..11).
 *
 * `hoje` é injetado: a validade exibida é o ciclo corrente, que muda com o
 * tempo, então um teste precisa poder fixar o dia sem mockar o relógio.
 */
export function camposCartao(
  member: MembroCartao,
  hoje: Date
): CartaoCampos {
  return {
    id: member.matricula,
    name: member.nome,
    baptismDate: fmtData(member.data_batismo),
    // Nascimento em vez de RG no cartão (decisão do operador): mesma
    // formatação civil de fmtData; `nascimento` é obrigatório no row.
    birthDate: fmtData(member.nascimento),
    // `??` basta aqui, diferente de `colunasDocumento`, que grava: ali `""`
    // seria persistido e é um estado distinto de `NULL`, então precisa de `||`.
    // Na leitura, a coluna nunca chega vazia — o caminho de escrita já converteu
    // para `NULL` — e `??` transforma só a ausência no travessão de CART-08.
    cpf: member.cpf ?? VAZIO,
    // Coluna `validade_cartao` deliberadamente ignorada: ela guarda o
    // ciclo-base e não rola sozinha. O que o membro lê é o próximo aniversário
    // ainda não vencido (CART-09..11).
    validity: fmtData(calcularValidadeCartao(member.criado_em, hoje)),
    photo: member.foto_url ?? undefined,
  };
}
