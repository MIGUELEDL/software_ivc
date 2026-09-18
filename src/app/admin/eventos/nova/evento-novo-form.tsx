"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventoCriado = { id: string };

/**
 * Form de criação de evento (padrão lideranca-nova-form). POST JSON em
 * `/api/admin/eventos`; 201 → redireciona ao detalhe; 400 mapeia `campos` por
 * campo; 401 → login admin; 403 avisa sem permissão.
 */
export function EventoNovoForm() {
  const router = useRouter();
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg bg-[#0d1f3c] border border-white/10 px-4 py-2.5 font-serif text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors";

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    try {
      const resposta = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(dados.get("title") ?? "").trim(),
          description: String(dados.get("description") ?? "").trim() || null,
          date: String(dados.get("date") ?? "").trim(),
          time: String(dados.get("time") ?? "").trim(),
          location: String(dados.get("location") ?? "").trim(),
          visivel: dados.get("visivel") === "on",
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 201 && corpo?.evento?.id) {
        const evento = corpo.evento as EventoCriado;
        router.push(`/admin/eventos/${evento.id}`);
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para cadastrar eventos.");
        return;
      }

      setMensagem("Não foi possível cadastrar o evento. Tente novamente.");
    } catch {
      setMensagem("Não foi possível cadastrar o evento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={cadastrar}
      className="rounded-2xl bg-[#132744] border border-white/10 shadow-xl p-8 sm:p-10 space-y-5"
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
          htmlFor="title"
          className="block font-sans text-sm font-semibold text-white/70 mb-1.5"
        >
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ex.: Culto de ação de graças"
          className={inputClass}
        />
        {camposErro.title && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.title}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block font-sans text-sm font-semibold text-white/70 mb-1.5"
        >
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className={inputClass}
        />
        {camposErro.description && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.description}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="date"
            className="block font-sans text-sm font-semibold text-white/70 mb-1.5"
          >
            Data
          </label>
          <input id="date" name="date" type="date" required className={inputClass} />
          {camposErro.date && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.date}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="time"
            className="block font-sans text-sm font-semibold text-white/70 mb-1.5"
          >
            Hora
          </label>
          <input id="time" name="time" type="time" required className={inputClass} />
          {camposErro.time && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.time}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="location"
          className="block font-sans text-sm font-semibold text-white/70 mb-1.5"
        >
          Local
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          placeholder="Santa Luzia - PB"
          className={inputClass}
        />
        {camposErro.location && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.location}
          </p>
        )}
      </div>

      <label className="flex items-center gap-3 font-serif text-white/70 cursor-pointer">
        <input
          type="checkbox"
          name="visivel"
          defaultChecked
          className="h-5 w-5 rounded border-white/10 bg-[#0d1f3c] text-accent focus:ring-accent"
        />
        Visível no portal
        {camposErro.visivel && (
          <span className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.visivel}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-[#c9a84c] hover:bg-[#e0c872] disabled:opacity-60 text-[#0d1f3c] font-sans font-bold py-2.5 transition-colors"
      >
        {enviando ? "Cadastrando..." : "Cadastrar evento"}
      </button>
    </form>
  );
}
