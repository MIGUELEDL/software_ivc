import { Building2, Eye, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarIgrejas, listarLideres } from "@/lib/admin/lideranca";
import { ExcluirIgrejaBotao } from "./excluir-igreja-botao";

/**
 * Lista de igrejas (IGR-08): nome, cidade, nº de líderes e ações por nível.
 * Guarda de leitura `igrejas` (SECRETARIA/FINANCEIRO/PATRIMONIAL/LIDER lêem);
 * ações de escrita só para escritores; exclusão (hard-delete, com confirmação)
 * roteada por nível UI + guard de API (SUPER_ADMIN apenas — IGR-12).
 */
export default async function AdminLiderancaPage() {
  const claims = await getClaims();

  const leitor = await can(claims?.role ?? "", "igrejas", "ler");
  const escritor = await can(claims?.role ?? "", "igrejas", "escrever");
  const superAdmin = claims?.role === "SUPER_ADMIN";

  if (!leitor) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="hero-background-admin border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Igrejas & Liderança
            </h1>
            <p className="font-serif text-white/60">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-[#e0c872] transition-colors"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
      </section>
    );
  }

  let igrejas: Awaited<ReturnType<typeof listarIgrejas>> = [];
  let falhaConsulta = false;
  try {
    igrejas = await listarIgrejas();
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Igrejas & Liderança
            </h1>
            <p className="font-serif text-base text-primary/70">
              Gestão das igrejas e da liderança institucional.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/lideranca/nova"
              className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent-light text-white font-sans text-sm font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Nova igreja
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar as igrejas. Tente novamente mais tarde.
            </p>
          </div>
        ) : igrejas.length === 0 ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-base text-white/60">
              Nenhuma igreja cadastrada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto hero-background-admin border border-white/10 rounded-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-sans text-xs font-semibold uppercase tracking-wider text-white/90">
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Igreja</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Líderes</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Cadastrada em</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {igrejas.map((igreja) => (
                  <tr
                    key={igreja.id}
                    className="bg-white/5 border-b border-white/20 last:border-1 hover:bg-white/15 transition-colors"
                  >
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-white">
                        <Building2 size={16} className="text-accent-light" aria-hidden="true" />
                        {igreja.name}
                      </p>
                      <p className="ml-6 font-serif text-sm text-white/60">
                        {igreja.short_name} · {igreja.city}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-serif text-accent-light font-bold">
                      <LideresCount igrejaId={igreja.id} />
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-serif text-sm text-white/80">
                      {new Date(igreja.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/lideranca/${igreja.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-white/75 hover:text-white transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/lideranca/${igreja.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-accent-light hover:text-accent-light/75 transition-colors"
                          >
                            <Pencil size={15} aria-hidden="true" />
                            Editar
                          </Link>
                        )}
                        {superAdmin && (
                          <ExcluirIgrejaBotao
                            igrejaId={igreja.id}
                            nome={igreja.name}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

async function LideresCount({ igrejaId }: { igrejaId: string }) {
  try {
    const lideres = await listarLideres(igrejaId);
    return lideres.length;
  } catch {
    return "—";
  }
}
