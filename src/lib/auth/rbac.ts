import { createServerClient } from "@/lib/supabase/server";
import { cache } from "react";

export const ADMIN_ROLES: Set<string> = new Set([
  "SECRETARIA",
  "LIDER",
  "FINANCEIRO",
  "PATRIMONIAL",
  "ADMIN",
  "SUPER_ADMIN",
]);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function isMemberRole(role: string): boolean {
  return role === "MEMBRO";
}

// Ontologia da matriz (RF-032, AD-015): módulos e níveis hierárquicos da
// tabela `permissions` (migration 0008). A matriz é a fonte única do acesso
// fino; os helpers acima (ADMIN_ROLES/isAdminRole) seguem só como gate
// grosseiro de roteamento do proxy.
export type Nivel = "ler" | "escrever" | "administrar";

export const MODULOS = [
  "dashboard",
  "membros",
  "igrejas",
  "eventos",
  "patrimonio",
  "financeiro",
  "relatorios",
  "usuarios",
  "configuracoes",
  "auditoria",
] as const;

export type Modulo = (typeof MODULOS)[number];

// Hierarquia ler < escrever < administrar (MATRIZ-06): um nível maior concede
// qualquer nível solicitado igual ou inferior ao do papel no módulo.
export const ORDEM: Record<Nivel, number> = {
  ler: 1,
  escrever: 2,
  administrar: 3,
};

/**
 * Lê as linhas da matriz do papel (`SELECT module, nivel FROM permissions
 * WHERE role = papel` pelo client de sessão — RLS libera SELECT a
 * authenticated, sem service-role). Retorna {} para papel vazio ou sem linha
 * (ex.: MEMBRO). Deduplicada por request via `React.cache`: múltiplos guards
 * da mesma request consultam a matriz uma única vez.
 * Falha de leitura propaga o erro — o fail-closed fica no `can()` (MATRIZ-10).
 */
export const getMatriz = cache(
  async (papel: string): Promise<Partial<Record<Modulo, Nivel>>> => {
    if (!papel) {
      return {};
    }
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("permissions")
      .select("module,nivel")
      .eq("role", papel);
    if (error) {
      throw error;
    }
    const matriz: Partial<Record<Modulo, Nivel>> = {};
    for (const linha of data ?? []) {
      const modulo = linha.module as Modulo;
      const nivel = linha.nivel as Nivel;
      if (MODULOS.includes(modulo) && ORDEM[nivel] !== undefined) {
        matriz[modulo] = nivel;
      }
    }
    return matriz;
  }
);

/**
 * Avalia se o papel tem (pelo menos) o nível solicitado no módulo, segundo a
 * matriz `permissions` (AD-015). Hierarquia por ORDEM: administrar concede
 * ler/escrever/administrar; escrever concede ler/escrever; ler só ler.
 * Fail-closed: papel vazio, linha ausente ou erro de leitura → false
 * (MATRIZ-10/11) — erro nunca vira permissão.
 */
export async function can(
  papel: string,
  modulo: Modulo,
  nivel: Nivel
): Promise<boolean> {
  if (!papel) {
    return false;
  }
  try {
    const matriz = await getMatriz(papel);
    const nivelPapel = matriz[modulo];
    if (!nivelPapel) {
      return false;
    }
    return ORDEM[nivelPapel] >= ORDEM[nivel];
  } catch (error) {
    console.error("can: falha ao ler a matriz de permissões", error);
    return false;
  }
}