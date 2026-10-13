import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  // Aceita os dois nomes de chave pública (dashboard Vercel × convenção do
  // repo): PUBLISHABLE_KEY (padrão do código) ou ANON_KEY (rótulo do dashboard).
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey!,
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
            // Needed to satisfy no-empty lint; cookie writes from Server
            // Components are expected to be handled by the proxy instead.
          }
        },
      },
    }
  );
}