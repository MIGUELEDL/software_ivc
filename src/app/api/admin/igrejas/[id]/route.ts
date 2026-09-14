import { NextResponse } from "next/server";
import { requireEscrita, authAdmin, erroCampos } from "@/lib/admin/http";
import {
  atualizarIgreja,
  excluirIgreja,
  IgrejaNaoEncontradaError,
  type IgrejaDados,
} from "@/lib/admin/lideranca";
import { validarCnpj } from "@/lib/admin/validacao";

/** Data YYYY-MM-DD real (não apenas formato) para `founded_date` (IGR-06). */
function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  return !Number.isNaN(new Date(`${valor}T00:00:00`).getTime());
}

/**
 * PATCH /api/admin/igrejas/[id] — atualiza apenas os campos enviados (IGR-09).
 * Guarda de escrita `igrejas`; igreja inexistente → 404 (IGR-10); validação
 * por campo → 400 `{error, campos}`; sucesso → 200 `{ igreja }`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEscrita("igrejas");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return erroCampos({ form: "Corpo JSON inválido." });
  }

  const dados: Partial<IgrejaDados> = {};
  const campos: Record<string, string> = {};

  for (const campo of ["name", "short_name", "address", "city"] as const) {
    if (body[campo] !== undefined) {
      const valor = String(body[campo]).trim();
      if (!valor) {
        campos[campo] = "Não deixe este campo vazio.";
      } else {
        (dados as Record<string, string>)[campo] = valor;
      }
    }
  }

  if (body.cnpj !== undefined) {
    const cnpj = String(body.cnpj).trim();
    if (!validarCnpj(cnpj)) {
      campos.cnpj = "Informe um CNPJ válido (14 dígitos).";
    } else {
      dados.cnpj = cnpj;
    }
  }

  if (body.founded_date !== undefined) {
    const valor = String(body.founded_date).trim();
    if (valor === "") {
      dados.founded_date = null;
    } else if (!dataValida(valor)) {
      campos.founded_date = "Data inválida (use AAAA-MM-DD).";
    } else {
      dados.founded_date = valor;
    }
  }

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  try {
    const igreja = await atualizarIgreja(id, dados);
    return NextResponse.json({ igreja });
  } catch (error) {
    if (error instanceof IgrejaNaoEncontradaError) {
      return NextResponse.json(
        { error: "igreja_nao_encontrada" },
        { status: 404 }
      );
    }
    console.error("PATCH /api/admin/igrejas/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/igrejas/[id] — hard-delete em cascata (IGR-11).
 * Guarda de leitura + checagem explícita `SUPER_ADMIN` (IGR-12: ADMIN com
 * `igrejas/administrar` ainda assim recebe 403); inexistente → 404; sucesso →
 * 204. RLS `churches_delete_super_admin` é o backstop em profundidade.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authAdmin("igrejas");
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (auth.role !== "SUPER_ADMIN") {
    console.error(
      `rbac: super_admin obrigatorio papel=${auth.role} modulo=igrejas nivel=administrar`
    );
    return NextResponse.json({ error: "nao_autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await excluirIgreja(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof IgrejaNaoEncontradaError) {
      return NextResponse.json(
        { error: "igreja_nao_encontrada" },
        { status: 404 }
      );
    }
    console.error("DELETE /api/admin/igrejas/[id]", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}