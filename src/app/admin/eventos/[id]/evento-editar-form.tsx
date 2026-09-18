"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Evento, EventoStatus } from "@/lib/admin/eventos";

/**
 * Form de edição de evento (EVT-08). PATCH parcial em
 * `/api/admin/eventos/[id]` com toggle `visivel` (checkbox) e toggle `status`
 * EM ABERTO/CONCLUIDO (soft-delete — EVT-10/11); sem botão DELETE (EVT-03).
 * Validado por campo → 400; 200 → fecha e refresh; 401 → login.
 */
export function EventoEditarForm({ evento }: { evento: Evento }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState<EventoStatus>(evento.status);

  const inputClass =
    "w-full rounded-lg bg-[#0d1f3c] border border-white/10 px-4 py-2.5 font-serif text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors";

  if (!aberto) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-lg border-2 border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#0d1f3c] font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          Editar evento
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
      const resposta = await fetch(`/api/admin/eventos/${evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(dados.get("title") ?? "").trim(),
          description: String(dados.get("description") ?? "").trim() || null,
          date: String(dados.get("date") ?? "").trim(),
          time: String(dados.get("time") ?? "").trim(),
          location: String(dados.get("location") ?? "").trim(),
          visivel: dados.get("visivel") === "on",
          status,
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.evento) {
        setAberto(false);
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 404) {
        setMensagem("Este evento não existe mais.");
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
      className="rounded-2xl bg-[#132744] border border-white/10 shadow-xl p-8 sm:p-10 space-y-5 mb-6"
    >
      <h2 className="font-sans text-lg font-bold text-white">
        Editar evento
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
          defaultValue={evento.title}
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
          defaultValue={evento.description ?? ""}
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
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={evento.date}
            className={inputClass}
          />
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
          <input
            id="time"
            name="time"
            type="time"
            required
            defaultValue={evento.time}
            className={inputClass}
          />
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
          defaultValue={evento.location}
          className={inputClass}
        />
        {camposErro.location && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.location}
          </p>
        )}
      </div>

      <div>
        <span className="block font-sans text-sm font-semibold text-white/70 mb-1.5">
          Status
        </span>
        <div className="inline-flex overflow-hidden rounded-full border-2 border-white/10">
          <button
            type="button"
            onClick={() => setStatus("EM ABERTO")}
            className={`px-4 py-1.5 font-sans text-xs font-bold transition-colors ${
              status === "EM ABERTO"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-white/50 hover:text-white"
            }`}
          >
            EM ABERTO
          </button>
          <button
            type="button"
            onClick={() => setStatus("CONCLUIDO")}
            className={`px-4 py-1.5 font-sans text-xs font-bold transition-colors ${
              status === "CONCLUIDO"
                ? "bg-white/10 text-white/70"
                : "text-white/50 hover:text-white"
            }`}
          >
            CONCLUIDO
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50 font-serif">
          CONCLUIDO oculta o evento do portal (soft-delete — o histórico é
          preservado).
        </p>
        {camposErro.status && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.status}
          </p>
        )}
      </div>

      <label className="flex items-center gap-3 font-serif text-white/70 cursor-pointer">
        <input
          type="checkbox"
          name="visivel"
          defaultChecked={evento.visivel}
          className="h-5 w-5 rounded border-white/10 bg-[#0d1f3c] text-accent focus:ring-accent"
        />
        Visível no portal
        {camposErro.visivel && (
          <span className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.visivel}
          </span>
        )}
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-[#c9a84c] hover:bg-[#e0c872] disabled:opacity-60 text-[#0d1f3c] font-sans font-bold px-6 py-2.5 transition-colors"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border-2 border-white/20 text-white/70 hover:bg-white/10 font-sans text-sm font-bold px-5 py-2.5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
