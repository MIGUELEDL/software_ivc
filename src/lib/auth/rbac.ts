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

// Escritores do admin de membros (ADMINMEM-32..34): podem criar/editar/inativar
// e gerir documentos. Leitores (LIDER/FINANCEIRO/PATRIMONIAL) só leem.
export const ADMIN_WRITER_ROLES: Set<string> = new Set([
  "SECRETARIA",
  "ADMIN",
  "SUPER_ADMIN",
]);

export function isAdminWriterRole(role: string): boolean {
  return ADMIN_WRITER_ROLES.has(role);
}

// Hard-delete de membros (ADMINMEM-21..23): só ADMIN/SUPER_ADMIN removem a
// conta auth + linha members. SECRETARIA inativa, não apaga.
export function isHardDeleteRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}