"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Igreja } from "@/lib/admin/lideranca";

/**
 * Form de edição de igreja (IGR-09). PATCH em `/api/admin/igrejas/[id]` com
 * validação por campo → 400; 201 → refresh; 401 → login. Botão inline (Design,
 * sec. Páginas admin).
 */
export function EditarIgrejaForm({ igreja }: { igreja: Igreja }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  if (!aberto) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          Editar igreja
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

    try {
      const resposta = await fetch(`/api/admin/igrejas/${igreja.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(dados.get("name") ?? "").trim(),
          short_name: String(dados.get("short_name") ?? "").trim(),
          cnpj: String(dados.get("cnpj") ?? "").trim(),
          address: String(dados.get("address") ?? "").trim(),
          city: String(dados.get("city") ?? "").trim(),
          founded_date:
            String(dados.get("founded_date") ?? "").trim() || null,
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.igreja) {
        setAberto(false);
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
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
      className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5 mb-6"
    >
      <h2 className="font-sans text-lg font-bold text-primary">
        Editar igreja
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
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Nome da igreja
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={igreja.name}
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
          htmlFor="short_name"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Sigla
        </label>
        <input
          id="short_name"
          name="short_name"
          type="text"
          required
          defaultValue={igreja.short_name}
          className={inputClass}
        />
        {camposErro.short_name && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.short_name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="cnpj"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          CNPJ
        </label>
        <input
          id="cnpj"
          name="cnpj"
          type="text"
          required
          inputMode="numeric"
          maxLength={14}
          defaultValue={igreja.cnpj}
          className={inputClass}
        />
        {camposErro.cnpj && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.cnpj}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="address"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Endereço completo
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          defaultValue={igreja.address}
          className={inputClass}
        />
        {camposErro.address && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.address}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="city"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Cidade
        </label>
        <input
          id="city"
          name="city"
          type="text"
          required
          defaultValue={igreja.city}
          className={inputClass}
        />
        {camposErro.city && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.city}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="founded_date"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Data de fundação (opcional)
        </label>
        <input
          id="founded_date"
          name="founded_date"
          type="date"
          defaultValue={igreja.founded_date ?? ""}
          max={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
        {camposErro.founded_date && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.founded_date}
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
  );
}