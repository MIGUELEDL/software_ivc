"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ASSET_CATEGORIES,
  type Asset,
  type AssetStatus,
} from "@/lib/admin/asset-types";

/**
 * Form de edição de bem patrimonial (PAT-08). PATCH parcial em
 * `/api/admin/assets/[id]` com toggle `status` ATIVO/INATIVO (baixa /
 * soft-delete — PAT-10); sem botão DELETE (PAT-03). Validado por campo → 400;
 * 409 tombo duplicado (PAT-06); 404 avisa; 200 → fecha e refresh; 401 → login.
 */
export function AssetEditarForm({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState<AssetStatus>(asset.status);

  const inputClass =
    "w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 font-serif text-white/80 focus:border-accent-light outline-none transition-colors";

  if (!aberto) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg border-2 border-primary text-primary hover:bg-white/20 hover:text-white/70 font-sans text-sm font-bold px-5 py-2.5 transition-colors cursor-pointer"
        >
          Editar bem
        </button>
      </div>
    );
  }

  async function atualizar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    const valorRaw = String(dados.get("acquisition_value") ?? "").trim();

    try {
      const resposta = await fetch(`/api/admin/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(dados.get("name") ?? "").trim(),
          category: String(dados.get("category") ?? "").trim(),
          numero_patrimonio:
            String(dados.get("numero_patrimonio") ?? "").trim() || null,
          location: String(dados.get("location") ?? "").trim() || null,
          acquisition_value:
            valorRaw === ""
              ? null
              : Number.parseFloat(valorRaw.replace(",", ".")),
          acquisition_date:
            String(dados.get("acquisition_date") ?? "").trim() || null,
          responsible: String(dados.get("responsible") ?? "").trim() || null,
          observations: String(dados.get("observations") ?? "").trim() || null,
          status,
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.asset) {
        setAberto(false);
        router.refresh();
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

      if (resposta.status === 404) {
        setMensagem("Este bem não existe mais.");
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
    <form
      onSubmit={atualizar}
      className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-5 mb-6"
    >
      <h2 className="font-sans text-lg font-bold text-white">
        Editar bem
      </h2>

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
          className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
        >
          Nome do bem
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={asset.name}
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
          className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
        >
          Categoria
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={asset.category}
          className={inputClass}
        >
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
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Nº de patrimônio (tombo) — opcional
          </label>
          <input
            id="numero_patrimonio"
            name="numero_patrimonio"
            type="text"
            defaultValue={asset.numero_patrimonio ?? ""}
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
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Localização — opcional
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={asset.location ?? ""}
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
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Valor de aquisição (R$) — opcional
          </label>
          <input
            id="acquisition_value"
            name="acquisition_value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={asset.acquisition_value ?? ""}
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
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Data de aquisição — opcional
          </label>
          <input
            id="acquisition_date"
            name="acquisition_date"
            type="date"
            defaultValue={asset.acquisition_date ?? ""}
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
          className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
        >
          Responsável — opcional
        </label>
        <input
          id="responsible"
          name="responsible"
          type="text"
          defaultValue={asset.responsible ?? ""}
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
          className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
        >
          Observações — opcional
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          defaultValue={asset.observations ?? ""}
          className={inputClass}
        />
        {camposErro.observations && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.observations}
          </p>
        )}
      </div>

      <div>
        <span className="block font-sans text-sm font-semibold text-white/80 mb-1.5">
          Status
        </span>
        <div className="inline-flex overflow-hidden rounded-full border-2 border-white/30">
          <button
            type="button"
            onClick={() => setStatus("ATIVO")}
            className={`px-4 py-1.5 font-sans text-xs font-bold transition-colors cursor-pointer ${
              status === "ATIVO"
                ? "bg-green-100 text-green-500"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-green-500"
            }`}
          >
            ATIVO
          </button>
          <button
            type="button"
            onClick={() => setStatus("INATIVO")}
            className={`px-4 py-1.5 font-sans text-xs font-bold transition-colors cursor-pointer ${
              status === "INATIVO"
                ? "bg-red-100 text-red-500"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-red-500"
            }`}
          >
            INATIVO
          </button>
        </div>
        <p className="mt-1 text-sm text-white/60 font-serif">
          INATIVO registra a baixa do bem (soft-delete — o histórico é
          preservado).
        </p>
        {camposErro.status && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.status}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white/90 font-sans font-bold px-6 py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border-2 bg-white/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}