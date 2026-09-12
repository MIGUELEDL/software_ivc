import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service-role (ADMINMEM-06/ADMINMEM-20).
 * Exclusivo de servidor: faz operações de Auth admin (`createUser`,
 * `deleteUser`) que o client de sessão não pode fazer. NUNCA importar de
 * client components — a chave é um segredo de servidor.
 *
 * URL: `SUPABASE_SERVICE_ROLE_URL` com fallback para `NEXT_PUBLIC_SUPABASE_URL`
 * (mesmo projeto `[REDACTED_PROJECT_REF]`); a chave `SUPABASE_SERVICE_ROLE_KEY`
 * é obrigatória e lança erro se ausente (padrão trocar-senha/route.ts:45-56).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nao configurada: serve-side admin ops indisponiveis"
    );
  }

  return createClient(
    process.env.SUPABASE_SERVICE_ROLE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}