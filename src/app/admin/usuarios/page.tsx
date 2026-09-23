import {
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
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Usuários
            </h1>
            <p className="text-white/60">
              Você não tem permissão para acessar este módulo.
            </p>
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
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Users className="text-[#c9a84c]" size={28} />
          <h1 className="font-sans text-3xl font-bold text-white">
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
                  ? "bg-[#c9a84c] text-[#0d1f3c]"
                  : "bg-white/10 text-white/60 border border-white/10 hover:border-[#c9a84c] hover:text-[#c9a84c]"
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

        <div className="bg-[#132744] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="font-sans text-sm text-white/60">
              {result.total} usuário(s)
            </span>
            {administrador && (
              <Link
                href="/admin/usuarios/permissoes"
                className="inline-flex items-center gap-1.5 text-sm font-sans font-bold text-[#c9a84c] hover:text-[#e0c872] transition-colors"
              >
                <Shield size={14} />
                Matriz de Permissões
              </Link>
            )}
          </div>

          {result.users.length === 0 ? (
            <div className="p-10 text-center">
              <UserPlus className="mx-auto mb-3 text-white/30" size={40} />
              <p className="text-white/40">
                Nenhum usuário cadastrado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 font-sans text-xs font-bold text-white/70 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-white/70 uppercase tracking-wider">
                      Papel
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-white/70 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-4 py-3 font-sans text-xs font-bold text-white/70 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.users.map((u) => (
                    <tr
                      key={u.id}
                      className="bg-[#0d1f3c] border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-sans text-sm text-white">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-sans font-bold bg-[#c9a84c]/10 text-[#c9a84c]">
                          {ROLE_LABELS[u.role ?? ""] ?? u.role ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-white/60">
                        {formatarData(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-sans font-bold ${
                            u.lastSignInAt
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {u.lastSignInAt ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
