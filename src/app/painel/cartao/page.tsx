import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
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
    falhaConsulta = true;
  }

  if (falhaConsulta) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
<div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="rounded-xl bg-[#132744] border border-white/10 p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Cartão de membro
            </h1>
            <p className="font-serif text-white/60">
              Não foi possível carregar seu cartão. Tente novamente mais tarde.
            </p>
            <Link
              href="/painel"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-[#c9a84c] hover:text-[#e0c872] transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!member) {
    redirect("/painel/perfil?primeiro=1");
  }

  const canPrint = await can(claims.role ?? "", "membros", "escrever");

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Link
          href="/painel"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-white/60 hover:text-[#c9a84c] mb-6 transition-colors print:hidden"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel
        </Link>

        <div className="text-center mb-8 print:hidden">
          <h1 className="font-sans text-3xl font-bold text-white mb-2">
            Cartão de membro
          </h1>
          <p className="font-serif text-base text-white/50">
            Imprima o cartão para identificação nos cultos.
          </p>
        </div>

        <MemberCard member={member} />

        {canPrint && (
          <div className="mt-6 text-center print:hidden">
            <PrintButton />
          </div>
        )}
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
