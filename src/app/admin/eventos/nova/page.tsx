import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { EventoNovoForm } from "./evento-novo-form";

/**
 * Cadastro de novo evento (EVT-04/05). A página de UI exige papel escritor
 * (leitor vê aviso, sem form); o guard real de escrita fica no route handler
 * (POST /api/admin/eventos → 403 p/ leitor).
 */
export default async function EventoNovoPage() {
  const claims = await getClaims();
  const escritor = await can(claims?.role ?? "", "eventos", "escrever");

  if (!escritor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Novo evento
            </h1>
            <p className="font-serif text-text-dark/70">
              Apenas escritores podem cadastrar eventos.
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

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/admin/eventos"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos eventos
        </Link>

        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Novo evento
          </h1>
          <p className="font-serif text-base text-text-dark/60">
            Cadastre um evento da agenda da igreja.
          </p>
        </div>

        <EventoNovoForm />
      </div>
    </section>
  );
}