import { Settings } from "lucide-react";
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
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Configurações
            </h1>
            <p className="text-white/60">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { settings: configuracoes, fromDb } = await obterConfiguracoes();

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={24} className="text-[#c9a84c]" />
          <h1 className="font-sans text-2xl font-bold text-white">
            Configurações
          </h1>
          {!fromDb && (
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 font-sans text-xs font-bold text-yellow-400">
              (padrão)
            </span>
          )}
        </div>

        <ConfiguracoesForm initial={configuracoes} canEdit={admin} />
      </div>
    </section>
  );
}
