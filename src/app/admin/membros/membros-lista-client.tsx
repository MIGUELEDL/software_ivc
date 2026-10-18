"use client";

import { Eye, IdCard, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TotalBloco } from "@/components/admin/total-bloco";

type MembroLista = {
  id: string;
  nome: string;
  matricula: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  TRANSFERIDO: "Transferido",
};

const STATUS_CLASS: Record<string, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  INATIVO: "bg-white/10 text-white/60 border border-white/10",
  TRANSFERIDO: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};

/** Máximo de cartões por folha A4 (CART-01). */
const MAXIMO_CARTOES = 4;

/**
 * Tabela de membros com seleção para impressão de cartões (CART-01).
 * Checkbox por linha; no máximo 4 marcações — a 5ª é bloqueada com aviso.
 * Botão "Imprimir cartões (N)" navega para /admin/membros/imprimir?ids=...
 */
export function MembrosListaClient({
  membros,
  total,
}: {
  membros: MembroLista[];
  total: number;
}) {
  const router = useRouter();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [avisoLimite, setAvisoLimite] = useState(false);

  function alternar(id: string) {
    setAvisoLimite(false);
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        if (proximo.size >= MAXIMO_CARTOES) {
          setAvisoLimite(true);
          return atual;
        }
        proximo.add(id);
      }
      return proximo;
    });
  }

  function imprimir() {
    const ids = Array.from(selecionados).join(",");
    if (!ids) return;
    router.push(`/admin/membros/imprimir?ids=${ids}`);
  }

  return (
    <div>
      {selecionados.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 hero-background-admin border border-accent/40 rounded-xl px-5 py-3">
          <p className="font-sans text-sm font-semibold text-white/85">
            {selecionados.size} de {MAXIMO_CARTOES} cartões selecionados
            {avisoLimite && (
              <span className="ml-2 font-normal text-amber-400">
                (máximo {MAXIMO_CARTOES} por folha)
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={imprimir}
            className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent text-white font-sans text-sm font-bold rounded-lg px-4 py-2 transition-colors cursor-pointer"
          >
            <Printer size={15} aria-hidden="true" />
            Imprimir cartões ({selecionados.size})
          </button>
        </div>
      )}

      {avisoLimite && selecionados.size === 0 && (
        <p className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2 font-sans text-sm text-amber-400">
          Máximo de {MAXIMO_CARTOES} cartões por folha. Desmarque um para marcar outro.
        </p>
      )}

      <div className="hero-background-admin border border-white/10 rounded-xl overflow-x-auto tabela-scroll">
        {/* TAB-06: faixa TOTAL no cabeçalho do card (padrão usuários) */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <TotalBloco total={total} />
        </div>
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-white/10 font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
              <th className="px-3 py-2.5 sm:px-6 sm:py-4 w-10">
                <span className="sr-only">Selecionar para impressão</span>
              </th>
              <th className="px-3 py-2.5 sm:px-6 sm:py-4">Nome</th>
              <th className="px-3 py-2.5 sm:px-6 sm:py-4">Matrícula</th>
              <th className="px-3 py-2.5 sm:px-6 sm:py-4">Situação</th>
              <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((membro) => (
              <tr
                key={membro.id}
                className="bg-white/5 border-b border-white/30 last:border-0 hover:bg-white/15 transition-colors"
              >
                <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                  <input
                    type="checkbox"
                    checked={selecionados.has(membro.id)}
                    onChange={() => alternar(membro.id)}
                    aria-label={`Selecionar cartão de ${membro.nome}`}
                    className="h-4 w-4 rounded border-white/20 bg-[#0d1f3c] text-accent focus:ring-accent cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-sans font-semibold text-white">
                  {membro.nome}
                </td>
                <td className="px-3 py-2.5 sm:px-6 sm:py-4 font-sans text-accent-light font-bold">
                  {membro.matricula}
                </td>
                <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 font-sans text-xs font-bold ${
                      STATUS_CLASS[membro.status] ?? ""
                    }`}
                  >
                    {STATUS_LABEL[membro.status] ?? membro.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 sm:px-6 sm:py-4">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/membros/${membro.id}`}
                      className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-white/75 hover:text-white transition-colors"
                    >
                      <Eye size={15} aria-hidden="true" />
                      Detalhes
                    </Link>
                    <Link
                      href={`/admin/membros/${membro.id}/cartao`}
                      className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-accent-light hover:text-accent-light/75 transition-colors"
                    >
                      <IdCard size={15} aria-hidden="true" />
                      Cartão
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
