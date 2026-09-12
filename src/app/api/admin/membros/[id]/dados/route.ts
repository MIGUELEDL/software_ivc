import { NextResponse } from "next/server";
import { requireWriter, erroCampos } from "@/lib/admin/http";
import { atualizarDadosMembro, getMembro } from "@/lib/admin/membros";
import {
  validarNascimento,
  validarUf,
  lerEndereco,
} from "@/lib/admin/validacao";

/**
 * POST /api/admin/membros/[id]/dados — edição de dados textuais
 * (ADMINMEM-14..16). Guarda de escrita; 400 por campo; 404 se o membro não
 * existe; 200 `{ member }` atualizado. E-mail não é aceito nesta action
 * (ADMINMEM-16: inalterável).
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

  const nome = String(formData.get("nome") ?? "").trim();
  const nascimento = String(formData.get("nascimento") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
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
  if (endereco.uf && !validarUf(endereco.uf)) {
    campos.uf = "UF deve ter 2 letras (ex.: PB).";
  }

  if (Object.keys(campos).length > 0) {
    return erroCampos(campos);
  }

  const existente = await getMembro(id);
  if (!existente) {
    return NextResponse.json(
      { error: "membro_nao_encontrado" },
      { status: 404 }
    );
  }

  try {
    const member = await atualizarDadosMembro(id, {
      nome,
      nascimento,
      whatsapp,
      ...endereco,
    });
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/membros/[id]/dados", error);
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}