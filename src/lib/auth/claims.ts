import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export type AuthClaims = {
  role: string | null;
  forcePasswordChange: boolean;
  email: string;
};

export async function getClaims(
  request: NextRequest
): Promise<AuthClaims | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const user = session.user;

  return {
    role: user.app_metadata?.role ?? null,
    forcePasswordChange: user.app_metadata?.force_password_change === true,
    email: user.email ?? "",
  };
}