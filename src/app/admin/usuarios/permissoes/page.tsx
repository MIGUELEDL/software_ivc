import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { MODULOS } from "@/lib/auth/rbac";
import { obterMatriz } from "@/lib/admin/permissoes";
import { MatrixEditor } from "./matrix-editor";

const ROLE_LABELS: Record<string, string> = {
  SECRETARIA: "Secretaria",
  LIDER: "Líder",
  FINANCEIRO: "Financeiro",
  PATRIMONIAL: "Patrimonial",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Admin",
};

const MODULO_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  membros: "Membros",
  igrejas: "Igrejas",
  eventos: "Eventos",
  patrimonio: "Patrimônio",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  auditoria: "Auditoria",
};

export default async function AdminPermissoesPage() {
  const claims = await getClaims();
  const papel = claims?.role ?? "";
  const administrador = await can(papel, "usuarios", "administrar");

  if (!administrador) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl hero-background-admin shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Matriz de Permissões
            </h1>
            <p className="font-serif text-white/70">
              Apenas administradores podem acessar a matriz de permissões.
            </p>
            <Link
              href="/admin/usuarios"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const matrix = await obterMatriz();

  const roles = [
    "SECRETARIA",
    "LIDER",
    "FINANCEIRO",
    "PATRIMONIAL",
    "ADMIN",
    "SUPER_ADMIN",
  ];
  const modules = [...MODULOS];

  const cellMap: Record<string, string> = {};
  for (const row of matrix) {
    cellMap[`${row.role}:${row.module}`] = row.nivel;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-accent-light" size={28} />
          <h1 className="font-sans text-3xl font-bold text-primary">
            Matriz de Permissões
          </h1>
        </div>

        <MatrixEditor
          roles={roles}
          modules={modules}
          roleLabels={ROLE_LABELS}
          moduloLabels={MODULO_LABELS}
          initialCells={cellMap}
        />

        <div className="mt-6">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent-light transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </div>
    </section>
  );
}
