import { ArrowLeft, Church } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { getIgreja, listarLideres } from "@/lib/admin/lideranca";
import { EditarIgrejaForm } from "./editar-igreja-form";
import { LiderNovoForm } from "./lider-novo-form";
import { LiderLinha } from "./lider-linha";
import { ExcluirIgrejaBotao } from "../excluir-igreja-botao";

/**
 * Detalhe da igreja (IGR-09/10): dados, edição, gestão de líderes e exclusão.
 * Guarda de leitura `igrejas` (exibe 403 se não ler); qualquer papel admin
 * lê o detalhe; forms de escrita (editar igreja, líderes) só para escritores;
 * exclusão (hard-delete com confirmação) só `SUPER_ADMIN` (IGR-12). Guard
 * real nas rotas de API (403 para leitor, SUPER_ADMIN revalida no DELETE).
 */
export default async function LiderancaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "igrejas", "ler");
  const escritor = await can(claims?.role ?? "", "igrejas", "escrever");
  const superAdmin = claims?.role === "SUPER_ADMIN";

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Igreja
            </h1>
            <p className="font-serif text-text-dark/70">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin/lideranca"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar às igrejas
            </Link>
          </div>
        </div>
      </section>
    );
  }

  let igreja: Awaited<ReturnType<typeof getIgreja>> = null;
  let lideres: Awaited<ReturnType<typeof listarLideres>> = [];
  try {
    igreja = await getIgreja(id);
    if (igreja) {
      lideres = await listarLideres(id);
    }
  } catch {
    notFound();
  }

  if (!igreja) {
    notFound();
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            href="/admin/lideranca"
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar às igrejas
          </Link>
          {superAdmin && (
            <ExcluirIgrejaBotao
              igrejaId={igreja.id}
              nome={igreja.name}
              redirecionar="/admin/lideranca"
            />
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Church size={18} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-sans text-2xl font-bold text-primary">
                {igreja.name}
              </h1>
              <p className="font-sans text-sm font-semibold text-primary">
                {igreja.short_name} · {igreja.city}
              </p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                CNPJ
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {igreja.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Fundada em
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {igreja.founded_date
                  ? new Date(igreja.founded_date + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Endereço
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {igreja.address}
              </dd>
            </div>
          </dl>
        </div>

        {escritor && <EditarIgrejaForm igreja={igreja} />}

        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-sans text-lg font-bold text-primary">
              Líderes ({lideres.length})
            </h2>
          </div>

          {escritor && <LiderNovoForm igrejaId={igreja.id} />}

          {lideres.length === 0 ? (
            <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
              <p className="font-serif text-base text-text-dark/70">
                Nenhum líder cadastrado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lideres.map((lider) => (
                <LiderLinha key={lider.id} lider={lider} escritor={escritor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}