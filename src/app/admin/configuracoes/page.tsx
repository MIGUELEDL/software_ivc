import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { obterConfiguracoes } from "@/lib/admin/configuracoes";
import ConfiguracoesForm from "./configuracoes-form";

export default async function AdminConfiguracoesPage() {
  const claims = await getClaims();
  const papel = claims?.role ?? "";

  const leitor = await can(papel, "configuracoes", "ler");
  const admin = await can(papel, "configuracoes", "administrar");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Configuracoes
            </h1>
            <p className="font-serif text-text-dark/70">
              Voce nao tem permissao para acessar este modulo.
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

  const { settings: configuracoes, fromDb } = await obterConfiguracoes();

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-sans text-xs font-bold text-primary hover:text-accent"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Settings size={24} className="text-primary" />
          <h1 className="font-sans text-2xl font-bold text-text-dark">
            Configuracoes
          </h1>
          {!fromDb && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 font-sans text-xs font-bold text-yellow-700">
              (padrao)
            </span>
          )}
        </div>

        <ConfiguracoesForm initial={configuracoes} canEdit={admin} />
      </div>
    </section>
  );
}
