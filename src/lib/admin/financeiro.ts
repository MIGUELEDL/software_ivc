import { createServerClient } from "@/lib/supabase/server";

export {
  TIPOS_LANCAMENTO,
  STATUS_LANCAMENTO,
  METODOS_PAGAMENTO,
  type TipoLancamento,
  type StatusLancamento,
  type MetodoPagamento,
  type Lancamento,
  type LancamentoDados,
  type LancamentoPatch,
  type FechamentoCaixa,
  type WebhookEventPayload,
} from "@/lib/admin/financeiro-types";

import type {
  Lancamento,
  LancamentoDados,
  LancamentoPatch,
  FechamentoCaixa,
  TipoLancamento,
  StatusLancamento,
  MetodoPagamento,
} from "@/lib/admin/financeiro-types";

// ---------------------------------------------------------------------------
// Exceções de domínio (padrão assets.ts/eventos.ts — caller mapeia HTTP).
// ---------------------------------------------------------------------------

/** Lançamento não encontrado — caller mapeia 404 (FIN-11/AC-11). */
export class LancamentoNaoEncontradoError extends Error {
  constructor() {
    super("lancamento_nao_encontrado");
    this.name = "LancamentoNaoEncontradoError";
  }
}

/** Lançamento CONCILIADO não pode ser editado — caller mapeia 400 (FIN-05/AC-8). */
export class LancamentoConciliadoError extends Error {
  constructor() {
    super("transacao_conciliada");
    this.name = "LancamentoConciliadoError";
  }
}

/** Lançamento não-PENDENTE não pode ser cancelado — caller mapeia 400 (AC-10). */
export class LancamentoNaoCancelavelError extends Error {
  constructor() {
    super("transacao_nao_cancelavel");
    this.name = "LancamentoNaoCancelavelError";
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export type LancamentoFiltros = {
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  metodo?: MetodoPagamento;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
};

/**
 * Lista os lançamentos financeiros (FIN-01/AC-1, FIN-11/AC-26/27) ordenados
 * por `data` desc, `id` desc. Filtros opcionais cumulativos: `tipo`, `status`,
 * período (`dataInicio`/`dataFim`, inclusivos) e busca por texto (ILIKE na
 * `descricao`). Leitura passa pela RLS `transactions_select_admin`
 * (`can_access('financeiro','ler')`, sem anon).
 */
export async function listarLancamentos(
  filtros: LancamentoFiltros = {}
): Promise<Lancamento[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .order("data", { ascending: false })
    .order("id", { ascending: false });

  if (filtros.tipo !== undefined) {
    query = query.eq("tipo", filtros.tipo);
  }
  if (filtros.status !== undefined) {
    query = query.eq("status", filtros.status);
  }
  if (filtros.dataInicio !== undefined) {
    query = query.gte("data", filtros.dataInicio);
  }
  if (filtros.dataFim !== undefined) {
    query = query.lte("data", filtros.dataFim);
  }
  if (filtros.busca !== undefined && filtros.busca.trim() !== "") {
    query = query.ilike("descricao", `%${filtros.busca.trim()}%`);
  }
  if (filtros.metodo !== undefined) {
    query = query.eq("metodo", filtros.metodo);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as Lancamento[];
}

/**
 * Busca um lançamento por id (FIN-01/AC-6). Inexistente →
 * `LancamentoNaoEncontradoError` (404, AC-11).
 */
export async function buscarLancamento(id: string): Promise<Lancamento> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new LancamentoNaoEncontradoError();
  }

  return data as Lancamento;
}

// ---------------------------------------------------------------------------
// Escrita (guarda `can_access('financeiro','escrever')` na RLS + route handler)
// ---------------------------------------------------------------------------

/**
 * Cria um lançamento (FIN-01/AC-3). Validação por campo (FIN-02/AC-4) fica no
 * route handler; aqui espera dados já validados. Default: `status='PENDENTE'`.
 * `created_by` vem da sessão do client (server-side já carrega o cookie);
 * sem sessão, fica NULL. Sucesso → 201 com o lançamento.
 */
export async function criarLancamento(
  dados: LancamentoDados
): Promise<Lancamento> {
  const supabase = await createServerClient();

  let createdBy: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    createdBy = user?.id ?? null;
  } catch {
    createdBy = null;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      metodo: dados.metodo,
      data: dados.data,
      status: dados.status ?? "PENDENTE",
      categoria: dados.categoria ?? null,
      observacoes: dados.observacoes ?? null,
      external_reference: dados.external_reference ?? null,
      cash_close_id: dados.cash_close_id ?? null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Lancamento;
}

/**
 * Atualiza apenas os campos enviados de um lançamento (FIN-05/AC-7).
 * Lançamento CONCILIADO → `LancamentoConciliadoError` (400, AC-8).
 * Inexistente → `LancamentoNaoEncontradoError` (404, AC-11).
 * Reanota `updated_at`.
 */
export async function atualizarLancamento(
  id: string,
  patch: LancamentoPatch
): Promise<Lancamento> {
  const supabase = await createServerClient();

  const { data: existente, error: erroLeitura } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (erroLeitura) {
    throw erroLeitura;
  }
  if (!existente) {
    throw new LancamentoNaoEncontradoError();
  }
  if (existente.status === "CONCILIADO") {
    throw new LancamentoConciliadoError();
  }

  const dados: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.descricao !== undefined) dados.descricao = patch.descricao;
  if (patch.valor !== undefined) dados.valor = patch.valor;
  if (patch.tipo !== undefined) dados.tipo = patch.tipo;
  if (patch.metodo !== undefined) dados.metodo = patch.metodo;
  if (patch.status !== undefined) dados.status = patch.status;
  if (patch.data !== undefined) dados.data = patch.data;
  if (patch.categoria !== undefined) dados.categoria = patch.categoria;
  if (patch.observacoes !== undefined) dados.observacoes = patch.observacoes;
  if (patch.external_reference !== undefined)
    dados.external_reference = patch.external_reference;
  if (patch.cash_close_id !== undefined) dados.cash_close_id = patch.cash_close_id;

