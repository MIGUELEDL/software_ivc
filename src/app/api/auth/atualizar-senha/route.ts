import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/atualizar-senha (SEN-02): troca a senha a partir da sessão
 * de recovery aberta pelo link do e-mail (cookies @supabase/ssr). Mesma
 * política AUTH-11 de /api/auth/trocar-senha; sucesso limpa
 * force_password_change (service role) e redireciona ao login.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const newPassword = String(formData.get("new_password") ?? "");

  // AUTH-11: password policy — min 8 chars, at least one letter, one number
  if (
    newPassword.length < 8 ||
    !/[a-zA-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    return NextResponse.redirect(
      new URL("/atualizar-senha?error=weak_password", request.url)
    );
  }

  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(
      new URL("/atualizar-senha?error=auth_required", request.url)
    );
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/atualizar-senha?error=auth_required", request.url)
    );
  }

  // Limpa force_password_change quando presente (mesmo padrão de trocar-senha).
  const existingAppMetadata = data.user.app_metadata ?? {};
  if (existingAppMetadata.force_password_change === true) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Service role key not configured on the server" },
        { status: 500 }
      );
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { error: adminError } = await admin.auth.admin.updateUserById(
      data.user.id,
      {
        app_metadata: { ...existingAppMetadata, force_password_change: false },
      }
    );

    if (adminError) {
      return NextResponse.json(
        { error: "Failed to clear force_password_change flag" },
        { status: 500 }
      );
    }
  }

  return NextResponse.redirect(new URL("/login?ok=password", request.url));
}
