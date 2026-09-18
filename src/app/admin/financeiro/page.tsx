import { CalendarDays, Eye, Plus, Search } from "lucide-react";
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

  const metodo = typeof params.metodo === "string" ? params.metodo : "";

  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "financeiro", "ler");
  const escritor = await can(claims?.role ?? "", "financeiro", "escrever");

  if (!leitor) {
    return (
      <section className="py-8 min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div
            className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Financeiro
            </h1>
            <p className="font-serif text-white/60">
              Você não tem permissão para acessar este módulo.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-[#c9a84c] hover:text-[#e0c872] transition-colors"
            >
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
  if (metodo && ["PIX", "CARTAO", "DINHEIRO", "TRANSFERENCIA"].includes(metodo)) {
    filtros.metodo = metodo as "PIX" | "CARTAO" | "DINHEIRO" | "TRANSFERENCIA";
  }

  // Estado atual dos filtros (para preservar ao trocar um único filtro).
  const atual = { tipo, status, metodo, data_inicio: dataInicio, data_fim: dataFim, busca };
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

  // Saldo mensal (calculado a partir dos lançamentos filtrados)
  const totalEntradas = lancamentos
    .filter((l) => l.tipo === "RECEITA" && l.status !== "CANCELADO")
    .reduce((soma, l) => soma + l.valor, 0);
  const totalSaidas = lancamentos
    .filter((l) => l.tipo === "DESPESA" && l.status !== "CANCELADO")
    .reduce((soma, l) => soma + l.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  const estiloChipAtivo =
    "rounded-full bg-[#c9a84c] text-[#0d1f3c] px-3 py-1.5 font-sans text-xs font-bold transition-colors";
  const estiloChipInativo =
    "rounded-full border border-white/20 text-white/60 hover:border-[#c9a84c] hover:text-[#c9a84c] px-3 py-1.5 font-sans text-xs font-bold transition-colors";

  const classeBadgeTipo = (valor: string) =>
    valor === "RECEITA"
      ? "bg-emerald-500/20 text-emerald-400"
      : "bg-red-500/20 text-red-400";
  const labelTipo = (valor: string) =>
    valor === "RECEITA" ? "ENTRADA" : "SAÍDA";
  const classeBadgeStatus = (valor: string) =>
    valor === "PENDENTE"
      ? "bg-amber-500/20 text-amber-400"
      : valor === "CONCILIADO"
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-white/10 text-white/40";
  const formatarValor = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatarData = (data: string) =>
    new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-white mb-2">
              Financeiro
            </h1>
            <p className="font-serif text-base text-white/60">
              Receitas e despesas da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/financeiro/nova"
              className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c] font-sans text-sm font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              Novo lançamento
            </Link>
          )}
        </div>

        <form
          method="GET"
          action="/admin/financeiro"
          className="mb-6 space-y-4 bg-[#132744] border border-white/10 rounded-xl p-5"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="busca">
                Buscar lançamento
              </label>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                aria-hidden="true"
              />
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={busca}
                placeholder="Buscar por descrição"
                className="w-full bg-[#0d1f3c] border border-white/10 text-white rounded-lg pl-9 pr-3 py-2.5 font-serif focus:border-[#c9a84c] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="data_inicio"
                className="block font-sans text-xs font-semibold text-white/60 mb-1"
              >
                De
              </label>
              <input
                id="data_inicio"
                name="data_inicio"
                type="date"
                defaultValue={dataInicio}
                className="bg-[#0d1f3c] border border-white/10 text-white rounded-lg px-3 py-2 font-serif focus:border-[#c9a84c] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="data_fim"
                className="block font-sans text-xs font-semibold text-white/60 mb-1"
              >
                Até
              </label>
              <input
                id="data_fim"
                name="data_fim"
                type="date"
                defaultValue={dataFim}
                className="bg-[#0d1f3c] border border-white/10 text-white rounded-lg px-3 py-2 font-serif focus:border-[#c9a84c] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c] font-sans font-bold rounded-lg px-4 py-2 transition-colors"
            >
              Filtrar
            </button>
            <Link
              href="/admin/financeiro"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-[#c9a84c] hover:text-[#e0c872] px-1 py-2.5 transition-colors"
            >
              Limpar
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70">
              Tipo:
            </span>
            <Link href={filtrar({ tipo: "" })} className={tipo === "" ? estiloChipAtivo : estiloChipInativo}>
              Todos
            </Link>
            <Link href={filtrar({ tipo: "RECEITA" })} className={tipo === "RECEITA" ? estiloChipAtivo : estiloChipInativo}>
              ENTRADA
            </Link>
            <Link href={filtrar({ tipo: "DESPESA" })} className={tipo === "DESPESA" ? estiloChipAtivo : estiloChipInativo}>
              SAÍDA
            </Link>

            <span className="ml-4 font-sans text-xs font-bold uppercase tracking-wider text-white/70">
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

            <span className="ml-4 font-sans text-xs font-bold uppercase tracking-wider text-white/70">
              Pagamento:
            </span>
            <Link href={filtrar({ metodo: "" })} className={metodo === "" ? estiloChipAtivo : estiloChipInativo}>
              Todos
            </Link>
            <Link href={filtrar({ metodo: "PIX" })} className={metodo === "PIX" ? estiloChipAtivo : estiloChipInativo}>
              PIX
            </Link>
            <Link href={filtrar({ metodo: "CARTAO" })} className={metodo === "CARTAO" ? estiloChipAtivo : estiloChipInativo}>
              CARTÃO
            </Link>
            <Link href={filtrar({ metodo: "DINHEIRO" })} className={metodo === "DINHEIRO" ? estiloChipAtivo : estiloChipInativo}>
              DINHEIRO
            </Link>
            <Link href={filtrar({ metodo: "TRANSFERENCIA" })} className={metodo === "TRANSFERENCIA" ? estiloChipAtivo : estiloChipInativo}>
              TRANSFERÊNCIA
            </Link>
          </div>
        </form>

        {!falhaConsulta && lancamentos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#132744] border border-white/10 rounded-xl p-4 text-center">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Entradas
              </p>
              <p className="font-sans text-xl font-bold text-white">
                {formatarValor(totalEntradas)}
              </p>
            </div>
            <div className="bg-[#132744] border border-white/10 rounded-xl p-4 text-center">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                Saídas
              </p>
              <p className="font-sans text-xl font-bold text-white">
                {formatarValor(totalSaidas)}
              </p>
            </div>
            <div className="bg-[#132744] border border-white/10 rounded-xl p-4 text-center">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-[#c9a84c] mb-1">
                Saldo
              </p>
              <p className={`font-sans text-xl font-bold ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatarValor(saldo)}
              </p>
            </div>
          </div>
        )}

        {falhaConsulta ? (
          <div className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar os lançamentos. Tente novamente mais
              tarde.
            </p>
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-base text-white/60">
              Nenhum lançamento encontrado.
            </p>
          </div>
        ) : (
          <div className="bg-[#132744] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-sans text-xs font-bold uppercase tracking-wider text-white/70">
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
                    className="bg-[#0d1f3c] border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/financeiro/${lancamento.id}`}
                        className="inline-flex items-center gap-2 font-sans font-semibold text-white hover:text-[#c9a84c] transition-colors"
                      >
                        {lancamento.descricao}
                        <Eye
                          size={14}
                          className="text-[#c9a84c]"
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-white/60">
                      {formatarValor(lancamento.valor)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${classeBadgeTipo(lancamento.tipo)}`}
                      >
                        {labelTipo(lancamento.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-serif text-sm text-white/60">
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
                      <p className="flex items-center gap-1.5 font-serif text-sm text-white/60">
                        <CalendarDays
                          size={14}
                          className="text-[#c9a84c]"
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
