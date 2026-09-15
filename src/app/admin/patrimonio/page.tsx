import {
  ArrowLeft,
  CircleDollarSign,
  Eye,
  MapPin,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarAssets } from "@/lib/admin/assets";

/**
 * Lista de bens patrimoniais (PAT-07): nome, categoria, tombo, localização,
 * valor e badges de `status`. Guarda de leitura `patrimonio`
 * (FINANCEIRO/SECRETARIA/LIDER leem; MEMBRO e anônimos veem 403); ações de
 * escrita ("Novo bem", editar) só para escritores (design, sec. Páginas admin).
 */
export default async function AdminPatrimonioPage() {
  const claims = await getClaims();

  const leitor = await can(claims?.role ?? "", "patrimonio", "ler");
  const escritor = await can(claims?.role ?? "", "patrimonio", "escrever");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Patrimônio
            </h1>
            <p className="font-serif text-text-dark/70">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin"
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

  let assets: Awaited<ReturnType<typeof listarAssets>> = [];
  let falhaConsulta = false;
  try {
    assets = await listarAssets();
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Patrimônio
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Inventário dos bens da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/patrimonio/nova"
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo bem
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar o inventário. Tente novamente mais
              tarde.
            </p>
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhum bem cadastrado.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                  <th className="px-6 py-4">Bem</th>
                  <th className="px-6 py-4">Tombo</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-text-dark">
                        <Package
                          size={16}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          {asset.name}
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-primary">
                            {asset.category}
                          </span>
                        </span>
                      </p>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-text-dark/70">
                      {asset.numero_patrimonio ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                        <MapPin
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        {asset.location ?? "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                        <CircleDollarSign
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        {asset.acquisition_value !== null
                          ? asset.acquisition_value.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                          asset.status === "ATIVO"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/patrimonio/${asset.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/patrimonio/${asset.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                          >
                            <Pencil size={15} aria-hidden="true" />
                            Editar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}