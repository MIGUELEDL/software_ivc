import { EVENTS, SOCIAL, CHURCH } from "@/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";

export function generateStaticParams() {
  return EVENTS.map((event) => ({ id: event.id }));
}

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = EVENTS.find((e) => e.id === id);
  if (!event) notFound();

  const whatsappUrl = `${SOCIAL.whatsapp}?text=${encodeURIComponent(
    `Gostaria de me inscrever no evento ${event.title}`
  )}`;

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/eventos"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-text-dark/60 hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </Link>

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-12">
          <h1 className="font-sans text-3xl sm:text-4xl font-bold text-primary mb-6">
            {event.title}
          </h1>

          <div className="space-y-3 text-text-dark/70 font-serif text-base mb-8">
            <p className="inline-flex items-center gap-2">
              <CalendarDays size={18} className="text-accent" />
              {event.date}
            </p>
            <p className="inline-flex items-center gap-2">
              <Clock size={18} className="text-accent" />
              {event.time}
            </p>
            <p className="inline-flex items-center gap-2">
              <MapPin size={18} className="text-accent" />
              {event.location}
            </p>
          </div>

          <p className="font-serif text-lg leading-relaxed text-text-dark/80 mb-10">
            {event.description}
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] hover:bg-[#1da851] text-white font-sans font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <MessageCircle size={20} />
            Inscrever-se via WhatsApp
          </a>
        </div>

        <p className="mt-8 text-center font-serif text-sm text-text-dark/50">
          {CHURCH.name} — {CHURCH.city}
        </p>
      </div>
    </section>
  );
}