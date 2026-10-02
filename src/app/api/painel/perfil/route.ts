import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import { comporDadosDocumento } from "@/lib/painel/documento";
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

/**
 * Valida só os campos de perfil (nome, nascimento, WhatsApp). O documento do
 * cartão entra depois, em `comporDadosDocumento`, chamado no próprio `POST`.
 *
 * A separação é deliberada: com a mesclagem dentro desta função, a ligação
 * entre o resultado da composição e o que chega ao `.update()` atravessava duas
 * camadas, e o gate só conseguia ver o token `comporDadosDocumento` no
 * arquivo — não que o retorno dele fosse o persistido. Com as duas no mesmo
 * escopo, o probe exige que o identificador vinculado ao retorno seja
 * literalmente o argumento do service.
 */
function validarCamposBase(formData: FormData) {
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

  return { dados: { nome, nascimento, whatsapp }, campos };
}

export async function POST(request: Request) {
  const claims = await getClaims();

  if (!claims) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const base = validarCamposBase(formData);

  // Documento do cartão (CART-04..07): o mesmo normalizador serve à criação e
  // à edição, então "salvar vazio" limpa o campo para NULL nos dois caminhos.
  //
  // `pronto.dados` só existe no ramo `ok: true`, e o `return` abaixo é o que
  // estreita o tipo. Trocar esse `return` por um `console.error` deixa de
  // compilar — não é um guard de probe, é o compilador recusando gravar a row
  // sem antes recusar o formulário (CART-05..07, "SHALL NOT write").
  const pronto = comporDadosDocumento(
    base.dados,
    base.campos,
    formData,
    new Date()
  );

  if (!pronto.ok) {
    return NextResponse.json(
      { error: "dados_invalidos", campos: pronto.campos },
      { status: 400 }
    );
  }

  try {
    const existente = await getMemberByAuthUid(claims.sub);

    if (existente) {
      const member = await updateMember(claims.sub, pronto.dados);
      return NextResponse.json({ member }, { status: 200 });
    }

    // Autocadastro: cria o registro e gera a matrícula IVC-#### (PAINEL-19).
    const member = await createMember(claims.sub, pronto.dados);
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