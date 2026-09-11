import { NextResponse } from "next/server";
import { getClaims } from "@/lib/auth/claims";
import { getMemberByAuthUid } from "@/lib/painel/members";
import { createServerClient } from "@/lib/supabase/server";

const FOTO_MAX_BYTES = 2 * 1024 * 1024;

const FOTO_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const claims = await getClaims();

  if (!claims) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  let member;
  try {
    member = await getMemberByAuthUid(claims.sub);
  } catch {
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }

  // Sem registro em members não há path de storage próprio (members/{id}).
  if (!member) {
    return NextResponse.json(
      { error: "membro_nao_encontrado" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("foto");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "foto_invalida" }, { status: 400 });
  }

  if (file.size === 0 || file.size > FOTO_MAX_BYTES) {
    return NextResponse.json({ error: "foto_tamanho_invalido" }, { status: 400 });
  }

  const ext = FOTO_MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "foto_tipo_invalido" }, { status: 400 });
  }

  const path = `members/${member.id}/foto-4x4.${ext}`;
  const supabase = await createServerClient();

  const { error: uploadError } = await supabase.storage
    .from("fotos-membros")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "upload_falhou" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("fotos-membros")
    .getPublicUrl(path);
  const fotoUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("members")
    .update({ foto_url: fotoUrl, atualizado_em: new Date().toISOString() })
    .eq("auth_user_id", claims.sub);

  if (updateError) {
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, foto_url: fotoUrl }, { status: 200 });
}