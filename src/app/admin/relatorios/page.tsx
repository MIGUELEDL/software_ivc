import {
  CalendarDays,
  Download,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarDocumentos } from "@/lib/admin/relatorios";
import { DOCUMENT_CATEGORIES } from "@/lib/admin/relatorios-constants";
import type { DocumentoCategoria } from "@/lib/admin/relatorios-constants";
import { UploadForm } from "./upload-form";
import { DeleteButton } from "./delete-button";

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Página do módulo Relatórios/Documentos (REL-01/11/19): seção Relatórios
 * com exportação CSV por tipo e período, e seção Documentos com listagem
 * cronológica, chips de categoria, upload (escritores) e download (leitores).
 * Guarda de leitura `relatorios` — denied-block para não-autorizados.
 */
export default async function AdminRelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const categoriaParam =
    typeof params.categoria === "string" ? params.categoria : "";

  const claims = await getClaims();
  const papel = claims?.role ?? "";
  const leitor = await can(papel, "relatorios", "ler");
  const escritor = await can(papel, "relatorios", "escrever");

  if (!leitor) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="hero-background-admin border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Relatórios
            </h1>
            <p className="text-primary/60">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  let documentos: Awaited<ReturnType<typeof listarDocumentos>> = [];
  try {
    documentos = await listarDocumentos(
      (categoriaParam as DocumentoCategoria) || undefined
    );
  } catch {
    // empty on error
  }

  const estiloChipAtivo =
    "rounded-full hero-background-accent text-white/90 px-3 py-1.5 font-sans text-xs font-bold transition-colors";
  const estiloChipInativo =
    "rounded-full border border-white/50 text-white/75 hover:border-accent-light hover:text-accent-light px-3 py-1.5 font-sans text-xs font-bold transition-colors";

  function hrefCategoria(cat: string): string {
    return cat === ""
      ? "/admin/relatorios"
      : `/admin/relatorios?categoria=${cat}`;
  }

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Relatórios
          </h1>
          <p className="text-primary/70">
            Exportações e documentos da igreja.
          </p>
        </div>

        {/* --- Seção Relatórios --- */}
        <div className="hero-background-admin border border-white/10 rounded-xl p-5 mb-8">
          <h2 className="font-sans text-lg font-bold text-white/90 mb-4">
            Exportar relatório
          </h2>
          <form
            method="GET"
            action="/api/admin/relatorios/exportar"
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <input type="hidden" name="tipo" value="financeiro" />
            <div className="min-w-0 basis-full sm:basis-auto">
              <label
                htmlFor="data_inicio"
                className="block font-sans text-xs font-semibold text-white/90 uppercase tracking-wider mb-1"
              >
                De
              </label>
              <input
                id="data_inicio"
                name="data_inicio"
                type="date"
                className="w-full bg-white/20 border border-white/10 text-white/75 rounded-lg px-3 py-2 font-sans focus:border-accent-light focus:outline-none transition-colors"
              />
            </div>
            <div className="min-w-0 basis-full sm:basis-auto">
              <label
                htmlFor="data_fim"
                className="block font-sans text-xs font-semibold text-white/90 uppercase tracking-wider mb-1"
              >
                Até
              </label>
              <input
                id="data_fim"
                name="data_fim"
                type="date"
                className="w-full bg-white/20 border border-white/10 text-white/75 rounded-lg px-3 py-2 font-sans focus:border-accent-light focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent-light text-white/90 font-sans font-bold rounded-lg px-5 py-2 transition-colors cursor-pointer"
            >
              <Download size={16} aria-hidden="true" />
              Financeiro (CSV)
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/admin/relatorios/exportar?tipo=membros"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-accent-light/10 hover:border-accent-light hover:text-accent-light font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Membros
            </a>
            <a
              href="/api/admin/relatorios/exportar?tipo=eventos"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-accent-light/10 hover:border-accent-light hover:text-accent-light font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Eventos
            </a>
            <a
              href="/api/admin/relatorios/exportar?tipo=patrimonio"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-accent-light/10 hover:border-accent-light hover:text-accent-light font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Patrimônio
            </a>
          </div>
        </div>

        {/* --- Seção Documentos --- */}
        <div className="hero-background-admin border border-white/10 rounded-xl p-5">
          <h2 className="font-sans text-lg font-bold text-white/90 mb-4">
            Documentos
          </h2>

          {/* Chips de categoria */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-white/90">
              Categoria:
            </span>
            <Link
              href={hrefCategoria("")}
              className={categoriaParam === "" ? estiloChipAtivo : estiloChipInativo}
            >
              Todas
            </Link>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={hrefCategoria(cat)}
                className={
                  categoriaParam === cat ? estiloChipAtivo : estiloChipInativo
                }
              >
                {cat}
              </Link>
            ))}
          </div>

          {documentos.length === 0 ? (
            <div className="rounded-xl bg-white/20 p-10 text-center">
              <FileText
                size={32}
                className="mx-auto mb-3 text-white/30"
                aria-hidden="true"
              />
              <p className="text-base text-white/60">
                Nenhum documento cadastrado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 font-sans text-xs font-semibold uppercase tracking-wider text-white/80">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Tamanho</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => (
                    <tr
                      key={doc.id}
                      className="bg-white/10 border-b border-white/5 last:border-0 hover:bg-white/15 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-sans font-semibold text-white">
                          {doc.title}
                        </span>
                        {doc.description && (
                          <p className="text-xs text-white/50 mt-0.5">
                            {doc.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-[#c9a84c]/10 text-[#c9a84c] px-2.5 py-0.5 font-sans text-xs font-bold">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {formatarTamanho(doc.file_size)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 text-sm text-white/60">
                          <CalendarDays
                            size={14}
                            className="text-[#c9a84c]"
                            aria-hidden="true"
                          />
                          {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`/api/admin/relatorios/documentos/${doc.id}/download`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/50 text-white hover:bg-accent-light/10 hover:border-accent-light hover:text-accent-light font-sans text-xs font-bold px-3 py-1.5 transition-colors"
                          >
                            <Download size={12} aria-hidden="true" />
                            Baixar
                          </a>
                          {escritor && (
                            <DeleteButton documentoId={doc.id} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {escritor && <UploadForm />}
        </div>
      </div>
    </section>
  );
}
