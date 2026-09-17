import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarAuditoria } from "@/lib/admin/auditoria";
import AuditoriaFiltros from "./auditoria-filtros";

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const claims = await getClaims();
  const papel = claims?.role ?? "";

  const leitor = await can(papel, "auditoria", "ler");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Auditoria
            </h1>
            <p className="font-serif text-text-dark/70">
              Voce nao tem permissao para acessar este modulo.
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

  const params = await searchParams;
  const data_inicio = params.data_inicio ?? undefined;
  const data_fim = params.data_fim ?? undefined;
  const acao = params.acao ?? undefined;
  const entidade = params.entidade ?? undefined;
  const offset = Math.max(0, parseInt(params.offset ?? "0", 10) || 0);
  const limit = 20;

  const { logs, total } = await listarAuditoria({
    data_inicio,
    data_fim,
    acao,
    entidade,
    offset,
    limit,
  });

  const totalPaginas = Math.ceil(total / limit);
  const paginaAtual = Math.floor(offset / limit) + 1;

  function formatarData(timestamp: string) {
    return new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function construirUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.data_inicio) sp.set("data_inicio", params.data_inicio);
    if (params.data_fim) sp.set("data_fim", params.data_fim);
    if (params.acao) sp.set("acao", params.acao);
    if (params.entidade) sp.set("entidade", params.entidade);
    if (params.offset) sp.set("offset", params.offset);
    return `/admin/auditoria?${sp.toString()}`;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-sans text-xs font-bold text-primary hover:text-accent"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <FileText size={24} className="text-primary" />
          <h1 className="font-sans text-2xl font-bold text-text-dark">
            Auditoria
          </h1>
        </div>

        <AuditoriaFiltros
          data_inicio={data_inicio}
          data_fim={data_fim}
          acao={acao}
          entidade={entidade}
        />

        <div className="mt-6 rounded-2xl bg-white shadow-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-serif text-text-dark/70">
                Nenhum log de auditoria encontrado.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        Data/Hora
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        Autor
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        Acao
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        Entidade
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        ID
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-text-dark/60 uppercase">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-sans text-sm text-text-dark">
                          {formatarData(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-text-dark">
                          {log.autor ?? "Sistema"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 font-sans text-xs font-bold text-primary">
                            {log.acao}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-text-dark">
                          {log.entidade}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-text-dark/70">
                          {log.entidade_id ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-text-dark/70">
                          {log.ip ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="font-sans text-sm text-text-dark/60">
                    Pagina {paginaAtual} de {totalPaginas} ({total} registros)
                  </p>
                  <div className="flex gap-2">
                    {paginaAtual > 1 && (
                      <Link
                        href={construirUrl({
                          data_inicio,
                          data_fim,
                          acao,
                          entidade,
                          offset: String((paginaAtual - 2) * limit),
                        })}
                        className="rounded bg-gray-100 px-3 py-1 font-sans text-xs font-bold text-text-dark hover:bg-gray-200"
                      >
                        Anterior
                      </Link>
                    )}
                    {paginaAtual < totalPaginas && (
                      <Link
                        href={construirUrl({
                          data_inicio,
                          data_fim,
                          acao,
                          entidade,
                          offset: String(paginaAtual * limit),
                        })}
                        className="rounded bg-gray-100 px-3 py-1 font-sans text-xs font-bold text-text-dark hover:bg-gray-200"
                      >
                        Proximo
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
