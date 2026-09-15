import { randomUUID } from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";
import { listarLancamentos, type LancamentoFiltros } from "@/lib/admin/financeiro";
import { listMembros } from "@/lib/admin/membros";
import { listarEventos } from "@/lib/admin/eventos";
import { listarAssets } from "@/lib/admin/assets";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_MAX_BYTES,
  type Documento,
  type DocumentoDados,
  type DocumentoCategoria,
} from "@/lib/admin/relatorios-constants";

const SEPARADOR = ";";

// ---------------------------------------------------------------------------
// Exceções de domínio (padrão assets.ts/financeiro.ts — caller mapeia HTTP).
// ---------------------------------------------------------------------------

/** Título obrigatório não-vazio — caller mapeia 400 (REL-09/10). */
export class DocumentoTituloInvalidoError extends Error {
  constructor() {
    super("titulo_invalido");
    this.name = "DocumentoTituloInvalidoError";
  }
}

/** Categoria fora do enum fixo — caller mapeia 400 (REL-09/10). */
export class DocumentoCategoriaInvalidaError extends Error {
  constructor() {
    super("categoria_invalida");
    this.name = "DocumentoCategoriaInvalidaError";
  }
}

/** MIME fora da whitelist do bucket — caller mapeia 400 (REL-10). */
export class DocumentoTipoInvalidoError extends Error {
  constructor() {
    super("tipo_invalido");
    this.name = "DocumentoTipoInvalidoError";
  }
}

/** Tamanho zero ou acima do limite (10MB) — caller mapeia 400/413 (REL-10). */
export class DocumentoTamanhoInvalidoError extends Error {
  constructor() {
    super("tamanho_invalido");
    this.name = "DocumentoTamanhoInvalidoError";
  }
}

/** Documento inexistente — caller mapeia 404 (REL-15/18). */
export class DocumentoNaoEncontradoError extends Error {
  constructor() {
    super("documento_nao_encontrado");
    this.name = "DocumentoNaoEncontradoError";
  }
}

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.text": "odt",
};

/**
 * Escapa um campo CSV conforme RFC 4180 na variante PT-BR (REL-08): campos
 * com `"`, `;` ou quebra de linha são envolvidos em aspas duplas e aspas
 * internas são dobradas. Valores nulos/undefined viram string vazia.
 */
