import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import { criarAsset, listarAssets } from "@/lib/admin/assets";
import { validateAsset } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * POST /api/admin/assets — cria um bem patrimonial (PAT-04). Guarda de escrita
 * `patrimonio`; validação por campo via `validateAsset` → 400 `{error, campos}`
 * (PAT-05); `status` default `'ATIVO'` (PAT-04); tombo duplicado (índice único
 * parcial da migration 0013) → 409 `{error:"numero_patrimonio_duplicado"}`
 * (PAT-06); sucesso → 201 `{ asset }`.
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("patrimonio");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const resultado = validateAsset(body, "completo");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const asset = await criarAsset({
      name: resultado.dados.name!,
      category: resultado.dados.category!,
      numero_patrimonio: resultado.dados.numero_patrimonio,
      location: resultado.dados.location,
      acquisition_value: resultado.dados.acquisition_value,
      acquisition_date: resultado.dados.acquisition_date,
      responsible: resultado.dados.responsible,
      observations: resultado.dados.observations,
    });

    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "criar",
      entidade: "patrimonio",
      entidade_id: asset.id,
      ip,
      user_agent,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "numero_patrimonio_duplicado" },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/assets", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * GET /api/admin/assets — lista todos os bens ordenados por `name` asc
 * (PAT-07), incluindo `status='INATIVO'`. Guarda de leitura `patrimonio`
 * (PAT-02 — leitores como FINANCEIRO/SECRETARIA/LIDER passam; leitura é
 * admin-only: sem anon, PAT-11).
 */
export async function GET() {
  const auth = await authAdmin("patrimonio");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const assets = await listarAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("GET /api/admin/assets", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}