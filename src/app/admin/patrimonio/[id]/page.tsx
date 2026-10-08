import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Package,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarAssets } from "@/lib/admin/assets";
import { AssetEditarForm } from "./asset-editar-form";

/**
 * Detalhe do bem (PAT-08/09/10): dados completos + edição com toggle `status`
 * ATIVO/INATIVO (soft-delete/baixa, sem DELETE — PAT-03). Guarda de leitura
 * `patrimonio` (exibe 403 se não ler); form de escrita só para escritores.
 * Guard real nas rotas de API (PATCH → 403 para leitor).
 */
export default async function AssetDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "patrimonio", "ler");
  const escritor = await can(claims?.role ?? "", "patrimonio", "escrever");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-background-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Patrimônio
            </h1>
            <p className="font-serif text-white/70">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin/patrimonio"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao patrimônio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  let asset: Awaited<ReturnType<typeof listarAssets>>[number] | null = null;
  try {
    const assets = await listarAssets();
    asset = assets.find((a) => a.id === id) ?? null;
  } catch {
    notFound();
  }

  if (!asset) {
    notFound();
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/admin/patrimonio"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao patrimônio
        </Link>

        <div className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="flex items-center gap-2 font-sans text-2xl font-bold text-white">
                <Package size={22} className="text-white" aria-hidden="true" />
                {asset.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 font-serif text-sm text-white/60">
                <span className="rounded-full bg-accent-light/20 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-accent-light">
                  {asset.category}
                </span>
                {asset.numero_patrimonio && (
                  <span className="font-serif">· Tombo {asset.numero_patrimonio}</span>
                )}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                asset.status === "ATIVO"
                  ? "border border-green-500 bg-white/10 bg-green-100 text-green-500"
                  : "border border-red-500 bg-white/10 text-red-500"
              }`}
            >
              {asset.status}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
                Localização
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-white/90">
                <MapPin size={15} className="text-accent-light" aria-hidden="true" />
                {asset.location ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
                Valor de aquisição
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-white/90">
                <CircleDollarSign
                  size={15}
                  className="text-accent-light"
                  aria-hidden="true"
                />
                {asset.acquisition_value !== null
                  ? asset.acquisition_value.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
                Data de aquisição
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-white/90">
                <CalendarDays size={15} className="text-accent-light" aria-hidden="true" /> 
                {asset.acquisition_date
                  ? new Date(asset.acquisition_date + "T00:00:00").toLocaleDateString(
                      "pt-BR"
                    )
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
                Responsável
              </dt>
              <dd className="mt-1 font-serif text-base text-white/90">
                {asset.responsible ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
                Observações
              </dt>
              <dd className="mt-1 font-serif text-base text-white/90">
                {asset.observations ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        {escritor && <AssetEditarForm asset={asset} />}
      </div>
    </section>
  );
}