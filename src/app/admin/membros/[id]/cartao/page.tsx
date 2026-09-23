import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
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
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
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
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href={`/admin/membros/${id}`}
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors print:hidden"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao membro
        </Link>

        <div className="text-center mb-8 print:hidden">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Cartão de membro
          </h1>
          <p className="font-serif text-base text-text-dark/60">
            Imprima o cartão para identificação nos cultos.
          </p>
        </div>

        <MemberCard member={membro} />

        <div className="mt-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 85.6mm 53.98mm; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * { visibility: hidden; }
          #cartao-membro, #cartao-membro * { visibility: visible; }
          #cartao-membro {
            width: 85.6mm !important;
            height: 53.98mm !important;
            min-width: 85.6mm !important;
            min-height: 53.98mm !important;
            max-width: 85.6mm !important;
            max-height: 53.98mm !important;
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </section>
  );
}