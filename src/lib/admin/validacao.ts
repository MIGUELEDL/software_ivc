/**
 * Validações compartilhadas dos route handlers `/api/admin/membros/*`.
 * Nascimento usa os mesmos bounds do painel-membro (perfil/route.ts:13-31):
 * YYYY-MM-DD válida, não futura, máx. 120 anos.
 */
import { ASSET_CATEGORIES as AssetCategoriasFixo } from "@/lib/admin/asset-types";
import type { AssetCategoria, AssetStatus } from "@/lib/admin/asset-types";

export function validarNascimento(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) {
    return false;
  }
  const agora = new Date();
  if (data > agora) {
    return false;
  }
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 120);
  if (data < limite) {
    return false;
  }
  return true;
}

/** Formato mínimo de e-mail para criação de conta auth (ADMINMEM-10/edge). */
export function validarEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/** UF opcional: 2 letras (check do banco, 0006, como backstop). */
export function validarUf(valor: string): boolean {
  return /^[A-Za-z]{2}$/.test(valor);
}

// ---- Igrejas/Liderança (RF-023) ------------------------------------------------

/** CNPJ sem máscara: 14 dígitos numéricos (IGR-06). */
export function validarCnpj(valor: string): boolean {
  return /^\d{14}$/.test(valor);
}

/** Limite máximo de foto para upload (2 MB, padrão 0003). */
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

const FOTO_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ValidarFotoResultado =
  | { ok: true; ext: string }
  | { ok: false; motivo: "tipo" | "tamanho" };

/**
 * Valida tipo MIME e tamanho de arquivo de foto para upload em buckets
 * `fotos-membros` / `fotos-lideranca` (padrão 0003/AD-014).
 * Aceita image/jpeg, image/png, image/webp com até 2 MB.
 */
export function validarFoto(file: File): ValidarFotoResultado {
  const ext = FOTO_MIME_EXT[file.type];
  if (!ext) return { ok: false, motivo: "tipo" };
  if (file.size === 0 || file.size > FOTO_MAX_BYTES)
    return { ok: false, motivo: "tamanho" };
  return { ok: true, ext };
}

export type EnderecoForm = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

/** Lê os 6 campos opcionais de endereço do FormData (vazio → null). */
export function lerEndereco(formData: FormData): EnderecoForm {
  const ler = (campo: string) => {
    const valor = String(formData.get(campo) ?? "").trim();
    return valor === "" ? null : valor;
  };
  return {
    logradouro: ler("logradouro"),
    numero: ler("numero"),
    bairro: ler("bairro"),
    cidade: ler("cidade"),
    uf: ler("uf"),
    cep: ler("cep"),
  };
}

// ---- Eventos (RF-024) ------------------------------------------------------

/** Data YYYY-MM-DD real (não apenas formato) para `events.date` (EVT-05). */
export function validarDataEvento(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  return !Number.isNaN(new Date(`${valor}T00:00:00`).getTime());
}

export type EventoValidado = {
  title?: string;
  description?: string | null;
  date?: string;
  time?: string;
  location?: string;
  visivel?: boolean;
  status?: "ATIVO" | "INATIVO";
};

export type ValidarEventoResultado =
  | { ok: true; dados: EventoValidado }
  | { ok: false; campos: Record<string, string> };

/**
 * Valida payload de evento por campo (EVT-05/08). Modo `completo` (POST)
 * exige os obrigatórios `title`/`date`/`time`/`location`; modo `parcial`
 * (PATCH) valida apenas campos enviados. Regras: `date` `YYYY-MM-DD` real,
 * `time` `HH:MM` (formato visual RF-006), `visivel` booleano quando enviado,
 * `status` `ATIVO`/`INATIVO` quando enviado.
 */
