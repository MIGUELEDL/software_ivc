import { NextResponse } from "next/server";
import { requireWriter, erroCampos } from "@/lib/admin/http";
import {
  transicionarStatus,
  StatusInvalidoError,
  MembroNaoEncontradoError,
  TRANSICOES,
} from "@/lib/admin/membros";
import type { MembroStatus } from "@/lib/admin/membros";

/**
 * POST /api/admin/membros/[id]/status — ciclo de vida (ADMINMEM-17..19).
 * Guarda de escrita; `status` fora do domínio → 400 por campo; transição
 * inválida (ex.: TRANSFERIDO→X) → 400 `status_transicao_invalida` sem alterar
 * o registro; membro inexistente → 404; sucesso → 200 `{ member }`. "Remover"
 * (inativar) é `status=INATIVO` (soft — preserva histórico).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireWriter();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  const formData = await request.formData();
  const status = String(formData.get("status") ?? "").trim();

  if (!Object.keys(TRANSICOES).includes(status)) {
    return erroCampos({ status: "Situação inválida." });
  }

  try {
    const member = await transicionarStatus(id, status as MembroStatus);
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    if (error instanceof StatusInvalidoError) {
      return NextResponse.json(
        { error: "status_transicao_invalida" },
        { status: 400 }
      );
    }
    if (error instanceof MembroNaoEncontradoError) {
      return NextResponse.json(
        { error: "membro_nao_encontrado" },
        { status: 404 }
      );
    }
    console.error("POST /api/admin/membros/[id]/status", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}