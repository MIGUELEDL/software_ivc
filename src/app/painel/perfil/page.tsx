import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { getMemberByAuthUid } from "@/lib/painel/members";
import { PerfilForm } from "./perfil-form";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const claims = await getClaims();
  if (!claims) {
    redirect("/login");
  }

  let member = null;
  try {
    member = await getMemberByAuthUid(claims.sub);
  } catch {
    member = null;
  }

  const sucesso =
    typeof params.sucesso === "string" ? params.sucesso : null;
  const erro = typeof params.erro === "string" ? params.erro : null;
  const primeiro = params.primeiro === "1";
  const matricula =
    typeof params.matricula === "string" ? params.matricula : "";

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link
          href="/painel"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary/80 hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel
        </Link>

        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Meus dados
          </h1>
          <p className="font-serif text-base text-primary/60">
            {member
              ? "Mantenha suas informações atualizadas."
              : "Complete seu cadastro para receber seu cartão e QR de dízimo."}
          </p>
        </div>

        {sucesso === "criado" && (
          <div
            className="mb-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 font-serif"
            role="status"
          >
            Cadastro realizado com sucesso! Sua matrícula é{" "}
            <span className="font-bold">{matricula || "IVC-####"}</span>.
          </div>
        )}

        {sucesso === "salvo" && (
          <div
            className="mb-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 font-serif"
            role="status"
          >
            Dados salvos com sucesso!
          </div>
        )}

        {sucesso === "foto" && (
          <div
            className="mb-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400 font-serif"
            role="status"
          >
            Foto atualizada com sucesso!
          </div>
        )}

        {erro === "cadastro_duplicado" && (
          <div
            className="mb-6 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-serif"
            role="alert"
          >
            Seu cadastro já existe. Recarregue a página para editar.
          </div>
        )}

        {primeiro && !member && (
          <div className="mb-6 rounded-lg hero-background-accent/10 border border-accent/40 px-4 py-3 text-sm text-accent-light font-serif">
            Para acessar o dízimo pessoal e o cartão, complete seu cadastro
            abaixo.
          </div>
        )}

        <PerfilForm member={member} />
      </div>
    </section>
  );
}