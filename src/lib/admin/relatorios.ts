import { listarLancamentos, type LancamentoFiltros } from "@/lib/admin/financeiro";
import { listMembros } from "@/lib/admin/membros";
import { listarEventos } from "@/lib/admin/eventos";
import { listarAssets } from "@/lib/admin/assets";

const SEPARADOR = ";";

/**
 * Escapa um campo CSV conforme RFC 4180 na variante PT-BR (REL-08): campos
 * com `"`, `;` ou quebra de linha são envolvidos em aspas duplas e aspas
 * internas são dobradas. Valores nulos/undefined viram string vazia.
 */
export function escapaCSV(valor: unknown): string {
  const texto = valor ?? "";
  const str = String(texto);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Linha de totais do CSV financeiro (REL-03) — última linha agregada. */
function linhaTotalCSV(receitas: number, despesas: number, saldo: number): string {
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");
  return [
    "TOTAIS",
    `RECEITAS ${fmt(receitas)};DESPESAS ${fmt(despesas)};SALDO ${fmt(saldo)}`,
  ].join(SEPARADOR);
}

/**
 * Exporta o relatório financeiro (REL-02) — CSV `;` + BOM UTF-8, uma linha
 * por lançamento ordenado por `data` desc (a listagem já ordena), colunas
 * Data;Tipo;Metodo;Status;Categoria;Descricao;Valor. Appenda a linha de
 * totais Receitas/Despesas/Saldo dos lançamentos filtrados (REL-03). O
 * filtro de período chega via `LancamentoFiltros` (`dataInicio`/`dataFim`).
 */
export async function gerarCSVFinanceiro(
  filtros: LancamentoFiltros = {}
): Promise<{ csv: string; filename: string }> {
  const lancamentos = await listarLancamentos(filtros);

  const header = ["Data", "Tipo", "Metodo", "Status", "Categoria", "Descricao", "Valor"];
  const linhas = lancamentos.map((l) =>
    [
      escapaCSV(l.data),
      escapaCSV(l.tipo),
      escapaCSV(l.metodo),
      escapaCSV(l.status),
      escapaCSV(l.categoria),
      escapaCSV(l.descricao),
      escapaCSV(l.valor.toFixed(2).replace(".", ",")),
    ].join(SEPARADOR)
  );

  const receitas = lancamentos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const despesas = lancamentos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((soma, l) => soma + Number(l.valor), 0);

  const csv = [
    `\uFEFF${header.join(SEPARADOR)}`,
    ...linhas,
    linhaTotalCSV(receitas, despesas, receitas - despesas),
  ].join("\r\n");

  return {
    csv,
    filename: `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

/**
 * Exporta o relatório de membros (REL-04) — CSV `;` + BOM UTF-8, colunas
 * Matricula;Nome;Status;Nascimento;Whatsapp;Cidade, ordenado por `nome` asc
 * (a listagem já ordena). Lista completa, sem filtro de período.
 */
export async function gerarCSVMembros(
  filtros: import("@/lib/admin/membros").MembroFiltros = {}
): Promise<{ csv: string; filename: string }> {
  const membros = await listMembros(filtros);

  const header = ["Matricula", "Nome", "Status", "Nascimento", "Whatsapp", "Cidade"];
  const linhas = membros.map((m) =>
    [
      escapaCSV(m.matricula),
      escapaCSV(m.nome),
      escapaCSV(m.status),
      escapaCSV(m.nascimento),
      escapaCSV(m.whatsapp),
      escapaCSV(m.cidade),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-membros.csv",
  };
}

/**
 * Exporta o relatório de eventos (REL-05) — CSV `;` + BOM UTF-8, colunas
 * Titulo;Data;Hora;Local;Visivel;Status, ordenado por `date` desc (a listagem
 * já ordena). Lista completa.
 */
export async function gerarCSVEventos(): Promise<{ csv: string; filename: string }> {
  const eventos = await listarEventos();

  const header = ["Titulo", "Data", "Hora", "Local", "Visivel", "Status"];
  const linhas = eventos.map((e) =>
    [
      escapaCSV(e.title),
      escapaCSV(e.date),
      escapaCSV(e.time),
      escapaCSV(e.location),
      escapaCSV(e.visivel),
      escapaCSV(e.status),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-eventos.csv",
  };
}

/**
 * Exporta o relatório de patrimônio (REL-06) — CSV `;` + BOM UTF-8, colunas
 * Nome;Categoria;Tombo;Local;Valor Aquisicao;Data Aquisicao;Responsavel;
 * Status, ordenado por `name` asc (a listagem já ordena). Lista completa.
 */
export async function gerarCSVPatrimonio(): Promise<{ csv: string; filename: string }> {
  const assets = await listarAssets();

  const header = [
    "Nome",
    "Categoria",
    "Tombo",
    "Local",
    "Valor Aquisicao",
    "Data Aquisicao",
    "Responsavel",
    "Status",
  ];
  const linhas = assets.map((a) =>
    [
      escapaCSV(a.name),
      escapaCSV(a.category),
      escapaCSV(a.numero_patrimonio),
      escapaCSV(a.location),
      escapaCSV(a.acquisition_value?.toFixed(2).replace(".", ",") ?? ""),
      escapaCSV(a.acquisition_date),
      escapaCSV(a.responsible),
      escapaCSV(a.status),
    ].join(SEPARADOR)
  );

  return {
    csv: `\uFEFF${[header.join(SEPARADOR), ...linhas].join("\r\n")}`,
    filename: "relatorio-patrimonio.csv",
  };
}