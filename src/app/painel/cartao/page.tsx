import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { getClaims } from "@/lib/auth/claims";
import type { Member } from "@/lib/painel/members";
import { getMemberByAuthUid } from "@/lib/painel/members";
import { PrintButton } from "./print-button";

export default async function CartaoPage() {
  const claims = await getClaims();

  if (!claims) {
    redirect("/login");
  }

  let member: Member | null = null;
  let falhaConsulta = false;
  try {
    member = await getMemberByAuthUid(claims.sub);
  } catch {
    // Banco indisponível: mostra erro amigável em vez de quebrar a página.
    falhaConsulta = true;
  }

  if (falhaConsulta) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-md mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Cartão de membro
            </h1>
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar seu cartão. Tente novamente mais tarde.
            </p>
            <Link
              href="/painel"
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

  // PAINEL-12: sem registro em members, o membro precisa do autocadastro.
  if (!member) {
    redirect("/painel/perfil?primeiro=1");
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-md mx-auto px-4">
        <Link
          href="/painel"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors print:hidden"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel
        </Link>

        <div className="text-center mb-8 print:hidden">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Cartão de membro
          </h1>
          <p className="font-serif text-base text-text-dark/60">
            Imprima o cartão para identificação nos cultos.
          </p>
        </div>

        <MemberCard member={member} />

        <div className="mt-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cartao-membro, #cartao-membro * { visibility: visible; }
          #cartao-membro {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}