export function validarEvento(
  body: Record<string, unknown>,
  modo: "completo" | "parcial" = "completo"
): ValidarEventoResultado {
  const campos: Record<string, string> = {};
  const dados: EventoValidado = {};

  const title = body.title;
  if (title !== undefined || modo === "completo") {
    const valor = String(title ?? "").trim();
    if (!valor) {
      campos.title = "Informe o título do evento.";
    } else {
      dados.title = valor;
    }
  }

  if (body.description !== undefined) {
    const valor = String(body.description).trim();
    dados.description = valor === "" ? null : valor;
  }

  const date = body.date;
  if (date !== undefined || modo === "completo") {
    const valor = String(date ?? "").trim();
    if (!valor) {
      campos.date = "Informe a data do evento.";
    } else if (!validarDataEvento(valor)) {
      campos.date = "Data inválida (use AAAA-MM-DD).";
    } else {
      dados.date = valor;
    }
  }

  const time = body.time;
  if (time !== undefined || modo === "completo") {
    const valor = String(time ?? "").trim();
    if (!valor) {
      campos.time = "Informe a hora do evento.";
    } else if (!/^\d{2}:\d{2}$/.test(valor)) {
      campos.time = "Hora inválida (use HH:MM).";
    } else {
      dados.time = valor;
    }
  }

  const location = body.location;
  if (location !== undefined || modo === "completo") {
    const valor = String(location ?? "").trim();
    if (!valor) {
      campos.location = "Informe o local do evento.";
    } else {
      dados.location = valor;
    }
  }

  if (body.visivel !== undefined) {
    if (typeof body.visivel !== "boolean") {
      campos.visivel = "visivel deve ser um booleano.";
    } else {
      dados.visivel = body.visivel;
    }
  }

  if (body.status !== undefined) {
    if (body.status !== "ATIVO" && body.status !== "INATIVO") {
      campos.status = "Status deve ser ATIVO ou INATIVO.";
    } else {
      dados.status = body.status;
    }
  }

  if (Object.keys(campos).length > 0) {
    return { ok: false, campos };
  }

  return { ok: true, dados };
}

// ---------------------------------------------------------------------------
// Patrimônio (RF-025) — validação de bens por campo.
// ---------------------------------------------------------------------------

/** Payload validado de bem patrimonial (PAT-04/05/08/10). */
export type AssetValidado = {
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

export type ValidarAssetResultado =
  | { ok: true; dados: AssetValidado }
  | { ok: false; campos: Record<string, string> };

/**
 * Valida payload de bem patrimonial por campo (PAT-04/05/08/10). Modo
 * `completo` (POST) exige `name` e `category`; modo `parcial` (PATCH) valida
 * apenas campos enviados (inclui `status`). Regras: `name` obrigatório
 * não-vazio; `category` no enum fixo; `numero_patrimonio` não-vazia quando
 * presente (única no DB — 409, ver rota); `acquisition_value` numeric >= 0
 * quando presente; `acquisition_date` `YYYY-MM-DD` real; `status`
 * `ATIVO`/`INATIVO` quando enviado.
 */
export function validateAsset(
  body: Record<string, unknown>,
  modo: "completo" | "parcial" = "completo"
): ValidarAssetResultado {
  const campos: Record<string, string> = {};
  const dados: AssetValidado = {};

  const name = body.name;
  if (name !== undefined || modo === "completo") {
    const valor = String(name ?? "").trim();
    if (!valor) {
      campos.name = "Informe o nome do bem.";
    } else {
      dados.name = valor;
    }
  }

  const category = body.category;
  if (category !== undefined || modo === "completo") {
    const valor = String(category ?? "").trim();
    if (!(AssetCategoriasFixo as readonly string[]).includes(valor)) {
      campos.category =
        "Categoria inválida (use AUDIO, VIDEO, INSTRUMENTO, MOBILIA, EQUIPAMENTO, RELIGIOSO ou OUTRO).";
    } else {
      dados.category = valor as AssetCategoria;
    }
  }

  if (body.numero_patrimonio !== undefined) {
    const valor = String(body.numero_patrimonio ?? "").trim();
    if (!valor) {
      campos.numero_patrimonio = "Número de patrimônio não pode ser vazio.";
    } else {
      dados.numero_patrimonio = valor;
    }
  }

  const location = body.location;
  if (location !== undefined) {
    const valor = String(location ?? "").trim();
    dados.location = valor === "" ? null : valor;
  }

  if (body.acquisition_value !== undefined) {
    const valor = body.acquisition_value;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
      campos.acquisition_value = "Valor de aquisição deve ser numérico >= 0.";
    } else {
      dados.acquisition_value = valor;
    }
  }

  if (body.acquisition_date !== undefined) {
    const valor = String(body.acquisition_date ?? "").trim();
    if (!validarDataEvento(valor)) {
      campos.acquisition_date = "Data de aquisição inválida (use AAAA-MM-DD).";
    } else {
      dados.acquisition_date = valor;
    }
  }

  const responsible = body.responsible;
  if (responsible !== undefined) {
    const valor = String(responsible ?? "").trim();
    dados.responsible = valor === "" ? null : valor;
  }

  const observations = body.observations;
  if (observations !== undefined) {
    const valor = String(observations ?? "").trim();
    dados.observations = valor === "" ? null : valor;
  }

  if (body.status !== undefined) {
    const valor = String(body.status ?? "").trim();
    if (valor !== "ATIVO" && valor !== "INATIVO") {
      campos.status = "Status deve ser ATIVO ou INATIVO.";
    } else {
      dados.status = valor as AssetStatus;
    }
  }

  if (Object.keys(campos).length > 0) {
    return { ok: false, campos };
  }

  return { ok: true, dados };
}

