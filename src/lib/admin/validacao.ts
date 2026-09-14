/**
 * Validações compartilhadas dos route handlers `/api/admin/membros/*`.
 * Nascimento usa os mesmos bounds do painel-membro (perfil/route.ts:13-31):
 * YYYY-MM-DD válida, não futura, máx. 120 anos.
 */
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