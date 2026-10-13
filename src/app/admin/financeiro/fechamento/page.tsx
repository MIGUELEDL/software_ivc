import { ArrowLeft, CalendarClock, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import {
  listarFechamentos,
  previewFechamentoCaixa,
} from "@/lib/admin/financeiro";
import { FecharCaixaButton } from "./fechar-caixa-button";

/**
 * Fechamento de caixa (FIN-09/AC-20): lista os snapshots imutáveis anteriores
 * — data, total de receitas, total de despesas, saldo e quantidade de
 * transações (AC-20/22). Guarda de leitura `financeiro`; botão "Fechar caixa"
 * (AC-21) mostra a prévia do período (receitas/despesas CONCILIADO, saldo e
 * PENDENTES informativos) e, após confirmação, POST → cria o snapshot
 * (AC-22); sem CONCILIADO a rota responde 400 `sem_transacoes_para_fechar`
 * (AC-23). Estado vazio → "Nenhum fechamento realizado".
 */
export default async function AdminFinanceiroFechamentoPage() {
  const claims = await getClaims();
  const leitor = await can(claims?.role ?? "", "financeiro", "ler");
  const escritor = await can(claims?.role ?? "", "financeiro", "escrever");

  const formatarValor = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!leitor) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Fechamento de caixa
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

  let fechamentos: Awaited<ReturnType<typeof listarFechamentos>> = [];
  let falhaConsulta = false;
  let preview: Awaited<ReturnType<typeof previewFechamentoCaixa>> | null = null;
  try {
    [fechamentos, preview] = await Promise.all([
      listarFechamentos(),
      previewFechamentoCaixa(),
    ]);
  } catch {
    falhaConsulta = true;
  }

  const formatarData = (data: string) =>
    new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Fechamento de caixa
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Histórico de fechamentos do período (snapshots imutáveis).
            </p>
          </div>

          {escritor && preview && <FecharCaixaButton preview={preview} />}
        </div>

        {!falhaConsulta && escritor && preview && (
          <div
            className="mb-8 rounded-2xl bg-white shadow-xl p-6"
            data-testid="preview-fechamento"
          >
            <p className="font-sans text-sm font-semibold text-text-dark/60 mb-3">
              Prévia do período (transações conciliadas)
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-serif text-sm sm:grid-cols-4">
              <div>
                <dt className="text-text-dark/60">Receitas</dt>
                <dd className="text-green-700 font-semibold">
                  {formatarValor(preview.receitas)}
                </dd>
              </div>
              <div>
                <dt className="text-text-dark/60">Despesas</dt>
                <dd className="text-red-700 font-semibold">
                  {formatarValor(preview.despesas)}
                </dd>
              </div>
              <div>
                <dt className="text-text-dark/60">Saldo</dt>
                <dd className="text-text-dark font-semibold">
                  {formatarValor(preview.saldo)}
                </dd>
              </div>
              <div>
                <dt className="text-text-dark/60">
                  PENDENTES{" "}
                  <span className="text-text-dark/40">(informativo)</span>
                </dt>
                <dd className="text-text-dark/70 font-semibold">
                  {preview.pendentes}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar os fechamentos. Tente novamente mais
              tarde.
            </p>
          </div>
        ) : fechamentos.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhum fechamento realizado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto tabela-scroll rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Data</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Receitas</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Despesas</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4">Saldo</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-right">Transações</th>
                </tr>
              </thead>
              <tbody>
                {fechamentos.map((fechamento) => (
                  <tr
                    key={fechamento.id}
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm text-text-dark/70">
                        <CalendarClock
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        {formatarData(fechamento.data_fechamento)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-serif text-sm text-green-700">
                      {formatarValor(fechamento.total_receitas)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-serif text-sm text-red-700">
                      {formatarValor(fechamento.total_despesas)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                      <p className="flex items-center gap-1.5 font-serif text-sm font-semibold text-text-dark">
                        <CircleDollarSign
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />
                        {formatarValor(fechamento.saldo)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-4 text-right font-serif text-sm text-text-dark/70">
                      {fechamento.qtd_transacoes}
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