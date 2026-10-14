import { listMembros } from "@/lib/admin/membros";
import { listarEventos } from "@/lib/admin/eventos";
import { listarIgrejas } from "@/lib/admin/lideranca";
import { listarAssets } from "@/lib/admin/assets";
import { listarDocumentos } from "@/lib/admin/relatorios";
import { listarUsuarios } from "@/lib/admin/usuarios";
import { listarLancamentos } from "@/lib/admin/financeiro";

export interface Metricas {
  membros: number;
  eventos: number;
  igrejas: number;
  patrimonio: number;
  documentos: number;
  usuarios: number;
}

export interface AtividadeItem {
  id: string;
  tipo: "membro" | "transacao" | "evento";
  titulo: string;
  subtitulo: string;
  criadoEm: string;
}

export interface ResumoFinanceiro {
  receitas: number;
  despesas: number;
  saldo: number;
  topCategorias: Array<{ categoria: string; valor: number }>;
}

function temporizar(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `ha ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

export async function obterMetricas(): Promise<Metricas> {
  const [membros, eventos, igrejas, assets, docs, usuarios] = await Promise.all(
    [
      listMembros().catch(() => []),
      listarEventos().catch(() => []),
      listarIgrejas().catch(() => []),
      listarAssets().catch(() => []),
      listarDocumentos().catch(() => []),
      listarUsuarios().catch(() => ({ users: [], total: 0 })),
    ]
  );
  return {
    membros: membros.length,
    eventos: eventos.length,
    igrejas: igrejas.length,
    patrimonio: assets.length,
    documentos: docs.length,
    usuarios: usuarios.total,
  };
}

export async function obterAtividadeRecente(): Promise<AtividadeItem[]> {
  const [membros, lancamentos, eventos] = await Promise.all([
    listMembros().catch(() => []),
    listarLancamentos().catch(() => []),
    listarEventos().catch(() => []),
  ]);

  const items: AtividadeItem[] = [];

  for (const m of membros.slice(0, 5)) {
    items.push({
      id: m.id,
      tipo: "membro",
      titulo: m.nome,
      subtitulo: m.status,
      criadoEm: m.criado_em,
    });
  }

  for (const l of lancamentos.slice(0, 5)) {
    items.push({
      id: l.id,
      tipo: "transacao",
      titulo: `${l.tipo === "RECEITA" ? "+" : "-"} ${l.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      subtitulo: l.descricao,
      criadoEm: l.created_at,
    });
  }

  for (const e of eventos.slice(0, 5)) {
    items.push({
      id: e.id,
      tipo: "evento",
      titulo: e.title,
      subtitulo: e.date,
      criadoEm: e.created_at,
    });
  }

  items.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );

  return items.slice(0, 10).map((item) => ({
    ...item,
    criadoEm: temporizar(item.criadoEm),
  }));
}

export async function obterResumoFinanceiro(): Promise<ResumoFinanceiro> {
  const lancamentos = await listarLancamentos().catch(() => []);

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const doMes = lancamentos.filter((l) => {
    const d = new Date(l.data);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  // Alinhado à tela financeiro: CANCELADO não compõe totais.
  const validos = doMes.filter((l) => l.status !== "CANCELADO");

  const receitas = validos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + l.valor, 0);
  const despesas = validos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((acc, l) => acc + l.valor, 0);

  const porCategoria = new Map<string, number>();
  for (const l of validos) {
    const cat = l.categoria ?? "Sem categoria";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + l.valor);
  }

  const topCategorias = [...porCategoria.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3);

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    topCategorias,
  };
}
