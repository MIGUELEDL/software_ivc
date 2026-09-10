import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/rbac";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role =
    typeof session?.user.app_metadata?.role === "string"
      ? session.user.app_metadata.role
      : "";

  await supabase.auth.signOut();

  // AUTH-18: redirect to the login of the session's area.
  return NextResponse.redirect(
    new URL(isAdminRole(role) ? "/login/admin" : "/login", request.url)
  );
}