"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Botão "Fechar caixa" (FIN-09/AC-21/22): POST em
 * `/api/admin/financeiro/fechamento`. O serviço agrega as transações
 * CONCILIADO sem `cash_close_id` do período, cria o snapshot imutável em
 * `cash_closes` e marca as transações incluídas. 201 → refresh da listagem
 * (nova linha no histórico); 400 `sem_transacoes_para_fechar` → aviso (AC-23);
 * 401 → login admin; 403 → aviso sem permissão.
 */
export function FecharCaixaButton() {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
        setMensagem(
          "Caixa fechado com sucesso: o snapshot do período foi criado."
        );
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.error === "sem_transacoes_para_fechar") {
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
      <button
        type="button"
        onClick={fechar}
        disabled={enviando}
        className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light disabled:opacity-60 text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
      >
        {enviando ? "Fechando..." : "Fechar caixa"}
      </button>
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