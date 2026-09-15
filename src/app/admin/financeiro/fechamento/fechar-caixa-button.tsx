"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FechamentoPreview } from "@/lib/admin/financeiro";

/**
 * Botão "Fechar caixa" (FIN-09/AC-21/22/23): o clique abre a prévia do período
 * (receitas/despesas CONCILIADO, saldo e PENDENTES informativos — AC-21);
 * só após "Confirmar" faz POST em `/api/admin/financeiro/fechamento`. O
 * serviço agrega as CONCILIADO sem `cash_close_id` do período, cria o
 * snapshot imutável e marca as transações incluídas. 201 → refresh da
 * listagem; 400 `sem_transacoes_para_fechar` → aviso (AC-23); 401 → login
 * admin; 403 → aviso sem permissão.
 */
export function FecharCaixaButton({ preview }: { preview: FechamentoPreview }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const formatarValor = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  async function fechar() {
    setMensagem(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/admin/financeiro/fechamento", {
        method: "POST",
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 201 && corpo?.fechamento) {
        setConfirmando(false);
        setMensagem(
          "Caixa fechado com sucesso: o snapshot do período foi criado."
        );
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.error === "sem_transacoes_para_fechar") {
        setConfirmando(false);
        setMensagem(
          "Não há transações conciliadas para fechar o caixa neste período."
        );
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para fechar o caixa.");
        return;
      }

      setMensagem("Não foi possível fechar o caixa. Tente novamente.");
    } catch {
      setMensagem("Não foi possível fechar o caixa. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirmando ? (
        <div className="w-full rounded-xl bg-white shadow-md border border-text-dark/10 p-4">
          <p className="font-sans text-sm font-semibold text-text-dark/60 mb-2">
            Prévia do período
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-serif text-sm">
            <dt className="text-text-dark/60">Receitas (conciliadas)</dt>
            <dd className="text-right text-green-700">
              {formatarValor(preview.receitas)}
            </dd>
            <dt className="text-text-dark/60">Despesas (conciliadas)</dt>
            <dd className="text-right text-red-700">
              {formatarValor(preview.despesas)}
            </dd>
            <dt className="text-text-dark/60">Saldo</dt>
            <dd className="text-right font-semibold text-text-dark">
              {formatarValor(preview.saldo)}
            </dd>
            <dt className="text-text-dark/60">
              PENDENTES{" "}
              <span className="text-text-dark/40">(informativo)</span>
            </dt>
            <dd className="text-right text-text-dark/70">
              {preview.pendentes}
            </dd>
          </dl>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false);
                setMensagem(null);
              }}
              disabled={enviando}
              className="rounded-full border-2 border-text-dark/20 hover:border-text-dark/40 text-text-dark font-sans text-sm font-bold px-4 py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={fechar}
              disabled={enviando}
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light disabled:opacity-60 text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              {enviando ? "Fechando..." : "Confirmar fechamento"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          Fechar caixa
        </button>
      )}
      {mensagem && (
        <p
          className="max-w-sm rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-right text-xs text-red-700 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}
    </div>
  );
}