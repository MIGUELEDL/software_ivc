/**
 * O mínimo do cliente que o caminho de escrita de membro usa.
 *
 * Existe por um motivo medido, não por estilo. Os services de escrita
 * (`createMember`, `updateMember`, `criarMembro`, `atualizarDadosMembro`)
 * recebem o cliente do Supabase de dentro, então nenhum teste conseguia
 * **executá-los** — e toda verificação do payload era inferência sobre o
 * texto da chamada. Sete rodadas de Verifier foram isso: `persistido`
 * aceitou wrapper, `gravando` aceitou wrapper, `gravando` aceitou
 * reatribuição do parâmetro, e a R8 mediu o que sobra:
 *
 *   .update({ ...colunasEditarMembro(dados, iso), rg: null, cpf: null })
 *
 * Um passo, nos quatro caminhos, com `tsc`, `lint`, `build` e as 34 probes
 * verdes — e a row gravando `NULL`. Guarda textual não fecha isso: o
 * primeiro argumento ainda é o literal `dados`, e a tier de execução dos
 * *builders* nunca executa o *service*.
 *
 * Com o cliente injetável, o probe executa o service de verdade e captura o
 * payload que ele realmente manda ao banco. Aí a afirmação deixa de ser
 * "a chamada parece certa" e passa a ser "a row que o service grava tem
 * estes valores" — que é o que o AC pede.
 *
 * O `SupabaseClient` real satisfaz esta estrutura, então os callers de
 * produção não mudam: o parâmetro tem default e continua chamando
 * `createServerClient()`.
 */

/** Cadeia de consulta do caminho de escrita, no mínimo que ele usa. */
export type ConsultaEscrita = {
  eq(coluna: string, valor: unknown): ConsultaEscrita;
  select(...args: unknown[]): ConsultaEscrita;
  single(): Promise<{ data: unknown; error: unknown }>;
};

/** Tabela com os dois verbos de escrita que o caminho de membro usa. */
export type ClienteEscrita = {
  from(tabela: string): {
    insert(payload: Record<string, unknown>): ConsultaEscrita;
    update(payload: Record<string, unknown>): ConsultaEscrita;
  };
};

/**
 * Ponto ÚNICO de cast do módulo.
 *
 * `SupabaseClient` tem genéricos aninhados profundos demais: pedir que ele
 * satisfaça `ClienteEscrita` estoura `TS2589` ("type instantiation is
 * excessively deep"). Concentrar o cast aqui é para que os quatro call
 * sites não repitam a mesma justificativa — e para que ele seja uma coisa
 * que se vê, e não um `as ClienteEscrita` espalhado pelo código.
 *
 * Não é folga semântica. O que a barreira depende é o probe INJETAR um fake
 * que implementa `ClienteEscrita` de verdade e o service ser EXECUTADO com
 * ele; esse `fake` é o que o TypeScript conferiu. Esta função só cobre o
 * caminho de produção, em que o cliente é o Supabase de verdade.
 */
export function comoCliente(c: unknown): ClienteEscrita {
  return c as ClienteEscrita;
}

/**
 * Dependências injetáveis dos services de escrita. Todo campo é opcional e
 * tem o comportamento de produção como default — injetar é para o probe, e
 * a ausência não muda nada em runtime.
 */
export type DepsEscritaMember = {
  /** Cliente de dados. Default: `createServerClient()`. */
  cliente?: ClienteEscrita;
  /** Matrícula já gerada. Default: `generateMatricula()`. */
  matricula?: string;
};

/** Dependências de `criarMembro`, que também toca `auth.admin`. */
export type DepsEscritaAdmin = DepsEscritaMember & {
  /**
   * Cria o usuário no auth e devolve o `id`. Default: `createUser` do
   * cliente admin. Injetar só o `id` evita modelar a superfície inteira do
   * `auth.admin` no contrato de teste.
   */
  criarAuthUser?: (email: string, senhaTemporaria: string) => Promise<string>;
  /** Usado no rollback 2-passos quando o insert da row falha. */
  removerAuthUser?: (id: string) => Promise<void>;
};