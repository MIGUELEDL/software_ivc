import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import { dadosDocumento } from "@/lib/painel/documento";
import {
  createMember,
  getMemberByAuthUid,
  updateMember,
} from "@/lib/painel/members";

/**
 * Valida nascimento no formato YYYY-MM-DD: data válida, não futura e com no
 * máximo 120 anos (bounds da spec — sem idade mínima exigida).
 */
function validarNascimento(valor: string): boolean {
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

function validarFormulario(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const nascimento = String(formData.get("nascimento") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();

  const campos: Record<string, string> = {};
  if (!nome) {
    campos.nome = "Informe seu nome completo.";
  }
  if (!validarNascimento(nascimento)) {
    campos.nascimento = "Informe uma data de nascimento válida.";
  }
  if (!whatsapp) {
    campos.whatsapp = "Informe seu WhatsApp para contato.";
  }

  // Documento do cartão (CART-04..07): o mesmo normalizador serve à criação e
  // à edição, então "salvar vazio" limpa o campo para NULL nos dois caminhos.
  // `hoje` injetado mantém o limite de data futura determinístico.
  const documento = dadosDocumento(
    {
      rg: String(formData.get("rg") ?? ""),
      cpf: String(formData.get("cpf") ?? ""),
      dataBatismo: String(formData.get("data_batismo") ?? ""),
    },
    new Date()
  );
  Object.assign(campos, documento.campos);

  return {
    dados: { nome, nascimento, whatsapp, ...documento.dados },
    campos,
  };
}

export async function POST(request: Request) {
  const claims = await getClaims();

  if (!claims) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const { dados, campos } = validarFormulario(formData);

  if (Object.keys(campos).length > 0) {
    return NextResponse.json(
      { error: "dados_invalidos", campos },
      { status: 400 }
    );
  }

  try {
    const existente = await getMemberByAuthUid(claims.sub);

    if (existente) {
      const member = await updateMember(claims.sub, dados);
      return NextResponse.json({ member }, { status: 200 });
    }

    // Autocadastro: cria o registro e gera a matrícula IVC-#### (PAINEL-19).
    const member = await createMember(claims.sub, dados);
    return NextResponse.json(
      { member, matricula: member.matricula },
      { status: 201 }
    );
  } catch (error) {
    // Concorrência no autocadastro: unique de auth_user_id vence uma tentativa
    // e a perdedora recebe 409 (edge case da spec).
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "23505") {
      return NextResponse.json({ error: "cadastro_duplicado" }, { status: 409 });
    }
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}