import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MemberCard,
  MemberCardBack,
  CardPrintStyles,
} from "@/components/MemberCard";
import { PrintButton } from "@/app/painel/cartao/print-button";
import { getMembro } from "@/lib/admin/membros";

/**
 * Cartão admin do membro (ADMINMEM-25/26). Qualquer papel admin lê
 * (proxy + RLS `members_select_admin`). Membro inexistente → 404
 * (`notFound()`); falha de banco na leitura → erro amigável (padrão
 * `painel/cartao/page.tsx`), sem quebrar a página.
 */
export default async function MembroCartaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let membro = null;
  let falhaConsulta = false;
  try {
    membro = await getMembro(id);
  } catch {
    falhaConsulta = true;
  }

  if (falhaConsulta) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Cartão de membro
            </h1>
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar o cartão. Tente novamente mais tarde.
            </p>
            <Link
              href="/admin/membros"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar aos membros
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!membro) {
    notFound();
  }

  return (
    <section className="print-root pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="print-reset max-w-2xl mx-auto px-4">
        <Link
          href={`/admin/membros/${id}`}
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent-light mb-6 transition-colors print:hidden"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao membro
        </Link>

        <div className="text-center mb-8 print:hidden">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Cartão de membro
          </h1>
          <p className="font-serif text-base text-primary/70">
            Imprima o cartão para identificação nos cultos.
          </p>
        </div>

        <div id="cartao-print" className="space-y-8">
          <div className="card-face">
            <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-primary/60 print:hidden">
              Frente
            </p>
            <MemberCard member={membro} />
          </div>

          <div className="card-face">
            <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-primary/60 print:hidden">
              Verso
            </p>
            <MemberCardBack member={membro} />
          </div>
        </div>

        <div className="mt-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>

      <CardPrintStyles />
    </section>
  );
}