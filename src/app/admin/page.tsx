import {
  CalendarDays,
  Church,
  ClipboardList,
  FileText,
  Package,
  Settings,
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
  igrejas: "Templos",
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

const NAV_ITEMS = [
  { href: "/admin/membros", label: "Membros", icon: Users },
  { href: "/admin/lideranca", label: "Templos", icon: Church },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/patrimonio", label: "Patrimonio", icon: Package },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/relatorios", label: "Relatorios", icon: FileText },
  { href: "/admin/usuarios", label: "Usuarios", icon: Shield },
  { href: "/admin/auditoria", label: "Auditoria", icon: ClipboardList },
  { href: "/admin/configuracoes", label: "Config", icon: Settings },
];

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400",
  INATIVO: "bg-white/10 text-white/40",
  TRANSFERIDO: "bg-amber-500/20 text-amber-400",
  RECEITA: "bg-emerald-500/20 text-emerald-400",
  DESPESA: "bg-red-500/20 text-red-400",
};

function StatusBadge({ label }: { label: string }) {
  const cls = STATUS_COLORS[label];
  if (!cls) {
    return (
      <span className="font-serif text-xs text-white/40">{label}</span>
    );
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

function AtividadeIcon({ tipo }: { tipo: AtividadeItem["tipo"] }) {
  switch (tipo) {
    case "membro":
      return <Users size={14} className="text-blue-400" />;
    case "transacao":
      return <Wallet size={14} className="text-emerald-400" />;
    case "evento":
      return <CalendarDays size={14} className="text-purple-400" />;
  }
}

export default async function AdminPage() {
  const claims = await getClaims();
  const papel = claims?.role ?? "";
  const podeUsuarios = await can(papel, "usuarios", "ler");
  const podeDashboard = await can(papel, "dashboard", "ler");
  const podeConfiguracoes = await can(papel, "configuracoes", "ler");

  const [metricas, atividade, financeiro] = await Promise.all([
    obterMetricas(),
    obterAtividadeRecente(),
    obterResumoFinanceiro(),
  ]);

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {claims ? (
          !podeDashboard ? (
            <div className="rounded-2xl hero-background-admin border border-white/10 p-10 text-center">
              <Shield size={48} className="mx-auto mb-4 text-red-400" />
              <h2 className="font-sans text-xl font-bold text-primary mb-2">
                Acesso Negado
              </h2>
              <p className="font-serif text-sm text-primary/60">
                Voce nao possui permissao para acessar o painel administrativo.
              </p>
              <p className="font-serif text-xs text-primary/40 mt-2">
                Papel atual: {claims.role ?? "nenhum"} | Contato: administrador
              </p>
            </div>
          ) : (
          <div className="space-y-8">
            <div>
              <h1 className="font-sans text-2xl font-bold text-primary mb-1">
                Dashboard
              </h1>
              <p className="font-serif text-sm text-primary/50">
                Visao geral da administracao da IVC
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.keys(METRIC_ICONS) as Array<keyof typeof METRIC_ICONS>).map(
                (key) => {
                  const Icon = METRIC_ICONS[key];
                  return (
                    <Link
                      key={key}
                      href={METRIC_HREF[key]}
                      className="rounded-xl hero-background-admin border border-white/10 p-4 hover:border-[#c9a84c]/40 hover:bg-[#1a3050] transition-all text-center group"
                    >
                      <Icon
                        size={24}
                        className="mx-auto mb-2 text-accent group-hover:scale-110 transition-transform"
                        aria-hidden="true"
                      />
                      <p className="font-sans text-xl font-bold text-white">
                        {metricas[key]}
                      </p>
                      <p className="font-sans text-[10px] font-bold text-white/80 uppercase tracking-wider">
                        {METRIC_LABELS[key]}
                      </p>
                    </Link>
                  );
                }
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl hero-background-admin border border-white/10 p-5">
                <h2 className="font-sans text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Atividade Recente
                </h2>
                {atividade.length === 0 ? (
                  <p className="font-serif text-sm text-white">
                    Nenhuma atividade recente.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {atividade.map((item) => (
                      <li
                        key={`${item.tipo}-${item.id}`}
                        className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 hover:bg-white/15 transition-colors"
                      >
                        <AtividadeIcon tipo={item.tipo} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-white truncate">
                            {item.titulo}
                          </p>
                          <StatusBadge label={item.subtitulo} />
                        </div>
                        <span className="font-sans text-xs text-white/30 shrink-0">
                          {item.criadoEm}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl hero-background-admin border border-white/10 p-5">
                <h2 className="font-sans text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Resumo Financeiro
                </h2>
                <p className="font-sans text-[10px] text-white/50 uppercase tracking-wider -mt-3 mb-4">
                  Este mês · exclui cancelados
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans text-xs text-white/80">Receitas</span>
                    <span className="font-serif text-lg font-bold text-emerald-400">
                      {formatarMoeda(financeiro.receitas)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans text-xs text-white/80">Despesas</span>
                    <span className="font-serif text-lg font-bold text-red-400">
                      {formatarMoeda(financeiro.despesas)}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
                    <span className="font-sans text-xs font-bold text-white/80">Saldo</span>
                    <span className="font-serif text-xl font-bold text-white">
                      {formatarMoeda(financeiro.saldo)}
                    </span>
                  </div>
                </div>
                {financeiro.topCategorias.length > 0 && (
                  <>
                    <p className="font-sans text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">
                      Top Categorias
                    </p>
                    <ul className="space-y-1">
                      {financeiro.topCategorias.map((cat) => (
                        <li
                          key={cat.categoria}
                          className="flex justify-between font-serif text-xs text-white/70"
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

            <nav
              aria-label="Modulos administrativos"
              className="rounded-xl hero-background-admin border border-white/10 p-4"
            >
              <h2 className="font-sans text-sm font-bold text-white uppercase tracking-wider mb-3 px-2">
                Modulos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {NAV_ITEMS.filter((item) => {
                  if (item.href === "/admin/usuarios" && !podeUsuarios) return false;
                  if (item.href === "/admin/configuracoes" && !podeConfiguracoes) return false;
                  if (item.href === "/admin/auditoria") return can(papel, "auditoria", "ler");
                  return true;
                }).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg bg-white/5 border border-accent-light/50 p-3 hover:bg-white/15 transition-colors"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light/10 text-accent-light hover:text-white group-hover:bg-accent-light/30 transition-colors">
                      <item.icon size={16} aria-hidden="true" />
                    </span>
                    <span className="font-sans text-xs font-bold text-accent-light hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
          )
        ) : (
          <p className="text-center font-serif text-white/40">
            Sessao nao disponivel.
          </p>
        )}
      </div>
    </section>
  );
}
