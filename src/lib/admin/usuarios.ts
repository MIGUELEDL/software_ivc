import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/auth/rbac";
import { gerarSenhaId } from "@/lib/admin/membros";

export class EmailEmUsoError extends Error {
  constructor() {
    super("email_em_uso");
    this.name = "EmailEmUsoError";
  }
}

export class NaoEncontradoError extends Error {
  constructor() {
    super("nao_encontrado");
    this.name = "NaoEncontradoError";
  }
}

export class AutoModificacaoError extends Error {
  constructor() {
    super("auto_modificacao_nao_permitida");
    this.name = "AutoModificacaoError";
  }
}

export class SuperAdminProtegidoError extends Error {
  constructor() {
    super("super_admin_protegido");
    this.name = "SuperAdminProtegidoError";
  }
}

export class PapelInvalidoError extends Error {
  constructor() {
    super("papel_invalido");
    this.name = "PapelInvalidoError";
  }
}

interface UsuarioAuth {
  id: string;
  email: string;
  role: string | null;
  createdAt: string;
  lastSignInAt: string | null;
}

interface ListarUsuariosResult {
  users: UsuarioAuth[];
  total: number;
}

interface CriarResult {
  id: string;
  email: string;
  role: string;
  temporaryPassword: string;
}

interface EditarPapelResult {
  id: string;
  email: string;
  role: string;
}

interface RedefinirResult {
  id: string;
  email: string;
  temporaryPassword: string;
}

export async function listarUsuarios(
  opts?: { role?: string }
): Promise<ListarUsuariosResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    perPage: 200,
    page: 1,
  });
  if (error) {
    throw error;
  }
  const filtered = (data.users ?? []).filter((u) => {
    const role = u.app_metadata?.role;
    if (!role || !ADMIN_ROLES.has(role)) return false;
    if (opts?.role && role !== opts.role) return false;
    return true;
  });
  return {
    users: filtered.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: u.app_metadata?.role ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    })),
    total: filtered.length,
  };
}

export async function criarUsuario(dados: {
  email: string;
  role: string;
}): Promise<CriarResult> {
  if (!ADMIN_ROLES.has(dados.role)) {
    throw new PapelInvalidoError();
  }
  const admin = createAdminClient();
  const temporaryPassword = gerarSenhaId();
  const { data, error } = await admin.auth.admin.createUser({
    email: dados.email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { role: dados.role, force_password_change: true },
  });
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (error.code === "user_already_exists" || msg.includes("already")) {
      throw new EmailEmUsoError();
    }
    throw error;
  }
  return {
    id: data.user.id,
    email: data.user.email ?? dados.email,
    role: dados.role,
    temporaryPassword,
  };
}

export async function editarPapel(
  userId: string,
  role: string,
  callerId: string
): Promise<EditarPapelResult> {
  if (!ADMIN_ROLES.has(role)) {
    throw new PapelInvalidoError();
  }
  if (userId === callerId) {
    throw new AutoModificacaoError();
  }
  if (role === "SUPER_ADMIN") {
    throw new SuperAdminProtegidoError();
  }
  const admin = createAdminClient();
  const { data: existing, error: fetchError } =
    await admin.auth.admin.getUserById(userId);
  if (fetchError || !existing?.user) {
    throw new NaoEncontradoError();
  }
  const currentRole = existing.user.app_metadata?.role;
  if (currentRole === "SUPER_ADMIN") {
    throw new SuperAdminProtegidoError();
  }
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (error) {
    throw error;
  }
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role,
  };
}

export async function redefinirSenha(userId: string): Promise<RedefinirResult> {
  const admin = createAdminClient();
  const { data: existing, error: fetchError } =
    await admin.auth.admin.getUserById(userId);
  if (fetchError || !existing?.user) {
    throw new NaoEncontradoError();
  }
  const temporaryPassword = gerarSenhaId();
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    app_metadata: {
      ...existing.user.app_metadata,
      force_password_change: true,
    },
  });
  if (error) {
    throw error;
  }
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    temporaryPassword,
  };
}
