import { createServerClient } from "@/lib/supabase/server";

export type EventoStatus = "ATIVO" | "INATIVO";

export type Evento = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string;
  visivel: boolean;
  status: EventoStatus;
  created_at: string;
  updated_at: string;
};

export type EventoDados = {
  title: string;
  description?: string | null;
  date: string;
  time: string;
  location: string;
  visivel?: boolean;
};

export type EventoPatch = {
  title?: string;
  description?: string | null;
  date?: string;
  time?: string;
  location?: string;
  visivel?: boolean;
  status?: EventoStatus;
};

// ---------------------------------------------------------------------------
// Exceções de domínio (padrão lideranca.ts — caller mapeia HTTP 404).
// ---------------------------------------------------------------------------

/** Evento não encontrado — caller mapeia 404 (EVT-09). */
export class EventoNaoEncontradoError extends Error {
  constructor() {
    super("evento_nao_encontrado");
    this.name = "EventoNaoEncontradoError";
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Busca um evento por id (interno). Retorna null quando não existe (sem
 * lançar) para o caller mapear 404 (EVT-09).
 */
async function getEvento(id: string): Promise<Evento | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Evento | null) ?? null;
}

/**
 * Lista todos os eventos ordenados por `date` desc (admin — EVT-07), incluindo
 * `visivel=false` e `status='INATIVO'`. Leitura passa pela RLS
 * `events_select_public` (anon + authenticated).
 */
export async function listarEventos(): Promise<Evento[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Evento[];
}

/**
 * Lista os eventos públicos (portal — EVT-12): somente `visivel=true` e
 * `status='ATIVO'`, ordenados por `date` asc (próximos primeiro).
 */
export async function listarEventosPublicos(): Promise<Evento[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("visivel", true)
    .eq("status", "ATIVO")
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Evento[];
}

/**
 * Busca um evento público por id (EVT-13/14). Só retorna quando
 * `visivel=true` e `status='ATIVO'`; inexistente, oculto ou INATIVO → null
 * (o caller mapeia 404 — não expor ocultos).
 */
export async function buscarEventoPublico(id: string): Promise<Evento | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("visivel", true)
    .eq("status", "ATIVO")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Evento | null) ?? null;
}

// ---------------------------------------------------------------------------
// Escrita (guarda `can_access('eventos','escrever')` na RLS + route handler)
// ---------------------------------------------------------------------------

/**
 * Cria um evento (EVT-04). Validação por campo (EVT-05) fica no route
 * handler; aqui espera dados já validados. Defaults: `status='ATIVO'` e
 * `visivel=true`. Sucesso → 201 com o evento.
 */
export async function criarEvento(dados: EventoDados): Promise<Evento> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: dados.title,
      description: dados.description ?? null,
      date: dados.date,
      time: dados.time,
      location: dados.location,
      visivel: dados.visivel ?? true,
      status: "ATIVO",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Evento;
}

/**
 * Atualiza apenas os campos enviados de um evento (EVT-08), incluindo
 * `visivel` (EVT-11) e `status` (soft-delete — EVT-10). Evento inexistente →
 * `EventoNaoEncontradoError` (404, EVT-09). Reanota `updated_at`.
 */
export async function atualizarEvento(
  id: string,
  dados: EventoPatch
): Promise<Evento> {
  const existente = await getEvento(id);
  if (!existente) throw new EventoNaoEncontradoError();

  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dados.title !== undefined) patch.title = dados.title;
  if (dados.description !== undefined) patch.description = dados.description;
  if (dados.date !== undefined) patch.date = dados.date;
  if (dados.time !== undefined) patch.time = dados.time;
  if (dados.location !== undefined) patch.location = dados.location;
  if (dados.visivel !== undefined) patch.visivel = dados.visivel;
  if (dados.status !== undefined) patch.status = dados.status;

  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Evento;
}