export function escapaCSV(valor: unknown): string {
  const texto = valor ?? "";
  const str = String(texto);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Linha de totais do CSV financeiro (REL-03) — última linha agregada. */
function linhaTotalCSV(receitas: number, despesas: number, saldo: number): string {
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");
  return [
    "TOTAIS",
    `RECEITAS ${fmt(receitas)};DESPESAS ${fmt(despesas)};SALDO ${fmt(saldo)}`,
  ].join(SEPARADOR);
}

/**
 * Exporta o relatório financeiro (REL-02) — CSV `;` + BOM UTF-8, uma linha
 * por lançamento ordenado por `data` desc (a listagem já ordena), colunas
 * Data;Tipo;Metodo;Status;Categoria;Descricao;Valor. Appenda a linha de
 * totais Receitas/Despesas/Saldo dos lançamentos filtrados (REL-03). O
 * filtro de período chega via `LancamentoFiltros` (`dataInicio`/`dataFim`).
 */
export async function gerarCSVFinanceiro(
  filtros: LancamentoFiltros = {}
): Promise<{ csv: string; filename: string }> {
  const lancamentos = await listarLancamentos(filtros);

  const header = ["Data", "Tipo", "Metodo", "Status", "Categoria", "Descricao", "Valor"];
  const linhas = lancamentos.map((l) =>
    [
      escapaCSV(l.data),
      escapaCSV(l.tipo),
      escapaCSV(l.metodo),
      escapaCSV(l.status),
      escapaCSV(l.categoria),
      escapaCSV(l.descricao),
      escapaCSV(l.valor.toFixed(2).replace(".", ",")),
    ].join(SEPARADOR)
  );

  const receitas = lancamentos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const despesas = lancamentos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((soma, l) => soma + Number(l.valor), 0);

  const csv = [
    `\uFEFF${header.join(SEPARADOR)}`,
    ...linhas,
    linhaTotalCSV(receitas, despesas, receitas - despesas),
  ].join("\r\n");

  return {
    csv,
    filename: `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

/**
 * Exporta o relatório de membros (REL-04) — CSV `;` + BOM UTF-8, colunas
 * Matricula;Nome;Status;Nascimento;Whatsapp;Cidade, ordenado por `nome` asc
 * (a listagem já ordena). Lista completa, sem filtro de período.
 */
export async function gerarCSVMembros(
  filtros: import("@/lib/admin/membros").MembroFiltros = {}
): Promise<{ csv: string; filename: string }> {
  const membros = await listMembros(filtros);

  const header = ["Matricula", "Nome", "Status", "Nascimento", "Whatsapp", "Cidade"];
  const linhas = membros.map((m) =>
    [
      escapaCSV(m.matricula),
      escapaCSV(m.nome),
      escapaCSV(m.status),
      escapaCSV(m.nascimento),
      escapaCSV(m.whatsapp),
      escapaCSV(m.cidade),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-membros.csv",
  };
}

/**
 * Exporta o relatório de eventos (REL-05) — CSV `;` + BOM UTF-8, colunas
 * Titulo;Data;Hora;Local;Visivel;Status, ordenado por `date` desc (a listagem
 * já ordena). Lista completa.
 */
export async function gerarCSVEventos(): Promise<{ csv: string; filename: string }> {
  const eventos = await listarEventos();

  const header = ["Titulo", "Data", "Hora", "Local", "Visivel", "Status"];
  const linhas = eventos.map((e) =>
    [
      escapaCSV(e.title),
      escapaCSV(e.date),
      escapaCSV(e.time),
      escapaCSV(e.location),
      escapaCSV(e.visivel),
      escapaCSV(e.status),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-eventos.csv",
  };
}

/**
 * Exporta o relatório de patrimônio (REL-06) — CSV `;` + BOM UTF-8, colunas
 * Nome;Categoria;Tombo;Local;Valor Aquisicao;Data Aquisicao;Responsavel;
 * Status, ordenado por `name` asc (a listagem já ordena). Lista completa.
 */
export async function gerarCSVPatrimonio(): Promise<{ csv: string; filename: string }> {
  const assets = await listarAssets();

  const header = [
    "Nome",
    "Categoria",
    "Tombo",
    "Local",
    "Valor Aquisicao",
    "Data Aquisicao",
    "Responsavel",
    "Status",
  ];
  const linhas = assets.map((a) =>
    [
      escapaCSV(a.name),
      escapaCSV(a.category),
      escapaCSV(a.numero_patrimonio),
      escapaCSV(a.location),
      escapaCSV(a.acquisition_value?.toFixed(2).replace(".", ",") ?? ""),
      escapaCSV(a.acquisition_date),
      escapaCSV(a.responsible),
      escapaCSV(a.status),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-patrimonio.csv",
  };
}

// ---------------------------------------------------------------------------
// Documentos (REL-09/11/13/14/16) — metadados em `documents` + arquivo no
// bucket privado `documentos`. Leitura/escrita passam pela RLS
// `documents_*_admin` (`can_access('relatorios', ...)`, sem anon).
// ---------------------------------------------------------------------------

/**
 * Lista os documentos (REL-11) ordenados por `created_at` desc (novos
 * primeiro), com filtro opcional por categoria. Sirve a GET.
 */
export async function listarDocumentos(
  categoria?: DocumentoCategoria
): Promise<Documento[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (categoria !== undefined) {
    query = query.eq("category", categoria);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as Documento[];
}

/** Busca um documento por id — null quando inexistente (p/ 404, REL-15). */
export async function buscarDocumento(id: string): Promise<Documento | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Documento | null) ?? null;
}

/**
 * Sobe um documento (REL-09/10/13): valida title/categoria/mime/tamanho →
 * upload no bucket `documentos` com path `documentos/{uuid}.{ext}` (nunca o
 * nome do usuário — design) → insert do metadado. Se o insert falhar, remove
 * o objeto do storage (rollback evita órfão, REL-13). Sucesso → documento.
 */
export async function subirDocumento(
  dados: DocumentoDados,
  file: File
): Promise<Documento> {
  const titulo = dados.title.trim();
  if (!titulo) {
    throw new DocumentoTituloInvalidoError();
  }

  const categoria = dados.category;
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(categoria)) {
    throw new DocumentoCategoriaInvalidaError();
  }

  const ext = MIME_EXT[file.type];
  if (!ext || !(DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new DocumentoTipoInvalidoError();
  }
  if (file.size === 0 || file.size > DOCUMENT_MAX_BYTES) {
    throw new DocumentoTamanhoInvalidoError();
  }

  const supabase = await createServerClient();
  const path = `documentos/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  let uploadedBy: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uploadedBy = user?.id ?? null;
  } catch {
    uploadedBy = null;
  }

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      title: titulo,
      description: dados.description?.trim() || null,
      category: categoria,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (insertError) {
    const { error: removeError } = await supabase.storage
      .from("documentos")
      .remove([path]);
    if (removeError) {
      console.error("rollback storage remove", path, removeError);
    }
    throw insertError;
  }

  return data as Documento;
}

/**
 * Remove um documento (REL-15/16): sem registro → `DocumentoNaoEncontradoError`
 * (404); senão remove a linha primeiro e, se o DELETE for ok, remove o objeto
 * do storage (ordem segura — design: remove storage só se row ok).
 */
export async function removerDocumento(id: string): Promise<void> {
  const supabase = await createServerClient();

  const existente = await buscarDocumento(id);
  if (!existente) {
    throw new DocumentoNaoEncontradoError();
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw deleteError;
  }

  const { error: removeStorageError } = await supabase.storage
    .from("documentos")
    .remove([existente.file_path]);

  if (removeStorageError) {
    console.error("storage remove", existente.file_path, removeStorageError);
  }
}

/**
 * Gera URL assinada de download (REL-14) — signed URL de 60s no bucket
 * privado `documentos`. Documento inexistente → `DocumentoNaoEncontradoError`
 * (404). Falha ao gerar a URL → erro do storage (500).
 */
export async function urlDownloadDocumento(id: string): Promise<string> {
  const existente = await buscarDocumento(id);
  if (!existente) {
    throw new DocumentoNaoEncontradoError();
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(existente.file_path, 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}