import {
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
import { TotalBloco } from "@/components/admin/total-bloco";
import { DeleteAssetButton } from "./delete-button";

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
  const administrador = await can(claims?.role ?? "", "patrimonio", "administrar");

  if (!leitor) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div
            className="hero-background-admin border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Patrimônio
            </h1>
            <p className="font-serif text-primary/60">
              Você não tem permissão para acessar este módulo.
            </p>
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
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Patrimônio
            </h1>
            <p className="font-serif text-base text-primary/70">
              Inventário dos bens da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/patrimonio/nova"
              className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent text-white font-sans font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo Registro
            </Link>
          )}
        </div>

        {falhaConsulta ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar o inventário. Tente novamente mais
              tarde.
            </p>
          </div>
        ) : (
          <div className="hero-background-admin border border-white/10 rounded-xl overflow-hidden overflow-x-auto tabela-scroll">
            {/* TAB-06: faixa TOTAL no cabeçalho do card (padrão usuários) */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <TotalBloco total={assets.length} />
            </div>
            {assets.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-serif text-base text-white/70">
                  Nenhum bem cadastrado.
                </p>
              </div>
            ) : (
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 font-sans text-sm font-bold text-white/90 uppercase tracking-wider">
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Bem</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">ID</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Localização</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Valor</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Situação</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="bg-white/5 border-b border-white/10 last:border-1 hover:bg-white/15 transition-colors"
                  >
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-2 font-sans font-semibold text-white">
                        <Package
                          size={16}
                          className="text-accent-light"
                          aria-hidden="true"
                        />
                        <span>
                          {asset.name}
                          <span className="ml-2 rounded-full bg-accent-light/10 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-accent-light">
                            {asset.category}
                          </span>
                        </span>
                      </p>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-serif text-sm text-white/80">
                      {asset.numero_patrimonio ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-white/80">
                        <MapPin
                          size={14}
                          className="text-accent-light"
                          aria-hidden="true"
                        />
                        {asset.location ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-white/80">
                        <CircleDollarSign
                          size={14}
                          className="text-accent-light"
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
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${
                          asset.status === "ATIVO"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/patrimonio/${asset.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-white/75 hover:text-white transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        {escritor && (
                          <Link
                            href={`/admin/patrimonio/${asset.id}?editar=1`}
                            className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-accent-light hover:text-accent-light/75 transition-colors"
                          >
                            <Pencil size={15} aria-hidden="true" />
                            Editar
                          </Link>
                        )}
                        {administrador && (
                          <DeleteAssetButton assetId={asset.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
