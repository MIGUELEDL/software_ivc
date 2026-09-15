import { createServerClient } from "@/lib/supabase/server";

/** Categorias fixas do inventário (PAT-01) — fonte única para UI e validação. */
export const ASSET_CATEGORIES = [
  "AUDIO",
  "VIDEO",
  "INSTRUMENTO",
  "MOBILIA",
  "EQUIPAMENTO",
  "RELIGIOSO",
  "OUTRO",
] as const;

export type AssetCategoria = (typeof ASSET_CATEGORIES)[number];
export type AssetStatus = "ATIVO" | "INATIVO";

export type Asset = {
  id: string;
  name: string;
  category: AssetCategoria;
  numero_patrimonio: string | null;
  location: string | null;
  acquisition_value: number | null;
  acquisition_date: string | null;
  responsible: string | null;
  status: AssetStatus;
  observations: string | null;
  created_at: string;
  updated_at: string;
};

/** Payload de criação (POST) — `status` é sempre 'ATIVO' no create (PAT-04). */
export type AssetDados = {
  name: string;
  category: AssetCategoria;
  numero_patrimonio?: string | null;
  location?: string | null;
  acquisition_value?: number | null;
  acquisition_date?: string | null;
  responsible?: string | null;
  observations?: string | null;
};

/** Payload de edição (PATCH parcial) — inclui `status` (baixa, PAT-08/10). */
export type AssetPatch = {
  name?: string;
  category?: AssetCategoria;
  numero_patrimonio?: string | null;
  location?: string | null;
  acquisition_value?: number | null;
  acquisition_date?: string | null;
  responsible?: string | null;
  observations?: string | null;
  status?: AssetStatus;
};

// ---------------------------------------------------------------------------
// Exceções de domínio (padrão eventos.ts — caller mapeia HTTP 404).
// ---------------------------------------------------------------------------

/** Bem não encontrado — caller mapeia 404 (PAT-09). */
export class BemNaoEncontradoError extends Error {
  constructor() {
    super("bem_nao_encontrado");
    this.name = "BemNaoEncontradoError";
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Lista todos os bens ordenados por `name` asc (admin — PAT-07), incluindo
 * `status='INATIVO'`. Leitura passa pela RLS `assets_select_admin`
 * (`can_access('patrimonio','ler')`, sem anon — PAT-02/11).
 */
export async function listarAssets(): Promise<Asset[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Asset[];
}

// ---------------------------------------------------------------------------
// Escrita (guarda `can_access('patrimonio','escrever')` na RLS + route handler)
// ---------------------------------------------------------------------------

/**
 * Cria um bem (PAT-04). Validação por campo (PAT-05) fica no route handler;
 * aqui espera dados já validados. Default: `status='ATIVO'`. Sucesso → 201 com
 * o asset. Tombo duplicado propaga o code `23505` (route converte → 409).
 */
export async function criarAsset(dados: AssetDados): Promise<Asset> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("assets")
    .insert({
      name: dados.name,
      category: dados.category,
      numero_patrimonio: dados.numero_patrimonio ?? null,
      location: dados.location ?? null,
      acquisition_value: dados.acquisition_value ?? null,
      acquisition_date: dados.acquisition_date ?? null,
      responsible: dados.responsible ?? null,
      observations: dados.observations ?? null,
      status: "ATIVO",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Asset;
}

/**
 * Atualiza apenas os campos enviados de um bem (PAT-08), incluindo `status`
 * `ATIVO`/`INATIVO` (soft-delete/baixa — PAT-10). Bem inexistente →
 * `BemNaoEncontradoError` (404, PAT-09). Reanota `updated_at`.
 */
export async function atualizarAsset(
  id: string,
  dados: AssetPatch
): Promise<Asset> {
  const supabase = await createServerClient();

  const { data: existente, error: erroLeitura } = await supabase
    .from("assets")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (erroLeitura) {
    throw erroLeitura;
  }
  if (!existente) {
    throw new BemNaoEncontradoError();
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dados.name !== undefined) patch.name = dados.name;
  if (dados.category !== undefined) patch.category = dados.category;
  if (dados.numero_patrimonio !== undefined)
    patch.numero_patrimonio = dados.numero_patrimonio;
  if (dados.location !== undefined) patch.location = dados.location;
  if (dados.acquisition_value !== undefined)
    patch.acquisition_value = dados.acquisition_value;
  if (dados.acquisition_date !== undefined)
    patch.acquisition_date = dados.acquisition_date;
  if (dados.responsible !== undefined) patch.responsible = dados.responsible;
  if (dados.observations !== undefined) patch.observations = dados.observations;
  if (dados.status !== undefined) patch.status = dados.status;

  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Asset;
}