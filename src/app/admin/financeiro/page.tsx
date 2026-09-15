import { ArrowLeft, CalendarDays, Eye, Plus, Search } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import {
  listarLancamentos,
  type LancamentoFiltros,
} from "@/lib/admin/financeiro";

/**
 * Lista de lançamentos financeiros (FIN-01/AC-1, FIN-11/AC-26..29): descrição,
 * valor (R$), badges de `tipo`/`status` (RECEITA verde / DESPESA vermelho;
 * PENDENTE amarelo / CONCILIADO azul / CANCELADO cinza), método e data.
 *
 * Guarda de leitura `financeiro` (FINANCEIRO/SECRETARIA/LIDER leem; MEMBRO e
 * anônimos veem 403 na página e 307/401 no proxy); link "Novo lançamento" só
 * para escritores (o guard real fica nas rotas de API).
 *
 * Filtros cumulativos via searchParams: `tipo`, `status`, `data_inicio`,
 * `data_fim` e `busca`. A seleção visual de tipo/status são LINKS com query
 * params (className condicional no chip ativo); busca e período usam um GET
 * form nativo (sem estado no servidor — padrão admin/membros). Sem filtros →
 * todas as transações por `data` desc (AC-27). Resultado vazio → "Nenhum
 * lançamento encontrado" (AC-29). Linhas linkam para `/admin/financeiro/[id]`
 * (AC-6).
 */
export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const tipo = typeof params.tipo === "string" ? params.tipo : "";
  const status = typeof params.status === "string" ? params.status : "";
  const dataInicio =
    typeof params.data_inicio === "string" ? params.data_inicio : "";
  const dataFim = typeof params.data_fim === "string" ? params.data_fim : "";
  const busca = typeof params.busca === "string" ? params.busca.trim() : "";

  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "financeiro", "ler");
  const escritor = await can(claims?.role ?? "", "financeiro", "escrever");

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Financeiro
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

  const filtros: LancamentoFiltros = {};
  if (tipo === "RECEITA" || tipo === "DESPESA") {
    filtros.tipo = tipo;
  }
  if (
    status === "PENDENTE" ||
    status === "CONCILIADO" ||
    status === "CANCELADO"
  ) {
    filtros.status = status;
  }
  if (dataInicio) {
    filtros.dataInicio = dataInicio;
  }
  if (dataFim) {
    filtros.dataFim = dataFim;
  }
  if (busca) {
    filtros.busca = busca;
  }

  // Estado atual dos filtros (para preservar ao trocar um único filtro).
  const atual = { tipo, status, data_inicio: dataInicio, data_fim: dataFim, busca };
  function filtrar(campos: Record<string, string>): string {
    const qs = new URLSearchParams();
    for (const [chave, valor] of Object.entries({ ...atual, ...campos })) {
      if (valor !== "") {
        qs.set(chave, valor);
      }
    }
    const texto = qs.toString();
    return texto === "" ? "/admin/financeiro" : `/admin/financeiro?${texto}`;
  }

  let lancamentos: Awaited<ReturnType<typeof listarLancamentos>> = [];
  let falhaConsulta = false;
  try {
    lancamentos = await listarLancamentos(filtros);
  } catch {
    falhaConsulta = true;
  }

  const estiloChipAtivo =
    "rounded-full bg-primary text-white px-3 py-1.5 font-sans text-xs font-bold transition-colors";
  const estiloChipInativo =
    "rounded-full border border-text-dark/15 text-text-dark/60 hover:border-primary hover:text-primary px-3 py-1.5 font-sans text-xs font-bold transition-colors";

  const classeBadgeTipo = (valor: string) =>
    valor === "RECEITA"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  const classeBadgeStatus = (valor: string) =>
    valor === "PENDENTE"
      ? "bg-yellow-100 text-yellow-700"
      : valor === "CONCILIADO"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-text-dark/60";
  const formatarValor = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatarData = (data: string) =>
    new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Financeiro
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Receitas e despesas da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/financeiro/nova"
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo lançamento
            </Link>
          )}
        </div>

        <form
          method="GET"
          action="/admin/financeiro"
          className="mb-6 space-y-4 rounded-2xl bg-white shadow-xl p-5"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="busca">
                Buscar lançamento
              </label>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40"
                aria-hidden="true"
              />
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={busca}
                placeholder="Buscar por descrição"
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

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
                defaultValue={dataInicio}
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
                defaultValue={dataFim}
                className="rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold px-5 py-2.5 transition-colors"
            >
              Filtrar
            </button>
            <Link
              href="/admin/financeiro"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent px-1 py-2.5 transition-colors"
            >
              Limpar
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
              Tipo:
            </span>
            <Link href={filtrar({ tipo: "" })} className={tipo === "" ? estiloChipAtivo : estiloChipInativo}>
              Todos
            </Link>
            <Link href={filtrar({ tipo: "RECEITA" })} className={tipo === "RECEITA" ? estiloChipAtivo : estiloChipInativo}>
              RECEITA
            </Link>
            <Link href={filtrar({ tipo: "DESPESA" })} className={tipo === "DESPESA" ? estiloChipAtivo : estiloChipInativo}>
              DESPESA
            </Link>

            <span className="ml-4 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
              Status:
            </span>
            <Link href={filtrar({ status: "" })} className={status === "" ? estiloChipAtivo : estiloChipInativo}>
              Todos
            </Link>
            <Link href={filtrar({ status: "PENDENTE" })} className={status === "PENDENTE" ? estiloChipAtivo : estiloChipInativo}>
              PENDENTE
            </Link>
            <Link href={filtrar({ status: "CONCILIADO" })} className={status === "CONCILIADO" ? estiloChipAtivo : estiloChipInativo}>
              CONCILIADO
            </Link>
            <Link href={filtrar({ status: "CANCELADO" })} className={status === "CANCELADO" ? estiloChipAtivo : estiloChipInativo}>
              CANCELADO
            </Link>
          </div>
        </form>

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar os lançamentos. Tente novamente mais
              tarde.
            </p>
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhum lançamento encontrado.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lancamento) => (
                  <tr
                    key={lancamento.id}
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/financeiro/${lancamento.id}`}
                        className="inline-flex items-center gap-2 font-sans font-semibold text-text-dark hover:text-primary transition-colors"
                      >
                        {lancamento.descricao}
                        <Eye
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-text-dark/70">
                      {formatarValor(lancamento.valor)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${classeBadgeTipo(lancamento.tipo)}`}
                      >
                        {lancamento.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-text-dark/70">
                      {lancamento.metodo}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${classeBadgeStatus(lancamento.status)}`}
                      >
                        {lancamento.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                        <CalendarDays
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        {formatarData(lancamento.data)}
                      </p>
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