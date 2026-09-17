import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import { criarEvento, listarEventos } from "@/lib/admin/eventos";
import { validarEvento } from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * POST /api/admin/eventos — cria evento (EVT-04). Guarda de escrita `eventos`
 * (EVT-06); validação por campo via `validarEvento` → 400 `{error, campos}`
 * (EVT-05); sucesso → 201 `{ evento }` com `status='ATIVO'` e `visivel`
 * default `true`.
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("eventos");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const resultado = validarEvento(body, "completo");
  if (!resultado.ok) {
    return erroCampos(resultado.campos);
  }

  try {
    const evento = await criarEvento({
      title: resultado.dados.title!,
      description: resultado.dados.description,
      date: resultado.dados.date!,
      time: resultado.dados.time!,
      location: resultado.dados.location!,
      visivel: resultado.dados.visivel,
    });

    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "criar",
      entidade: "eventos",
      entidade_id: evento.id,
      ip,
      user_agent,
    });

    return NextResponse.json({ evento }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/eventos", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * GET /api/admin/eventos — lista todos os eventos ordenados por `date` desc
 * (EVT-07), incluindo `visivel=false` e `status='INATIVO'`. Guarda de leitura
 * `eventos` (EVT-06 — leitores como FINANCEIRO/PATRIMONIAL/LIDER passam).
 */
export async function GET() {
  const auth = await authAdmin("eventos");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const eventos = await listarEventos();
    return NextResponse.json({ eventos });
  } catch (error) {
    console.error("GET /api/admin/eventos", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}