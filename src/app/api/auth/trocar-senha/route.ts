import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/rbac";
import { createServerClient } from "@/lib/supabase/server";

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
      new URL("/trocar-senha?error=weak_password", request.url)
    );
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/trocar-senha?error=weak_password", request.url)
    );
  }

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

  const existingAppMetadata = data.user.app_metadata ?? {};
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

  const role =
    typeof existingAppMetadata.role === "string"
      ? existingAppMetadata.role
      : "";

  return NextResponse.redirect(
    new URL(isAdminRole(role) ? "/admin" : "/painel", request.url)
  );
}