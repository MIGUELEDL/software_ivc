"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AuditoriaFiltrosProps = {
  data_inicio?: string;
  data_fim?: string;
  acao?: string;
  entidade?: string;
};

const ACOES = [
  { value: "criar", label: "Criar" },
  { value: "editar", label: "Editar" },
  { value: "excluir", label: "Excluir" },
  { value: "cancelar", label: "Cancelar" },
  { value: "baixar", label: "Baixar" },
  { value: "atualizar", label: "Atualizar" },
];

const ENTIDADES = [
  { value: "membros", label: "Membros" },
  { value: "eventos", label: "Eventos" },
  { value: "patrimonio", label: "Patrimonio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "relatorios", label: "Relatorios" },
  { value: "usuarios", label: "Usuarios" },
  { value: "configuracoes", label: "Configuracoes" },
];

export default function AuditoriaFiltros({
  data_inicio,
  data_fim,
  acao,
  entidade,
}: AuditoriaFiltrosProps) {
  const router = useRouter();
  const [inicio, setInicio] = useState(data_inicio ?? "");
  const [fim, setFim] = useState(data_fim ?? "");
  const [acaoFiltro, setAcaoFiltro] = useState(acao ?? "");
  const [entidadeFiltro, setEntidadeFiltro] = useState(entidade ?? "");

  function aplicarFiltros() {
    const sp = new URLSearchParams();
    if (inicio) sp.set("data_inicio", inicio);
    if (fim) sp.set("data_fim", fim);
    if (acaoFiltro) sp.set("acao", acaoFiltro);
    if (entidadeFiltro) sp.set("entidade", entidadeFiltro);
    router.push(`/admin/auditoria?${sp.toString()}`);
  }

  function limparFiltros() {
    setInicio("");
    setFim("");
    setAcaoFiltro("");
    setEntidadeFiltro("");
    router.push("/admin/auditoria");
  }

  return (
    <div className="rounded-2xl hero-background-admin border border-white/10 p-6">
      <h2 className="font-sans text-sm font-bold text-white mb-4">
        Filtros
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block font-sans text-xs font-bold text-white/90 mb-1">
            Data Inicio
          </label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="w-full rounded bg-white/20 border border-white/10 px-3 py-2 font-sans text-sm text-white focus:border-accent-light focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-sans text-xs font-bold text-white/90 mb-1">
            Data Fim
          </label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="w-full rounded bg-white/20 border border-white/10 px-3 py-2 font-sans text-sm text-white focus:border-accent-light focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-sans text-xs font-bold text-white/90 mb-1">
            Acao
          </label>
          <select
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="w-full rounded bg-white/20 border border-white/10 px-3 py-2 font-sans text-sm text-white focus:border-accent-light focus:outline-none"
          >
            <option value="">Todas</option>
            {ACOES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-bold text-white/90 mb-1">
            Entidade
          </label>
          <select
            value={entidadeFiltro}
            onChange={(e) => setEntidadeFiltro(e.target.value)}
            className="w-full rounded bg-white/20 border border-white/10 px-3 py-2 font-sans text-sm text-white focus:border-accent-light focus:outline-none"
          >
            <option value="">Todas</option>
            {ENTIDADES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={aplicarFiltros}
          className="rounded hero-background-accent px-4 py-2 font-sans text-xs font-bold text-white/90 hover:bg-accent-light transition-colors cursor-pointer"
        >
          Aplicar
        </button>
        <button
          onClick={limparFiltros}
          className="rounded bg-white/20 border border-white/10 px-4 py-2 font-sans text-xs font-bold text-white/80 hover:bg-white/40 hover:text-white cursor-pointer transition-colors"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
