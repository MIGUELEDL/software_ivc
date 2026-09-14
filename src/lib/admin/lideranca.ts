import { createServerClient } from "@/lib/supabase/server";
import { validarFoto } from "@/lib/admin/validacao";

export type Igreja = {
  id: string;
  name: string;
  short_name: string;
  cnpj: string;
  address: string;
  city: string;
  founded_date: string | null;
  created_at: string;
  updated_at: string;
};

export type IgrejaDados = {
  name: string;
  short_name: string;
  cnpj: string;
  address: string;
  city: string;
  founded_date: string | null;
};

export type LiderStatus = "ATIVO" | "INATIVO";

export type Lider = {
  id: string;
  church_id: string;
  name: string;
  role: string;
  photo_url: string | null;
  order: number;
  status: LiderStatus;
  created_at: string;
  updated_at: string;
};

export type LiderDados = {
  name: string;
  role: string;
  order?: number;
};

export type LiderPatch = {
  name?: string;
  role?: string;
  order?: number;
  status?: LiderStatus;
};

// ---------------------------------------------------------------------------
// Exceções de domínio (padrão membros.ts — caller mapeia HTTP 404/400/413).
// ---------------------------------------------------------------------------

/** Igreja não encontrada — caller mapeia 404 (IGR-10/17). */
export class IgrejaNaoEncontradaError extends Error {
  constructor() {
    super("igreja_nao_encontrada");
    this.name = "IgrejaNaoEncontradaError";
  }
}

/** Líder não encontrado — caller mapeia 404 (IGR-17/18 edge). */
export class LiderNaoEncontradoError extends Error {
  constructor() {
    super("lider_nao_encontrado");
    this.name = "LiderNaoEncontradoError";
  }
}

/** Status inválido na atualização de líder (IGR-19). */
export class StatusLiderInvalidoError extends Error {
  constructor(status: string) {
    super(`status_invalido: ${status}`);
    this.name = "StatusLiderInvalidoError";
  }
}

/** Extensão/tipo de foto inválido — caller mapeia 400 (IGR-21). */
export class FotoTipoInvalidoError extends Error {
  constructor() {
    super("foto_tipo_invalido");
    this.name = "FotoTipoInvalidoError";
  }
}

/** Tamanho de foto excede 2 MB — caller mapeia 413 (IGR-21). */
export class FotoTamanhoInvalidoError extends Error {
  constructor() {
    super("foto_tamanho_invalido");
    this.name = "FotoTamanhoInvalidoError";
  }
}

// ---------------------------------------------------------------------------
// Igrejas
// ---------------------------------------------------------------------------

/**
 * Lista as igrejas ordenadas por `created_at` asc (IGR-08). Leitura passa pela
 * RLS `churches_select_public` (anon + authenticated).
 */
export async function listarIgrejas(): Promise<Igreja[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Igreja[];
}

/**
 * Busca uma igreja por id. Retorna null quando não existe (sem lançar) para o
 * caller mapear 404 (IGR-10/17).
 */
export async function getIgreja(id: string): Promise<Igreja | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Igreja | null) ?? null;
}

/**
 * Cria uma igreja (IGR-05). Validação por campo (IGR-06) fica no route handler;
 * aqui espera dados já validados. Sucesso → 201 com a igreja.
 */
export async function criarIgreja(dados: IgrejaDados): Promise<Igreja> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("churches")
    .insert({
      name: dados.name,
      short_name: dados.short_name,
      cnpj: dados.cnpj,
      address: dados.address,
      city: dados.city,
      founded_date: dados.founded_date ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Igreja;
}

/**
 * Atualiza os campos enviados de uma igreja (IGR-09). 404 se não existir
 * (IGR-10). Reanota `updated_at`.
 */
export async function atualizarIgreja(
  id: string,
  dados: Partial<IgrejaDados>
): Promise<Igreja> {
  const existente = await getIgreja(id);
  if (!existente) throw new IgrejaNaoEncontradaError();

  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dados.name !== undefined) patch.name = dados.name;
  if (dados.short_name !== undefined) patch.short_name = dados.short_name;
  if (dados.cnpj !== undefined) patch.cnpj = dados.cnpj;
  if (dados.address !== undefined) patch.address = dados.address;
  if (dados.city !== undefined) patch.city = dados.city;
  if (dados.founded_date !== undefined) patch.founded_date = dados.founded_date;

  const { data, error } = await supabase
    .from("churches")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Igreja;
}

