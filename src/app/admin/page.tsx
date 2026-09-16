import {
  BarChart3,
  CalendarDays,
  Church,
  FileText,
  Package,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import {
  obterMetricas,
  obterAtividadeRecente,
  obterResumoFinanceiro,
} from "@/lib/admin/dashboard";
import type { AtividadeItem } from "@/lib/admin/dashboard";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const METRIC_ICONS = {
  membros: Users,
  eventos: CalendarDays,
  igrejas: Church,
  patrimonio: Package,
  documentos: FileText,
  usuarios: Shield,
} as const;

const METRIC_LABELS: Record<string, string> = {
  membros: "Membros",
  eventos: "Eventos",
  igrejas: "Igrejas",
  patrimonio: "Patrimonio",
  documentos: "Documentos",
  usuarios: "Usuarios",
};

const METRIC_HREF: Record<string, string> = {
  membros: "/admin/membros",
  eventos: "/admin/eventos",
  igrejas: "/admin/lideranca",
  patrimonio: "/admin/patrimonio",
  documentos: "/admin/relatorios",
  usuarios: "/admin/usuarios",
};

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-500",
  TRANSFERIDO: "bg-yellow-100 text-yellow-800",
  RECEITA: "bg-green-100 text-green-800",
  DESPESA: "bg-red-100 text-red-800",
};

function AtividadeIcon({ tipo }: { tipo: AtividadeItem["tipo"] }) {
  switch (tipo) {
    case "membro":
      return <Users size={16} className="text-blue-500" />;
    case "transacao":
      return <Wallet size={16} className="text-green-600" />;
    case "evento":
      return <CalendarDays size={16} className="text-purple-500" />;
  }
}

export default async function AdminPage() {
  const claims = await getClaims();
  const papel = claims?.role ?? "";
  const podeUsuarios = await can(papel, "usuarios", "ler");

  const [metricas, atividade, financeiro] = await Promise.all([
    obterMetricas(),
    obterAtividadeRecente(),
    obterResumoFinanceiro(),
  ]);

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Area Administrativa
          </h1>
          <p className="font-serif text-base text-text-dark/60">
            Bem-vindo a gestao da IVC
          </p>
        </div>

        {claims ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {(Object.keys(METRIC_ICONS) as Array<keyof typeof METRIC_ICONS>).map(
                (key) => {
                  const Icon = METRIC_ICONS[key];
                  return (
                    <Link
                      key={key}
                      href={METRIC_HREF[key]}
                      className="rounded-2xl bg-white shadow-xl p-5 hover:shadow-2xl transition-shadow text-center"
                    >
                      <Icon
                        size={28}
                        className="mx-auto mb-2 text-primary"
                        aria-hidden="true"
                      />
                      <p className="font-sans text-2xl font-bold text-text-dark">
                        {metricas[key]}
                      </p>
                      <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
                        {METRIC_LABELS[key]}
                      </p>
                    </Link>
                  );
                }
              )}
            </div>

            <nav
              aria-label="Modulos administrativos"
              className="rounded-2xl bg-white shadow-xl p-6 space-y-3"
            >
              <Link
                href="/admin/membros"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Membros
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Cadastro, situacao e cartoes
                  </span>
                </span>
              </Link>
              <Link
                href="/admin/lideranca"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Church size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Igrejas & Lideranca
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Gestao das igrejas e lideranca
                  </span>
                </span>
              </Link>
              <Link
                href="/admin/eventos"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Eventos
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Agenda da igreja
                  </span>
                </span>
              </Link>
              <Link
                href="/admin/patrimonio"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Patrimonio
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Inventario dos bens
                  </span>
                </span>
              </Link>
              <Link
                href="/admin/financeiro"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Financeiro
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Receitas, despesas e caixa
                  </span>
                </span>
              </Link>
              <Link
                href="/admin/relatorios"
                className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans text-sm font-bold text-text-dark">
                    Relatorios
                  </span>
                  <span className="block font-serif text-xs text-text-dark/60">
                    Exportacoes e documentos
                  </span>
                </span>
              </Link>
              {podeUsuarios && (
                <Link
                  href="/admin/usuarios"
                  className="flex items-center gap-4 rounded-xl bg-bg-gray p-4 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-sans text-sm font-bold text-text-dark">
                      Usuarios
                    </span>
                    <span className="block font-serif text-xs text-text-dark/60">
                      Permissoes do painel
                    </span>
                  </span>
                </Link>
              )}
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white shadow-xl p-6">
                <h2 className="font-sans text-lg font-bold text-text-dark mb-4">
                  Atividade Recente
                </h2>
                {atividade.length === 0 ? (
                  <p className="font-serif text-sm text-text-dark/50">
                    Nenhuma atividade recente.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {atividade.map((item) => (
                      <li
                        key={`${item.tipo}-${item.id}`}
                        className="flex items-start gap-3"
                      >
                        <AtividadeIcon tipo={item.tipo} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-text-dark truncate">
                            {item.titulo}
                          </p>
                          <p className="font-serif text-xs text-text-dark/50 truncate">
                            {item.subtitulo}
                          </p>
                        </div>
                        <span className="font-sans text-xs text-text-dark/40 shrink-0">
                          {item.criadoEm}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl bg-white shadow-xl p-6">
                <h2 className="font-sans text-lg font-bold text-text-dark mb-4">
                  Resumo Financeiro
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Receitas
                    </p>
                    <p className="font-serif text-lg font-bold text-green-700">
                      {formatarMoeda(financeiro.receitas)}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
                      Despesas
                    </p>
                    <p className="font-serif text-lg font-bold text-red-700">
                      {formatarMoeda(financeiro.despesas)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-bg-gray p-3 mb-4">
                  <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
                    Saldo
                  </p>
                  <p className="font-serif text-xl font-bold text-text-dark">
                    {formatarMoeda(financeiro.saldo)}
                  </p>
                </div>
                {financeiro.topCategorias.length > 0 && (
                  <>
                    <p className="font-sans text-xs font-bold text-text-dark/50 uppercase mb-2">
                      Top Categorias
                    </p>
                    <ul className="space-y-1">
                      {financeiro.topCategorias.map((cat) => (
                        <li
                          key={cat.categoria}
                          className="flex justify-between font-serif text-sm text-text-dark/70"
                        >
                          <span>{cat.categoria}</span>
                          <span>{formatarMoeda(cat.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-sans text-sm font-bold text-text-dark">
                  {claims.email}
                </p>
                <p className="font-serif text-xs text-text-dark/50">
                  {claims.role ?? "Sem papel"}
                </p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans font-bold px-6 py-2 transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="text-center font-serif text-text-dark/60">
            Sessao nao disponivel.
          </p>
        )}
      </div>
    </section>
  );
}
