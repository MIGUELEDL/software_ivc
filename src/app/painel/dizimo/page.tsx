import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import PixDonation from "@/components/PixDonation";
import { getClaims } from "@/lib/auth/claims";
import type { Member } from "@/lib/painel/members";
import { getMemberByAuthUid } from "@/lib/painel/members";
import { buildBrCodePessoal } from "@/lib/pix";

export default async function DizimoPage() {
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
      <ErrorSection message="Não foi possível carregar seu dízimo. Tente novamente mais tarde." />
    );
  }

  // PAINEL-07: sem registro em members, o membro precisa do autocadastro.
  if (!member) {
    redirect("/painel/perfil?primeiro=1");
  }

  let payload: string | null = null;
  try {
    payload = buildBrCodePessoal(member.matricula);
  } catch {
    payload = null;
  }

  if (!payload) {
    return (
      <ErrorSection message="Não foi possível gerar seu QR de dízimo. Tente novamente mais tarde." />
    );
  }

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          href="/painel"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-white/60 hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel
        </Link>

        <div className="text-center mb-12">
          <h1 className="font-sans text-3xl font-bold text-white mb-2">
            Dízimo pessoal
          </h1>
          <p className="font-serif text-base text-white/50 max-w-2xl mx-auto">
            Escaneie o QR ou use o código copia-e-cola. A chave PIX é a oficial
            da igreja (CNPJ) e sua matrícula{" "}
            <span className="font-bold text-accent">{member.matricula}</span>{" "}
            identifica a contribuição.
          </p>
        </div>

        <PixDonation payload={payload} />
      </div>
    </section>
  );
}

function ErrorSection({ message }: { message: string }) {
  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div
          className="rounded-xl hero-background-admin border border-white/10 p-10 text-center"
          role="alert"
        >
          <h1 className="font-sans text-2xl font-bold text-white mb-3">
            Dízimo pessoal
          </h1>
          <p className="font-serif text-white/60">{message}</p>
          <Link
            href="/painel"
            className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-accent hover:text-accent-light transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel
          </Link>
        </div>
      </div>
    </section>
  );
}