  const { data, error } = await supabase
    .from("transactions")
    .update(dados)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Lancamento;
}

/**
 * Cancela um lançamento PENDENTE (soft-delete, FIN-05/AC-9): status →
 * `CANCELADO`. Lançamento não-PENDENTE → `LancamentoNaoCancelavelError`
 * (400, AC-10). Inexistente → `LancamentoNaoEncontradoError` (404, AC-11).
 */
export async function cancelarLancamento(id: string): Promise<Lancamento> {
  const supabase = await createServerClient();

  const { data: existente, error: erroLeitura } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (erroLeitura) {
    throw erroLeitura;
  }
  if (!existente) {
    throw new LancamentoNaoEncontradoError();
  }
  if (existente.status !== "PENDENTE") {
    throw new LancamentoNaoCancelavelError();
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Lancamento;
}

// ---------------------------------------------------------------------------
// Fechamento de caixa (FIN-09/FIN-10, AC-20..25)
// ---------------------------------------------------------------------------

/**
 * Calcula a prévia do fechamento de caixa (FIN-09/AC-21): totais de receitas e
 * despesas apenas das transações **CONCILIADO** sem `cash_close_id` dentro do
 * período (`data <= hoje`), saldo, e a quantidade de transações **PENDENTE**
 * (apenas informativo — não entram no fechamento). `haConciliados` indica se
 * há transações elegíveis (AC-23: sem nenhuma → caller responde 400).
 */
export type FechamentoPreview = {
  receitas: number;
  despesas: number;
  saldo: number;
  pendentes: number;
  haConciliados: boolean;
};

export async function previewFechamentoCaixa(): Promise<FechamentoPreview> {
  const supabase = await createServerClient();

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: transacoes, error } = await supabase
    .from("transactions")
    .select("tipo, status, valor, cash_close_id")
    .lte("data", hoje);

  if (error) {
    throw error;
  }

  const lista = (transacoes ?? []) as {
    tipo: string;
    status: string;
    valor: number;
    cash_close_id: string | null;
  }[];

  const conciliadas = lista.filter(
    (t) => t.status === "CONCILIADO" && t.cash_close_id === null
  );
  const receitas = conciliadas
    .filter((t) => t.tipo === "RECEITA")
    .reduce((soma, t) => soma + t.valor, 0);
  const despesas = conciliadas
    .filter((t) => t.tipo === "DESPESA")
    .reduce((soma, t) => soma + t.valor, 0);
  const pendentes = lista.filter((t) => t.status === "PENDENTE").length;

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    pendentes,
    haConciliados: conciliadas.length > 0,
  };
}

/**
 * Fecha o caixa: agrega as transações CONCILIADO com `cash_close_id` nulo e
 * `data <= hoje`, cria um snapshot imutável em `cash_closes` e marca as
 * transações incluídas com o `cash_close_id`. Sem transações CONCILIADO →
 * retorna `null` (caller mapeia 400 `sem_transacoes_para_fechar`, AC-23).
 * `saldo` é GENERATED COLUMN — após o INSERT, faz SELECT pelo id para trazer
 * o registro completo (FE-10 do design).
 */
export async function fecharCaixa(): Promise<FechamentoCaixa | null> {
  const supabase = await createServerClient();

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: conciliadas, error: erroAgregacao } = await supabase
    .from("transactions")
    .select("tipo, valor")
    .eq("status", "CONCILIADO")
    .is("cash_close_id", null)
    .lte("data", hoje);

  if (erroAgregacao) {
    throw erroAgregacao;
  }

  const lista = (conciliadas ?? []) as { tipo: string; valor: number }[];
  if (lista.length === 0) {
    return null;
  }

  const totalReceitas = lista
    .filter((t) => t.tipo === "RECEITA")
    .reduce((soma, t) => soma + t.valor, 0);
  const totalDespesas = lista
    .filter((t) => t.tipo === "DESPESA")
    .reduce((soma, t) => soma + t.valor, 0);

  let createdBy: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    createdBy = user?.id ?? null;
  } catch {
    createdBy = null;
  }

  const { data: fechamento, error: erroInsert } = await supabase
    .from("cash_closes")
    .insert({
      data_fechamento: hoje,
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      qtd_transacoes: lista.length,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (erroInsert) {
    throw erroInsert;
  }

  const { error: erroMarcacao } = await supabase
    .from("transactions")
    .update({ cash_close_id: fechamento.id })
    .eq("status", "CONCILIADO")
    .is("cash_close_id", null)
    .lte("data", hoje);

  if (erroMarcacao) {
    throw erroMarcacao;
  }

  // GENERATED COLUMN `saldo` pode não vir no INSERT RETURNING — SELECT pelo id.
  const { data: snapshot, error: erroSnapshot } = await supabase
    .from("cash_closes")
    .select("*")
    .eq("id", fechamento.id)
    .maybeSingle();

  if (erroSnapshot) {
    throw erroSnapshot;
  }
  if (!snapshot) {
    throw new LancamentoNaoEncontradoError();
  }

  return snapshot as FechamentoCaixa;
}

/**
 * Lista os fechamentos de caixa anteriores (FIN-09/AC-20/21/22), ordenados por
 * `created_at` desc. Leitura através da RLS `cash_closes_select_admin`.
 */
export async function listarFechamentos(): Promise<FechamentoCaixa[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("cash_closes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FechamentoCaixa[];
}