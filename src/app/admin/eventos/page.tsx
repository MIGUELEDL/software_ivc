import { ArrowLeft, CalendarDays, Eye, MapPin, Pencil, Plus } from "lucide-react";
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
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Eventos
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

  let eventos: Awaited<ReturnType<typeof listarEventos>> = [];
  let falhaConsulta = false;
  try {
    eventos = await listarEventos();
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Eventos
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Agenda da igreja e visibilidade no portal.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/eventos/nova"
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo evento
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar os eventos. Tente novamente mais tarde.
            </p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhum evento cadastrado.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
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
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-text-dark">
                        <CalendarDays size={16} className="text-primary" aria-hidden="true" />
                        {evento.title}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-text-dark/70">
                      {new Date(evento.date + "T00:00:00").toLocaleDateString(
                        "pt-BR"
                      )}{" "}
                      · {evento.time}
                    </td>
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                        <MapPin size={14} className="text-primary" aria-hidden="true" />
                        {evento.location}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                            evento.visivel
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {evento.visivel ? "Visível" : "Oculto"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                            evento.status === "ATIVO"
                              ? "bg-primary/10 text-primary"
                              : "bg-red-100 text-red-700"
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
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/eventos/${evento.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
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