/** Tipos fixos do módulo financeiro (FIN-01) — fonte única para UI e validação. */
export const TIPOS_LANCAMENTO = ["RECEITA", "DESPESA"] as const;
export const STATUS_LANCAMENTO = ["PENDENTE", "CONCILIADO", "CANCELADO"] as const;
export const METODOS_PAGAMENTO = [
  "PIX",
  "CARTAO",
  "DINHEIRO",
  "TRANSFERENCIA",
] as const;

export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];
export type StatusLancamento = (typeof STATUS_LANCAMENTO)[number];
export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  metodo: MetodoPagamento;
  status: StatusLancamento;
  categoria: string | null;
  observacoes: string | null;
  data: string;
  external_reference: string | null;
  webhook_event_id: string | null;
  cash_close_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Payload de criação (POST) — `status` é sempre 'PENDENTE' no create (FIN-01). */
export type LancamentoDados = {
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  metodo: MetodoPagamento;
  data: string;
  status?: StatusLancamento;
  categoria?: string | null;
  observacoes?: string | null;
  external_reference?: string | null;
  cash_close_id?: string | null;
};

/** Payload de edição (PATCH parcial) — todos os campos opcionais (FIN-05). */
export type LancamentoPatch = {
  descricao?: string;
  valor?: number;
  tipo?: TipoLancamento;
  metodo?: MetodoPagamento;
  status?: StatusLancamento;
  data?: string;
  categoria?: string | null;
  observacoes?: string | null;
  external_reference?: string | null;
  cash_close_id?: string | null;
};

/** Fechamento de caixa (snapshot imutável, FIN-10). */
export type FechamentoCaixa = {
  id: string;
  data_fechamento: string;
  total_receitas: number;
  total_despesas: number;
  saldo: number;
  qtd_transacoes: number;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
};

/** Payload de evento de webhook (FIN-06/07) logado em `webhook_events`. */
export type WebhookEventPayload = {
  id: string | null;
  event_id: string;
  event_type: string;
  action?: string;
  payload: unknown;
  processed: boolean;
  created_at: string;
};