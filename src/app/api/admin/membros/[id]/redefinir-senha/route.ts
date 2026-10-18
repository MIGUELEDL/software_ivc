import { NextResponse } from "next/server";
import { requireAdministrar } from "@/lib/admin/http";
import { getMembro, gerarSenhaId, MembroNaoEncontradoError } from "@/lib/admin/membros";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";

/**
 * POST /api/admin/membros/[id]/redefinir-senha (SEN-04/05): guarda
 * requireAdministrar("membros") → exatamente ADMIN/SUPER_ADMIN na matriz
 * (demais papéis → 403); gera senha temporária (gerarSenhaId, ≥12 chars),
 * updateUserById password + force_password_change preservando o restante de
 * app_metadata (role), devolve `{ senha }` UMA vez e audita `redefinir_senha`
 * sem payload de senha (nunca em log).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdministrar("membros");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    const membro = await getMembro(id);
    if (!membro) {
      return NextResponse.json({ error: "membro_nao_encontrado" }, { status: 404 });
    }

    const senha = gerarSenhaId();
    const admin = createAdminClient();

    const { data: atual, error: erroLeitura } =
      await admin.auth.admin.getUserById(membro.auth_user_id);
    if (erroLeitura || !atual.user) {
      console.error("POST .../redefinir-senha: conta auth ausente", erroLeitura);
      return NextResponse.json({ error: "conta_auth_ausente" }, { status: 404 });
    }

    const { error: erroUpdate } = await admin.auth.admin.updateUserById(
      membro.auth_user_id,
      {
        password: senha,
        app_metadata: {
          ...(atual.user.app_metadata ?? {}),
          force_password_change: true,
        },
      }
    );
    if (erroUpdate) {
      console.error("POST .../redefinir-senha: updateUserById", erroUpdate);
      return NextResponse.json({ error: "erro_interno" }, { status: 500 });
    }

    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "redefinir_senha",
      entidade: "membros",
      entidade_id: id,
      ip,
      user_agent,
    });

    // Exibição única: a senha só sai daqui, não é persistida nem auditada.
    return NextResponse.json({ senha });
  } catch (error) {
    if (error instanceof MembroNaoEncontradoError) {
      return NextResponse.json({ error: "membro_nao_encontrado" }, { status: 404 });
    }
    console.error("POST /api/admin/membros/[id]/redefinir-senha", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
