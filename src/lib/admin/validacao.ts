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