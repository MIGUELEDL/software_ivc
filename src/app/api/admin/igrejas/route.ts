import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import { criarIgreja, listarIgrejas } from "@/lib/admin/lideranca";
import { validarCnpj } from "@/lib/admin/validacao";

type IgrejasBody = {
  name?: string;
  short_name?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  founded_date?: string | null;
};

/** Data YYYY-MM-DD real (não apenas formato) para `founded_date` (IGR-06). */
function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  return !Number.isNaN(new Date(`${valor}T00:00:00`).getTime());
}

/**
 * POST /api/admin/igrejas — cria igreja (IGR-05). Guarda de escrita
 * `igrejas` (IGR-07); validação por campo → 400 `{error, campos}` (IGR-06);
 * sucesso → 201 `{ igreja }`.
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("igrejas");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: IgrejasBody;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const name = String(body.name ?? "").trim();
  const short_name = String(body.short_name ?? "").trim();
  const cnpj = String(body.cnpj ?? "").trim();
  const address = String(body.address ?? "").trim();
  const city = String(body.city ?? "").trim();
  const founded = String(body.founded_date ?? "").trim();

  const campos: Record<string, string> = {};
  if (!name) {
    campos.name = "Informe o nome da igreja.";
  }
  if (!short_name) {
    campos.short_name = "Informe a sigla.";
  }
  if (!validarCnpj(cnpj)) {
    campos.cnpj = "Informe um CNPJ válido (14 dígitos).";
  }
  if (!address) {
    campos.address = "Informe o endereço completo.";
  }
  if (!city) {
    campos.city = "Informe a cidade.";
  }
  if (founded && !dataValida(founded)) {
    campos.founded_date = "Data inválida (use AAAA-MM-DD).";
  }

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  try {
    const igreja = await criarIgreja({
      name,
      short_name,
      cnpj,
      address,
      city,
      founded_date: founded === "" ? null : founded,
    });

    return NextResponse.json({ igreja }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/igrejas", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * GET /api/admin/igrejas — lista igrejas por `created_at` asc (IGR-08).
 * Guarda de leitura `igrejas` (leitores como SECRETARIA/FINANCEIRO passam).
 */
export async function GET() {
  const auth = await authAdmin("igrejas");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const igrejas = await listarIgrejas();
    return NextResponse.json({ igrejas });
  } catch (error) {
    console.error("GET /api/admin/igrejas", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}