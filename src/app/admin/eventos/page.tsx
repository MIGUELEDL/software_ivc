import { CalendarDays, Eye, MapPin, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarEventos } from "@/lib/admin/eventos";

/**
 * Lista de eventos (EVT-07): título, data, local e badges de `visivel`/`status`.
 * Guarda de leitura `eventos` (FINANCEIRO/PATRIMONIAL/LIDER lêem; MEMBRO e
 * anônimos veem 403); ações de escrita ("Novo evento", editar) só para
 * escritores (design, sec. Páginas admin).
 */
export default async function AdminEventosPage() {
  const claims = await getClaims();

  const leitor = await can(claims?.role ?? "", "eventos", "ler");
  const escritor = await can(claims?.role ?? "", "eventos", "escrever");

  if (!leitor) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Eventos
            </h1>
            <p className="font-serif text-white/60">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  let eventos: Awaited<ReturnType<typeof listarEventos>> = [];
  let falhaConsulta = false;
  try {
    eventos = await listarEventos();
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Eventos
            </h1>
            <p className="font-serif text-base text-primary/70">
              Agenda da igreja e visibilidade no portal.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/eventos/nova"
              className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent-light text-white font-sans font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo evento
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar os eventos. Tente novamente mais tarde.
            </p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-base text-white/60">
              Nenhum evento cadastrado.
            </p>
          </div>
        ) : (
          <div className="hero-background-admin border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-sans text-sm font-bold text-white uppercase tracking-wider">
                  <th className="px-6 py-4">Evento</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Local</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr
                    key={evento.id}
                    className="bg-white/4 border-b border-white/10 last:border-1"
                  >
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-white">
                        <CalendarDays size={16} className="text-accent-light" aria-hidden="true" />
                        {evento.title}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-white/80">
                      {new Date(evento.date + "T00:00:00").toLocaleDateString(
                        "pt-BR"
                      )}{" "}
                      · {evento.time}
                    </td>
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-white/80">
                        <MapPin size={14} className="text-accent-light" aria-hidden="true" />
                        {evento.location}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                            evento.visivel
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {evento.visivel ? "Visível" : "Oculto"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                            evento.status === "EM ABERTO"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {evento.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/eventos/${evento.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-white/75 hover:text-white transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/eventos/${evento.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-accent-light hover:text-accent-light/75 transition-colors"
                          >
                            <Pencil size={15} aria-hidden="true" />
                            Editar
                          </Link>
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
