import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Pencil,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import {
  buscarLancamento,
  LancamentoNaoEncontradoError,
} from "@/lib/admin/financeiro";
import { LancamentoAcoes } from "./lancamento-acoes";

/**
 * Detalhe do lançamento financeiro (FIN-01/AC-6): todos os campos — descrição,
 * valor R$, badges de `tipo`/`status`, método, data, categoria, observações,
 * `created_at`/`updated_at`. Guarda de leitura `financeiro` (403 se não ler);
 * inexistente → `notFound()` (404, AC-11). Ações de escrita (editar PATCH —
 * AC-7 — e cancelar — AC-9) só para escritores, via `<LancamentoAcoes />`
 * (client). CONCILIADO/CANCELADO são somente-leitura (AC-8/10).
 */
export default async function LancamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
              href="/admin/financeiro"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao financeiro
            </Link>
          </div>
        </div>
      </section>
    );
  }

  let lancamento: Awaited<ReturnType<typeof buscarLancamento>> | null = null;
  try {
    lancamento = await buscarLancamento(id);
  } catch (error) {
    if (error instanceof LancamentoNaoEncontradoError) {
      notFound();
    }
    notFound();
  }

  if (!lancamento) {
    notFound();
  }

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
  const formatarDataHora = (data: string) =>
    new Date(data).toLocaleString("pt-BR");

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/admin/financeiro"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao financeiro
        </Link>

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="flex items-center gap-2 font-sans text-2xl font-bold text-primary">
                <CircleDollarSign
                  size={22}
                  className="text-primary"
                  aria-hidden="true"
                />
                {lancamento.descricao}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 font-serif text-sm text-text-dark/60">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${classeBadgeTipo(lancamento.tipo)}`}
                >
                  {lancamento.tipo}
                </span>
                <span className="font-serif">{lancamento.metodo}</span>
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-bold ${classeBadgeStatus(lancamento.status)}`}
            >
              {lancamento.status}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Valor
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-text-dark">
                <CircleDollarSign
                  size={15}
                  className="text-primary"
                  aria-hidden="true"
                />
                {formatarValor(lancamento.valor)}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Data
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-text-dark">
                <CalendarDays
                  size={15}
                  className="text-primary"
                  aria-hidden="true"
                />
                {formatarData(lancamento.data)}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Categoria
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {lancamento.categoria ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Método
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {lancamento.metodo}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Observações
              </dt>
              <dd className="mt-1 flex items-start gap-1.5 font-serif text-base text-text-dark">
                <StickyNote
                  size={15}
                  className="mt-1 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {lancamento.observacoes ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Criado em
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-text-dark">
                <Clock
                  size={14}
                  className="text-primary"
                  aria-hidden="true"
                />
                {formatarDataHora(lancamento.created_at)}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Atualizado em
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-base text-text-dark">
                <Clock
                  size={14}
                  className="text-primary"
                  aria-hidden="true"
                />
                {formatarDataHora(lancamento.updated_at)}
              </dd>
            </div>
          </dl>

          {escritor && lancamento.status === "PENDENTE" && (
            <div className="mt-6 flex items-center gap-3 border-t border-text-dark/10 pt-5">
              <Pencil size={16} className="text-primary" aria-hidden="true" />
              <span className="font-serif text-sm text-text-dark/70">
                Lançamento pendente — edite ou cancele abaixo.
              </span>
            </div>
          )}
        </div>

        {escritor && <LancamentoAcoes lancamento={lancamento} />}
      </div>
    </section>
  );
}