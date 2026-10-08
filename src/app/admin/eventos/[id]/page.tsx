import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarEventos } from "@/lib/admin/eventos";
import { EventoEditarForm } from "./evento-editar-form";

/**
 * Detalhe do evento (EVT-08/09/10/11): dados completos + edição com toggle
 * `visivel`/`status` (soft-delete, sem DELETE — EVT-03). Guarda de leitura
 * `eventos` (exibe 403 se não ler); qualquer papel admin lê o detalhe; form
 * de escrita só para escritores. Guard real nas rotas de API (PATCH → 403
 * para leitor).
 */
export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "eventos", "ler");
  const escritor = await can(claims?.role ?? "", "eventos", "escrever");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-background-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Evento
            </h1>
            <p className="font-serif text-white/70">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin/eventos"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar aos eventos
            </Link>
          </div>
        </div>
      </section>
    );
  }

  let evento: Awaited<ReturnType<typeof listarEventos>>[number] | null = null;
  try {
    const eventos = await listarEventos();
    evento = eventos.find((e) => e.id === id) ?? null;
  } catch {
    notFound();
  }

  if (!evento) {
    notFound();
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/admin/eventos"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos eventos
        </Link>

        <div className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-sans text-2xl font-bold text-white">
                {evento.title}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 font-serif text-sm text-white/70">
                <MapPin size={14} className="text-accent-light" aria-hidden="true" />
                {evento.location}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                  evento.visivel
                    ? "bg-green-200 text-green-600"
                    : "bg-gray-200 text-gray-500"
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
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/60">
                Data
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-white/80">
                <CalendarDays size={15} className="text-accent-light" aria-hidden="true" />
                {new Date(evento.date + "T00:00:00").toLocaleDateString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/60">
                Hora
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-white/80">
                <Clock size={15} className="text-accent-light" aria-hidden="true" />
                {evento.time}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/60">
                Descrição
              </dt>
              <dd className="mt-1 font-serif text-base text-white/80">
                {evento.description ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        {escritor && <EventoEditarForm evento={evento} />}
      </div>
    </section>
  );
}