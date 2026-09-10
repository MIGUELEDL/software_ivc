import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type AuthClaims = {
  role: string | null;
  forcePasswordChange: boolean;
  email: string;
};

/**
 * Extract auth claims from a NextRequest (used by proxy.ts).
 */
export async function getClaimsFromRequest(
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

/**
 * Extract auth claims from server-side cookies (used by server components).
 * Reads cookies via next/headers — no request object needed.
 */
export async function getClaims(): Promise<AuthClaims | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components can't write cookies — proxy handles it.
          }
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
