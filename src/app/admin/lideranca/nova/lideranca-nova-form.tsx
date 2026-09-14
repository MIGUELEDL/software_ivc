"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IgrejaCriada = { id: string };

/**
 * Form de criação de igreja (padrão membro-novo-form). POST JSON em
 * `/api/admin/igrejas`; 201 → redireciona ao detalhe; 400 mapeia `campos` por
 * campo; 401 → login admin; 403 avisa sem permissão.
 */
export function LiderancaNovaForm() {
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

    try {
      const resposta = await fetch("/api/admin/igrejas", {
        method: "POST",
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

      if (resposta.status === 201 && corpo?.igreja?.id) {
        const igreja = corpo.igreja as IgrejaCriada;
        router.push(`/admin/lideranca/${igreja.id}`);
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para cadastrar igrejas.");
        return;
      }

      setMensagem("Não foi possível cadastrar a igreja. Tente novamente.");
    } catch {
      setMensagem("Não foi possível cadastrar a igreja. Tente novamente.");
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
          Nome da igreja
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
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
          placeholder="IVC"
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
          placeholder="Somente números (14 dígitos)"
          maxLength={14}
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
          placeholder="Rua, número - bairro"
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
          placeholder="Santa Luzia - PB"
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
          max={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
        {camposErro.founded_date && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.founded_date}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-accent hover:bg-accent-light disabled:opacity-60 text-bg-dark font-sans font-bold py-2.5 transition-colors"
      >
        {enviando ? "Cadastrando..." : "Cadastrar igreja"}
      </button>
    </form>
  );
}