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