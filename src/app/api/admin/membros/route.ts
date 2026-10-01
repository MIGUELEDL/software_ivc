import { NextResponse } from "next/server";
import { requireEscrita, erroCampos } from "@/lib/admin/http";
import { criarMembro, EmailEmUsoError } from "@/lib/admin/membros";
import {
  validarNascimento,
  validarEmail,
  validarUf,
  lerEndereco,
} from "@/lib/admin/validacao";
import { registrarAuditoria, extrairInfoRequest } from "@/lib/admin/auditoria";
import { comporDadosDocumento } from "@/lib/painel/documento";

/**
 * POST /api/admin/membros — criação de membro com conta auth (ADMINMEM-07..12).
 * Guarda de escrita (T9); validação por campo → 400 `{error, campos}`; e-mail
 * em uso → 409 `email_em_uso`; sucesso → 201 `{ member, senha_temporaria }`
 * (senha-ID exibida uma única vez — nunca persistida nem em URL).
 */
export async function POST(request: Request) {
  const auth = await requireEscrita("membros");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const formData = await request.formData();

  const nome = String(formData.get("nome") ?? "").trim();
  const nascimento = String(formData.get("nascimento") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const endereco = lerEndereco(formData);

  const campos: Record<string, string> = {};
  if (!nome) {
    campos.nome = "Informe o nome completo.";
  }
  if (!validarNascimento(nascimento)) {
    campos.nascimento = "Informe uma data de nascimento válida.";
  }
  if (!whatsapp) {
    campos.whatsapp = "Informe o WhatsApp para contato.";
  }
  if (!validarEmail(email)) {
    campos.email = "Informe um e-mail válido.";
  }
  if (endereco.uf && !validarUf(endereco.uf)) {
    campos.uf = "UF deve ter 2 letras (ex.: PB).";
  }

  // Documento do cartão (CART-04..07): mesmo normalizador da edição e do
  // painel, para que a regra não divirja entre os três pontos de entrada. A
  // mesclagem dos dados e dos erros por campo mora no helper puro, que o probe
  // executa — escrever o spread aqui dentro deixaria o gate incapaz de perceber
  // a remoção dele.
  const { dados: dadosDocumento, campos: camposDocumento } = comporDadosDocumento(
    { nome, nascimento, whatsapp, email, ...endereco },
    campos,
    formData,
    new Date()
  );

  if (Object.keys(camposDocumento).length > 0) {
    return erroCampos(camposDocumento);
  }

  try {
    const { membro, senhaTemporaria } = await criarMembro(dadosDocumento);

    const { ip, user_agent } = extrairInfoRequest(request);
    await registrarAuditoria({
      autor: auth.sub,
      acao: "criar",
      entidade: "membros",
      entidade_id: membro.id,
      ip,
      user_agent,
    });

    return NextResponse.json(
      { member: membro, senha_temporaria: senhaTemporaria },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof EmailEmUsoError) {
      return NextResponse.json({ error: "email_em_uso" }, { status: 409 });
    }
    console.error("POST /api/admin/membros", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}