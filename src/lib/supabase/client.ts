import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase de browser (singleton via @supabase/ssr). Usado nas páginas
 * client de autenticação (/alterar-senha, /atualizar-senha): sessão em cookies
 * compartilhada com o server; PKCE com detectSessionInUrl para o link de
 * recuperação. Aceita os dois nomes de chave pública (dashboard × repo).
 */
export function createBrowserSupabaseClient() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey
  );
}