/**
 * Exclui uma igreja em cascata (IGR-11). 404 se não existir. A guarda de
 * `SUPER_ADMIN` fica no route handler; a RLS (`churches_delete_super_admin`)
 * é o backstop.
 */
export async function excluirIgreja(id: string): Promise<void> {
  const existente = await getIgreja(id);
  if (!existente) throw new IgrejaNaoEncontradaError();

  const supabase = await createServerClient();
  const { error } = await supabase.from("churches").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Líderes
// ---------------------------------------------------------------------------

/**
 * Lista os líderes de uma igreja ordenados por `order` asc e `name` asc
 * (gestão admin).
 */
export async function listarLideres(igrejaId: string): Promise<Lider[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("leaders")
    .select("*")
    .eq("church_id", igrejaId)
    .order("order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Lider[];
}

/**
 * Busca um líder por id. Retorna null quando não existe (sem lançar).
 */
export async function getLider(id: string): Promise<Lider | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("leaders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Lider | null) ?? null;
}

/**
 * Retorna todos os líderes ATIVOS ordenados por `order` asc (portal, IGR-22).
 * Leitura pública via RLS `leaders_select_public` (anon + authenticated).
 */
export async function listarLideresAtivos(): Promise<Lider[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("leaders")
    .select("*")
    .eq("status", "ATIVO")
    .order("order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Lider[];
}

/**
 * Cria um líder vinculado a uma igreja com `status='ATIVO'` (IGR-16).
 * Igreja inexistente → `IgrejaNaoEncontradaError` (IGR-17).
 */
export async function criarLider(
  igrejaId: string,
  dados: LiderDados
): Promise<Lider> {
  const igreja = await getIgreja(igrejaId);
  if (!igreja) throw new IgrejaNaoEncontradaError();

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("leaders")
    .insert({
      church_id: igrejaId,
      name: dados.name,
      role: dados.role,
      order: dados.order ?? 0,
      status: "ATIVO",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Lider;
}

/**
 * Atualiza campos de um líder (IGR-18), incluindo `status` (soft-delete,
 * IGR-19). Líder inexistente → `LiderNaoEncontradoError` (404). Status
 * fora de `ATIVO`/`INATIVO` → `StatusLiderInvalidoError`.
 */
export async function atualizarLider(
  id: string,
  dados: LiderPatch
): Promise<Lider> {
  const existente = await getLider(id);
  if (!existente) throw new LiderNaoEncontradoError();

  if (
    dados.status !== undefined &&
    dados.status !== "ATIVO" &&
    dados.status !== "INATIVO"
  ) {
    throw new StatusLiderInvalidoError(dados.status);
  }

  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (dados.name !== undefined) patch.name = dados.name;
  if (dados.role !== undefined) patch.role = dados.role;
  if (dados.order !== undefined) patch.order = dados.order;
  if (dados.status !== undefined) patch.status = dados.status;

  const { data, error } = await supabase
    .from("leaders")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Lider;
}

/**
 * Faz upload da foto do líder no bucket `fotos-lideranca` (IGR-20), com
 * upsert (re-upload sobrescreve — design, sec. 8). Path:
 * `lideranca/{leaderId}/foto.{ext}`. Líder inexistente → 404;
 * tipo/tamanho inválido → erros específicos mapeados como 400/413 (IGR-21).
 * Retorna a URL pública da foto para persistir em `leaders.photo_url`.
 */
export async function subirFotoLider(
  id: string,
  file: File
): Promise<{ photo_url: string }> {
  const existente = await getLider(id);
  if (!existente) throw new LiderNaoEncontradoError();

  const resultado = validarFoto(file);
  if (!resultado.ok) {
    if (resultado.motivo === "tipo") throw new FotoTipoInvalidoError();
    throw new FotoTamanhoInvalidoError();
  }

  const supabase = await createServerClient();
  const path = `lideranca/${id}/foto.${resultado.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-lideranca")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from("fotos-lideranca")
    .getPublicUrl(path);

  const photo_url = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("leaders")
    .update({ photo_url, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    throw updateError;
  }

  return { photo_url };
}