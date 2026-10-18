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

export class UsuarioProtegidoError extends Error {
  constructor() {
    super("usuario_protegido");
    this.name = "UsuarioProtegidoError";
  }
}

export class UsuarioComVinculosError extends Error {
  constructor() {
    super("usuario_com_vinculos");
    this.name = "UsuarioComVinculosError";
  }
}

interface UsuarioAuth {
  id: string;
  email: string;
  role: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  criadoPorAdmin: boolean;
  deletable: boolean;
}

interface ListarUsuariosResult {
  users: UsuarioAuth[];
  /** Contagem do resultado filtrado (ex.: papel escolhido) — TAB-05. */
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
    return true;
  });
  const porPapel = opts?.role
    ? filtered.filter((u) => u.app_metadata?.role === opts.role)
    : filtered;
  return {
    users: porPapel.map((u) => {
      const role = u.app_metadata?.role ?? null;
      const criadoPorAdmin = u.app_metadata?.criado_por_admin === true;
      return {
        id: u.id,
        email: u.email ?? "",
        role,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        criadoPorAdmin,
        deletable: role !== "SUPER_ADMIN" && criadoPorAdmin,
      };
    }),
    total: porPapel.length,
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
    app_metadata: { role: dados.role, force_password_change: true, criado_por_admin: true },
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
    app_metadata: { ...existing.user.app_metadata, role },
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

const VINCULOS_EXCLUSAO: { tabela: string; coluna: string }[] = [
  { tabela: "transactions", coluna: "created_by" },
  { tabela: "cash_closes", coluna: "created_by" },
  { tabela: "documents", coluna: "uploaded_by" },
  { tabela: "audit_logs", coluna: "autor" },
];

export async function excluirUsuario(
  userId: string,
  callerId: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing, error: fetchError } =
    await admin.auth.admin.getUserById(userId);
  if (fetchError || !existing?.user) {
    throw new NaoEncontradoError();
  }
  if (userId === callerId) {
    throw new AutoModificacaoError();
  }
  const role = existing.user.app_metadata?.role;
  if (role === "SUPER_ADMIN") {
    throw new SuperAdminProtegidoError();
  }
  if (existing.user.app_metadata?.criado_por_admin !== true) {
    throw new UsuarioProtegidoError();
  }
  for (const vinculo of VINCULOS_EXCLUSAO) {
    const { data, error } = await admin
      .from(vinculo.tabela)
      .select("id")
      .eq(vinculo.coluna, userId)
      .limit(1);
    if (error) {
      throw error;
    }
    if (data && data.length > 0) {
      throw new UsuarioComVinculosError();
    }
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw deleteError;
  }
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
