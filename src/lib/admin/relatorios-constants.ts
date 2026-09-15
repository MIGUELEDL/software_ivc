/** Categorias de documentos por módulo (REL-08) — fonte única para UI, validação e CHECK do banco. */
export const DOCUMENT_CATEGORIES = [
  "FINANCEIRO",
  "MEMBROS",
  "EVENTOS",
  "PATRIMONIO",
  "IGREJAS",
  "GERAL",
] as const;

export type DocumentoCategoria = (typeof DOCUMENT_CATEGORIES)[number];

/** Whitelist de MIME aceitos no upload (REL-10) — espelha `allowed_mime_types` do bucket `documentos`. */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
] as const;

/** Limite de tamanho por arquivo (REL-10) — espelha `file_size_limit` do bucket `documentos`. */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export type Documento = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentoCategoria;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
};

/** Payload de upload (REL-09) — descrição é opcional. */
export type DocumentoDados = {
  title: string;
  category: DocumentoCategoria;
  description?: string | null;
};

/** Tipos de relatório exportáveis (REL-02/03/04/05) — valor do param `tipo`. */
export const RELATORIO_TIPOS = ["financeiro", "membros", "eventos", "patrimonio"] as const;
export type RelatorioTipo = (typeof RELATORIO_TIPOS)[number];