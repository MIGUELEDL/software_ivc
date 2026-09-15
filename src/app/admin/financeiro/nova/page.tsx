"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TIPOS_LANCAMENTO,
  METODOS_PAGAMENTO,
} from "@/lib/admin/financeiro-types";

/**
 * Formulário de criação de lançamento financeiro (FIN-01/AC-2/3). POST JSON em
 * `/api/admin/financeiro`; 201 → redireciona à listagem (AC-3); 400 mapeia
 * `campos` por campo (FIN-02/AC-4); 401 → login admin; 403 avisa sem
 * permissão (AC-5). Campos: descrição, valor (≥ 0), tipo (RECEITA/DESPESA),
 * método (PIX/CARTAO/DINHEIRO/TRANSFERENCIA), data (default hoje), categoria
 * e observações (opcionais).
 */
export default function AdminFinanceiroNovaPage() {
  const router = useRouter();
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";
  const hoje = new Date().toISOString().slice(0, 10);

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    const valorRaw = String(dados.get("valor") ?? "").trim();

    try {
      const resposta = await fetch("/api/admin/financeiro", {
        method: "POST",
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

      if (resposta.status === 201 && corpo?.lancamento) {
        router.push("/admin/financeiro");
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para cadastrar lançamentos.");
        return;
      }

      setMensagem("Não foi possível cadastrar o lançamento. Tente novamente.");
    } catch {
      setMensagem("Não foi possível cadastrar o lançamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="font-sans text-3xl font-bold text-primary mb-6">
          Novo lançamento
        </h1>

        <form
          onSubmit={cadastrar}
          className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5"
        >
          {mensagem && (
            <p
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
              role="alert"
            >
              {mensagem}
            </p>
          )}

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
              placeholder="Ex.: Dízimo — culto de domingo"
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
                placeholder="Ex.: 100,00"
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
                defaultValue={hoje}
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
              <select id="tipo" name="tipo" required className={inputClass}>
                {TIPOS_LANCAMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
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
              <select id="metodo" name="metodo" required className={inputClass}>
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
              placeholder="Ex.: Dízimo, Oferta, Conta de luz"
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
              className={inputClass}
            />
            {camposErro.observacoes && (
              <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
                {camposErro.observacoes}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-accent hover:bg-accent-light disabled:opacity-60 text-bg-dark font-sans font-bold py-2.5 transition-colors"
          >
            {enviando ? "Cadastrando..." : "Cadastrar lançamento"}
          </button>
        </form>
      </div>
    </section>
  );
}