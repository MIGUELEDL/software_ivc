"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TIPOS_LANCAMENTO,
  METODOS_PAGAMENTO,
  type Lancamento,
} from "@/lib/admin/financeiro-types";

/**
 * Ações de escrita do detalhe do lançamento (FIN-05/AC-7/9/10): editar (PATCH
 * parcial em `/api/admin/financeiro/[id]`) e cancelar (POST
 * `/api/admin/financeiro/[id]/cancelar`, PENDENTE → CANCELADO). Somente para
 * lançamentos PENDENTE — CONCILIADO é imutável (AC-8) e CANCELADO é
 * definitivo (AC-10); o componente retorna `null` nesses casos.
 */
export function LancamentoAcoes({ lancamento }: { lancamento: Lancamento }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  if (lancamento.status !== "PENDENTE") {
    return null;
  }

  async function cancelar() {
    setMensagem(null);
    setEnviando(true);
    try {
      const resposta = await fetch(
        `/api/admin/financeiro/${lancamento.id}/cancelar`,
        { method: "POST" }
      );

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.lancamento) {
        router.push("/admin/financeiro");
        return;
      }

      setMensagem(
        corpo?.error === "transacao_nao_cancelavel"
          ? "Este lançamento não pode mais ser cancelado."
          : "Não foi possível cancelar o lançamento. Tente novamente."
      );
    } catch {
      setMensagem("Não foi possível cancelar o lançamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);
    const valorRaw = String(dados.get("valor") ?? "").trim();

    try {
      const resposta = await fetch(`/api/admin/financeiro/${lancamento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: String(dados.get("descricao") ?? "").trim(),
          valor: Number.parseFloat(valorRaw.replace(",", ".")),
          tipo: String(dados.get("tipo") ?? "").trim(),
          metodo: String(dados.get("metodo") ?? "").trim(),
          data: String(dados.get("data") ?? "").trim(),
          categoria: String(dados.get("categoria") ?? "").trim() || null,
          observacoes:
            String(dados.get("observacoes") ?? "").trim() || null,
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.lancamento) {
        setAberto(false);
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 400 && corpo?.error === "transacao_conciliada") {
        setMensagem(
          "Este lançamento já foi conciliado e não pode ser editado."
        );
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para editar lançamentos.");
        return;
      }

      if (resposta.status === 404) {
        setMensagem("Este lançamento não existe mais.");
        return;
      }

      setMensagem("Não foi possível salvar. Tente novamente.");
    } catch {
      setMensagem("Não foi possível salvar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          {aberto ? "Fechar edição" : "Editar lançamento"}
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={enviando}
          className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          {enviando ? "Cancelando..." : "Cancelar lançamento"}
        </button>
      </div>

      {mensagem && (
        <p
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      {aberto && (
        <form
          onSubmit={salvar}
          className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5"
        >
          <h2 className="font-sans text-lg font-bold text-primary">
            Editar lançamento
          </h2>

          <div>
            <label
              htmlFor="descricao"
              className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
            >
              Descrição
            </label>
            <input
              id="descricao"
              name="descricao"
              type="text"
              required
              defaultValue={lancamento.descricao}
              className={inputClass}
            />
            {camposErro.descricao && (
              <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
                {camposErro.descricao}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="valor"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                Valor (R$)
              </label>
              <input
                id="valor"
                name="valor"
                type="number"
                required
                min="0"
                step="0.01"
                defaultValue={lancamento.valor}
                className={inputClass}
              />
              {camposErro.valor && (
                <p
                  className="mt-1 text-sm text-red-600 font-serif"
                  role="alert"
                >
                  {camposErro.valor}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="data"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                Data
              </label>
              <input
                id="data"
                name="data"
                type="date"
                required
                defaultValue={lancamento.data}
                className={inputClass}
              />
              {camposErro.data && (
                <p
                  className="mt-1 text-sm text-red-600 font-serif"
                  role="alert"
                >
                  {camposErro.data}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tipo"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                Tipo
              </label>
              <select
                id="tipo"
                name="tipo"
                required
                defaultValue={lancamento.tipo}
                className={inputClass}
              >
                {TIPOS_LANCAMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo === "RECEITA" ? "ENTRADA" : "SAÍDA"}
                  </option>
                ))}
              </select>
              {camposErro.tipo && (
                <p
                  className="mt-1 text-sm text-red-600 font-serif"
                  role="alert"
                >
                  {camposErro.tipo}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="metodo"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                Método de pagamento
              </label>
              <select
                id="metodo"
                name="metodo"
                required
                defaultValue={lancamento.metodo}
                className={inputClass}
              >
                {METODOS_PAGAMENTO.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
              {camposErro.metodo && (
                <p
                  className="mt-1 text-sm text-red-600 font-serif"
                  role="alert"
                >
                  {camposErro.metodo}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="categoria"
              className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
            >
              Categoria — opcional
            </label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              defaultValue={lancamento.categoria ?? ""}
              className={inputClass}
            />
            {camposErro.categoria && (
              <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
                {camposErro.categoria}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="observacoes"
              className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
            >
              Observações — opcional
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={lancamento.observacoes ?? ""}
              className={inputClass}
            />
            {camposErro.observacoes && (
              <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
                {camposErro.observacoes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-accent hover:bg-accent-light disabled:opacity-60 text-bg-dark font-sans font-bold px-6 py-2.5 transition-colors"
            >
              {enviando ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}