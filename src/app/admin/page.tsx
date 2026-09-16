import { BarChart3, CalendarDays, Church, Package, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { listarLancamentos } from "@/lib/admin/financeiro";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminPage() {
  const claims = await getClaims();

  let lancamentos: Awaited<ReturnType<typeof listarLancamentos>> = [];
  try {
    lancamentos = await listarLancamentos();
  } catch {
    lancamentos = [];
  }
  const receitas = lancamentos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + l.valor, 0);
  const despesas = lancamentos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((acc, l) => acc + l.valor, 0);
  const saldo = receitas - despesas;

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Área Administrativa
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Bem-vindo à gestão da IVC
            </p>
          </div>

          {claims ? (
            <div className="space-y-6">
              <nav aria-label="Módulos administrativos" className="space-y-3">
                <Link
                  href="/admin/membros"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Membros
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Cadastro, situação e cartões dos membros
                    </span>
                  </span>
                </Link>
                <Link
                  href="/admin/lideranca"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Church size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Igrejas & Liderança
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Gestão das igrejas e da liderança institucional
                    </span>
                  </span>
                </Link>
                <Link
                  href="/admin/eventos"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Eventos
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Gestão dos eventos e agenda da igreja
                    </span>
                  </span>
                </Link>
                <Link
                  href="/admin/patrimonio"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Patrimônio
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Inventário dos bens da igreja
                    </span>
                  </span>
                </Link>
                <Link
                  href="/admin/financeiro"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Financeiro
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Controle de receitas, despesas e caixa
                    </span>
                  </span>
                </Link>
                <Link
                  href="/admin/relatorios"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-5 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-base font-bold text-text-dark">
                      Relatórios
                    </span>
                    <span className="block font-serif text-sm text-text-dark/60">
                      Exportações e documentos da igreja
                    </span>
                  </span>
                </Link>
              </nav>

              <div className="rounded-lg bg-bg-gray p-5">
                <p className="font-sans text-sm font-semibold text-text-dark/60 mb-1">
                  E-mail
                </p>
                <p className="font-serif text-base text-text-dark">
                  {claims.email}
                </p>
              </div>

              <div className="rounded-lg bg-bg-gray p-5">
                <p className="font-sans text-sm font-semibold text-text-dark/60 mb-1">
                  Papel
                </p>
                <p className="font-serif text-base text-text-dark">
                  {claims.role ?? "Sem papel atribuído"}
                </p>
              </div>

              <div className="rounded-lg bg-bg-gray p-5">
                <p className="font-sans text-sm font-semibold text-text-dark/60 mb-1">
                  Resumo financeiro
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <p className="font-serif text-base text-green-700">
                    Receitas: {formatarMoeda(receitas)}
                  </p>
                  <p className="font-serif text-base text-red-700">
                    Despesas: {formatarMoeda(despesas)}
                  </p>
                  <p className="font-serif text-base font-bold text-text-dark col-span-2">
                    Saldo: {formatarMoeda(saldo)}
                  </p>
                </div>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans font-bold py-2.5 transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <p className="text-center font-serif text-text-dark/60">
              Sessão não disponível.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}