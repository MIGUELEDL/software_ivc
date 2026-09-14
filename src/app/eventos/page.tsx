import Link from "next/link";
import { listarEventosPublicos } from "@/lib/admin/eventos";
import type { Evento } from "@/lib/admin/eventos";
import { CalendarDays, Clock, MapPin, ArrowRight } from "lucide-react";

/**
 * Lista pública de eventos (EVT-12/15): async RSC que lê `events` do banco
 * via RLS anon, filtrando `visivel=true` e `status='ATIVO'` ordenado por
 * `date` asc (portal DB-driven, regressão RF-006). Falha de leitura degrada
 * para o estado vazio (mesmo padrão de Leadership/IGR-23).
 */
export default async function EventosPage() {
  let eventos: Evento[] = [];
  try {
    eventos = await listarEventosPublicos();
  } catch (erro) {
    console.error("portal: falha ao carregar eventos do banco", erro);
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossos <span className="text-accent">Eventos</span>
          </h1>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Momentos especiais para adorar, celebrar e viver a comunhão.
          </p>
        </div>

        {eventos.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-2xl bg-white shadow-xl p-12 text-center">
            <CalendarDays className="w-14 h-14 mx-auto mb-6 text-accent" />
            <h2 className="font-sans text-2xl font-bold text-primary mb-3">
              Em breve avisaremos os próximos eventos
            </h2>
            <p className="font-serif text-base text-text-dark/70">
              Acompanhe nossas redes sociais para ficar por dentro das novidades.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventos.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl bg-white shadow-xl p-8 flex flex-col hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <h2 className="font-sans text-2xl font-bold text-primary mb-4">
                  {event.title}
                </h2>
                <div className="space-y-2 text-text-dark/70 font-serif text-sm mb-6">
                  <p className="inline-flex items-center gap-2">
                    <CalendarDays size={16} className="text-accent" />
                    {event.date}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Clock size={16} className="text-accent" />
                    {event.time}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin size={16} className="text-accent" />
                    {event.location}
                  </p>
                </div>
                <Link
                  href={`/eventos/${event.id}`}
                  className="mt-auto inline-flex items-center gap-2 font-sans text-sm font-bold text-accent hover:text-primary transition-colors"
                >
                  Ver detalhes
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}