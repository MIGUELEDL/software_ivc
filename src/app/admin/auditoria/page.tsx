import { FileText } from "lucide-react";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listarAuditoria } from "@/lib/admin/auditoria";
import { TotalBloco } from "@/components/admin/total-bloco";
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
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="hero-background-admin border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Auditoria
            </h1>
            <p className="text-primary/60">
              Você não tem permissão para acessar este módulo.
            </p>
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
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={24} className="text-accent-light" />
          <h1 className="font-sans text-2xl font-bold text-primary">
            Auditoria
          </h1>
        </div>

        <AuditoriaFiltros
          data_inicio={data_inicio}
          data_fim={data_fim}
          acao={acao}
          entidade={entidade}
        />

        <div className="mt-6 hero-background-admin border border-white/10 rounded-xl overflow-x-auto tabela-scroll">
          {/* TAB-06: faixa TOTAL no cabeçalho do card (padrão usuários) */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <TotalBloco total={total} />
          </div>
          {logs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-white/80">
                Nenhum log de auditoria encontrado.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto tabela-scroll">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        Autor
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        Entidade
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-bold text-white/80 uppercase tracking-wider">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="bg-white/5 border-b border-white/10 hover:bg-white/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-sans text-sm text-white">
                          {formatarData(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-white/80">
                          {log.autor ?? "Sistema"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-accent-light/10 px-2 py-0.5 font-sans text-xs font-bold text-accent-light">
                            {log.acao}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-white">
                          {log.entidade}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-white/60">
                          {log.entidade_id ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-white/60">
                          {log.ip ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <p className="font-sans text-sm text-white/60">
                    Página {paginaAtual} de {totalPaginas} ({total} registros)
                  </p>
                  <div className="flex gap-2">
                    {paginaAtual > 1 && (
                      <a
                        href={construirUrl({
                          data_inicio,
                          data_fim,
                          acao,
                          entidade,
                          offset: String((paginaAtual - 2) * limit),
                        })}
                        className="rounded bg-white/10 px-3 py-1 font-sans text-xs font-bold text-white hover:bg-white/20 transition-colors"
                      >
                        Anterior
                      </a>
                    )}
                    {paginaAtual < totalPaginas && (
                      <a
                        href={construirUrl({
                          data_inicio,
                          data_fim,
                          acao,
                          entidade,
                          offset: String(paginaAtual * limit),
                        })}
                        className="rounded bg-white/10 px-3 py-1 font-sans text-xs font-bold text-white hover:bg-white/20 transition-colors"
                      >
                        Próximo
                      </a>
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
