import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { MembroNovoForm } from "./membro-novo-form";

/**
 * Cadastro de novo membro (ADMINMEM-06..12). A página de UI exige papel
 * escritor (leitor vê aviso, sem form); o guard real de escrita fica no
 * route handler (POST /api/admin/membros → 403 p/ leitor, probado em T23).
 * O form client exibe a senha temporária 1× em estado local — nunca em URL.
 */
export default async function MembroNovoPage() {
  const claims = await getClaims();
  const escritor = await can(claims?.role ?? "", "membros", "escrever");

  if (!escritor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl hero-background-admin shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Novo membro
            </h1>
            <p className="font-serif text-white/70">
              Apenas escritores podem cadastrar membros.
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

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/admin/membros"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos membros
        </Link>

        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Novo membro
          </h1>
          <p className="font-serif text-base text-primary/80">
            Cadastre a pessoa e entregue manualmente a senha temporária gerada
            (exibida uma única vez).
          </p>
        </div>

        <MembroNovoForm />
      </div>
    </section>
  );
}