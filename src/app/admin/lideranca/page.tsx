import { ArrowLeft, Building2, Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Igrejas & Liderança
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

  let igrejas: Awaited<ReturnType<typeof listarIgrejas>> = [];
  let falhaConsulta = false;
  try {
    igrejas = await listarIgrejas();
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Igrejas & Liderança
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Gestão das igrejas e da liderança institucional.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/lideranca/nova"
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Nova igreja
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar as igrejas. Tente novamente mais tarde.
            </p>
          </div>
        ) : igrejas.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhuma igreja cadastrada.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                  <th className="px-6 py-4">Igreja</th>
                  <th className="px-6 py-4">Líderes</th>
                  <th className="px-6 py-4">Cadastrada em</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {igrejas.map((igreja) => (
                  <tr
                    key={igreja.id}
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-text-dark">
                        <Building2 size={16} className="text-primary" aria-hidden="true" />
                        {igreja.name}
                      </p>
                      <p className="ml-6 font-serif text-sm text-text-dark/60">
                        {igreja.short_name} · {igreja.city}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-serif text-primary font-bold">
                      <LideresCount igrejaId={igreja.id} />
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-text-dark/70">
                      {new Date(igreja.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/lideranca/${igreja.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/lideranca/${igreja.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
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