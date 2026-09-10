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