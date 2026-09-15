"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSET_CATEGORIES } from "@/lib/admin/assets";

type AssetCriado = { id: string };

/**
 * Form de criação de bem patrimonial (PAT-04). POST JSON em
 * `/api/admin/assets`; 201 → redireciona ao detalhe; 400 mapeia `campos` por
 * campo (PAT-05); 409 avisa tombo duplicado (PAT-06); 401 → login admin; 403
 * avisa sem permissão.
 */
export function AssetNovoForm() {
  const router = useRouter();
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    const valorRaw = String(dados.get("acquisition_value") ?? "").trim();

    try {
      const resposta = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(dados.get("name") ?? "").trim(),
          category: String(dados.get("category") ?? "").trim(),
          numero_patrimonio:
            String(dados.get("numero_patrimonio") ?? "").trim() || null,
          location: String(dados.get("location") ?? "").trim() || null,
          acquisition_value:
            valorRaw === "" ? null : Number.parseFloat(valorRaw.replace(",", ".")),
          acquisition_date:
            String(dados.get("acquisition_date") ?? "").trim() || null,
          responsible: String(dados.get("responsible") ?? "").trim() || null,
          observations: String(dados.get("observations") ?? "").trim() || null,
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 201 && corpo?.asset?.id) {
        const asset = corpo.asset as AssetCriado;
        router.push(`/admin/patrimonio/${asset.id}`);
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 409) {
        setMensagem("Este número de patrimônio (tombo) já está cadastrado.");
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para cadastrar bens.");
        return;
      }

      setMensagem("Não foi possível cadastrar o bem. Tente novamente.");
    } catch {
      setMensagem("Não foi possível cadastrar o bem. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
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
          htmlFor="name"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Nome do bem
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ex.: Microfone sem fio"
          className={inputClass}
        />
        {camposErro.name && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="category"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Categoria
        </label>
        <select id="category" name="category" required className={inputClass}>
          {ASSET_CATEGORIES.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
        {camposErro.category && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.category}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="numero_patrimonio"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Nº de patrimônio (tombo) — opcional
          </label>
          <input
            id="numero_patrimonio"
            name="numero_patrimonio"
            type="text"
            placeholder="Ex.: PAT-0002"
            className={inputClass}
          />
          {camposErro.numero_patrimonio && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.numero_patrimonio}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="location"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Localização — opcional
          </label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Ex.: Salão principal"
            className={inputClass}
          />
          {camposErro.location && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.location}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="acquisition_value"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Valor de aquisição (R$) — opcional
          </label>
          <input
            id="acquisition_value"
            name="acquisition_value"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex.: 1500,00"
            className={inputClass}
          />
          {camposErro.acquisition_value && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.acquisition_value}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="acquisition_date"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Data de aquisição — opcional
          </label>
          <input
            id="acquisition_date"
            name="acquisition_date"
            type="date"
            className={inputClass}
          />
          {camposErro.acquisition_date && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.acquisition_date}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="responsible"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Responsável — opcional
        </label>
        <input
          id="responsible"
          name="responsible"
          type="text"
          placeholder="Ex.: Equipe de som"
          className={inputClass}
        />
        {camposErro.responsible && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.responsible}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="observations"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Observações — opcional
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          className={inputClass}
        />
        {camposErro.observations && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.observations}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-accent hover:bg-accent-light disabled:opacity-60 text-bg-dark font-sans font-bold py-2.5 transition-colors"
      >
        {enviando ? "Cadastrando..." : "Cadastrar bem"}
      </button>
    </form>
  );
}