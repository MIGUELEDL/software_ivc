import {
  ArrowLeft,
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
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Relatórios
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

  let documentos: Awaited<ReturnType<typeof listarDocumentos>> = [];
  try {
    documentos = await listarDocumentos(
      (categoriaParam as DocumentoCategoria) || undefined
    );
  } catch {
    // empty on error
  }

  const estiloChipAtivo =
    "rounded-full bg-primary text-white px-3 py-1.5 font-sans text-xs font-bold transition-colors";
  const estiloChipInativo =
    "rounded-full border border-text-dark/15 text-text-dark/60 hover:border-primary hover:text-primary px-3 py-1.5 font-sans text-xs font-bold transition-colors";

  function hrefCategoria(cat: string): string {
    return cat === ""
      ? "/admin/relatorios"
      : `/admin/relatorios?categoria=${cat}`;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Relatórios
          </h1>
          <p className="font-serif text-base text-text-dark/60">
            Exportações e documentos da igreja.
          </p>
        </div>

        {/* --- Seção Relatórios --- */}
        <div className="rounded-2xl bg-white shadow-xl p-5 mb-8">
          <h2 className="font-sans text-lg font-bold text-text-dark mb-4">
            Exportar relatório
          </h2>
          <form
            method="GET"
            action="/api/admin/relatorios/exportar"
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <input type="hidden" name="tipo" value="financeiro" />
            <div>
              <label
                htmlFor="data_inicio"
                className="block font-sans text-xs font-semibold text-text-dark/50 mb-1"
              >
                De
              </label>
              <input
                id="data_inicio"
                name="data_inicio"
                type="date"
                className="rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="data_fim"
                className="block font-sans text-xs font-semibold text-text-dark/50 mb-1"
              >
                Até
              </label>
              <input
                id="data_fim"
                name="data_fim"
                type="date"
                className="rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold px-5 py-2 transition-colors"
            >
              <Download size={16} aria-hidden="true" />
              Financeiro (CSV)
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/admin/relatorios/exportar?tipo=membros"
              className="inline-flex items-center gap-2 rounded-lg border border-text-dark/15 text-text-dark/70 hover:border-primary hover:text-primary font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Membros
            </a>
            <a
              href="/api/admin/relatorios/exportar?tipo=eventos"
              className="inline-flex items-center gap-2 rounded-lg border border-text-dark/15 text-text-dark/70 hover:border-primary hover:text-primary font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Eventos
            </a>
            <a
              href="/api/admin/relatorios/exportar?tipo=patrimonio"
              className="inline-flex items-center gap-2 rounded-lg border border-text-dark/15 text-text-dark/70 hover:border-primary hover:text-primary font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              <Download size={14} aria-hidden="true" />
              Patrimônio
            </a>
          </div>
        </div>

        {/* --- Seção Documentos --- */}
        <div className="rounded-2xl bg-white shadow-xl p-5">
          <h2 className="font-sans text-lg font-bold text-text-dark mb-4">
            Documentos
          </h2>

          {/* Chips de categoria */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
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
            <div className="rounded-xl bg-bg-gray p-10 text-center">
              <FileText
                size={32}
                className="mx-auto mb-3 text-text-dark/30"
                aria-hidden="true"
              />
              <p className="font-serif text-base text-text-dark/70">
                Nenhum documento cadastrado.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-text-dark/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
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
                      className="border-b border-text-dark/5 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span className="font-sans font-semibold text-text-dark">
                          {doc.title}
                        </span>
                        {doc.description && (
                          <p className="font-serif text-xs text-text-dark/50 mt-0.5">
                            {doc.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-sans text-xs font-bold">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-serif text-sm text-text-dark/70">
                        {formatarTamanho(doc.file_size)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                          <CalendarDays
                            size={14}
                            className="text-primary"
                            aria-hidden="true"
                          />
                          {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`/api/admin/relatorios/documentos/${doc.id}/download`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-text-dark/15 text-text-dark/70 hover:border-primary hover:text-primary font-sans text-xs font-bold px-3 py-1.5 transition-colors"
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
