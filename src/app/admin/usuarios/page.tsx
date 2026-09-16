import {
  ArrowLeft,
  Users,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarUsuarios } from "@/lib/admin/usuarios";
import { CreateUserForm } from "./create-user-form";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  SECRETARIA: "Secretaria",
  LIDER: "Líder",
  FINANCEIRO: "Financeiro",
  PATRIMONIAL: "Patrimonial",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Admin",
};

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const roleParam =
    typeof params.role === "string" ? params.role : "";

  const claims = await getClaims();
  const papel = claims?.role ?? "";
  const leitor = await can(papel, "usuarios", "ler");
  const administrador = await can(papel, "usuarios", "administrar");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Usuários
            </h1>
            <p className="font-serif text-text-dark/70">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const result = await listarUsuarios({ role: roleParam || undefined });
  const roles = [
    "",
    "SECRETARIA",
    "LIDER",
    "FINANCEIRO",
    "PATRIMONIAL",
    "ADMIN",
    "SUPER_ADMIN",
  ];

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Users className="text-primary" size={28} />
          <h1 className="font-sans text-3xl font-bold text-primary">
            Usuários
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {roles.map((r) => (
            <Link
              key={r}
              href={r ? `/admin/usuarios?role=${r}` : "/admin/usuarios"}
              className={`px-3 py-1.5 rounded-full text-sm font-sans font-bold transition-colors ${
                roleParam === r || (!roleParam && !r)
                  ? "bg-primary text-white"
                  : "bg-white text-text-dark border border-gray-200 hover:border-primary"
              }`}
            >
              {r ? ROLE_LABELS[r] : "Todos"}
            </Link>
          ))}
        </div>

        {administrador && (
          <div className="mb-6">
            <CreateUserForm />
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-sans text-sm text-text-dark/60">
              {result.total} usuário(s)
            </span>
            <Link
              href="/admin/usuarios/permissoes"
              className="inline-flex items-center gap-1.5 text-sm font-sans font-bold text-primary hover:text-accent transition-colors"
            >
              <Shield size={14} />
              Matriz de Permissões
            </Link>
          </div>

          {result.users.length === 0 ? (
            <div className="p-10 text-center">
              <UserPlus className="mx-auto mb-3 text-text-dark/30" size={40} />
              <p className="font-serif text-text-dark/50">
                Nenhum usuário cadastrado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Papel
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Criado em
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Último acesso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-sans text-sm text-text-dark">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-sans font-bold bg-primary/10 text-primary">
                          {ROLE_LABELS[u.role ?? ""] ?? u.role ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-text-dark/60">
                        {formatarData(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-text-dark/60">
                        {u.lastSignInAt
                          ? formatarData(u.lastSignInAt)
                          : "Nunca"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao painel
          </Link>
        </div>
      </div>
    </section>
  );
}
