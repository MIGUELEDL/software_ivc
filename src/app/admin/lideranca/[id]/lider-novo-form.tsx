"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Form para adicionar um novo líder à igreja (IGR-16/17). POST JSON em
 * `/api/admin/igrejas/[igrejaId]/lideres`. 201 → refresh; 400 por campo;
 * 404 igreja inexistente (não deve acontecer nesta página); 403 sem permissão.
 */
export function LiderNovoForm({ igrejaId }: { igrejaId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const inputClass =
    "w-full rounded-lg bg-white/10 border border-white/50 px-4 py-2.5 font-serif text-white/80 focus:border-accent-light focus:ring-1 focus:ring-primary outline-none transition-colors";

  if (!aberto) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-full hero-background-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors cursor-pointer"
        >
          + Adicionar líder
        </button>
      </div>
    );
  }

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    try {
      const resposta = await fetch(
        `/api/admin/igrejas/${igrejaId}/lideres`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(dados.get("name") ?? "").trim(),
            role: String(dados.get("role") ?? "").trim(),
            order:
              dados.get("order") !== "" && dados.get("order") !== null
                ? Number(dados.get("order"))
                : undefined,
          }),
        }
      );

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 201 && corpo?.lider) {
        setAberto(false);
        form.reset();
        router.refresh();
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos as Record<string, string>);
        return;
      }

      if (resposta.status === 404) {
        setMensagem("Igreja não encontrada.");
        return;
      }

      setMensagem("Não foi possível adicionar o líder. Tente novamente.");
    } catch {
      setMensagem("Não foi possível adicionar o líder. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={cadastrar}
      className="rounded-2xl hero-background-admin shadow-xl p-6 mb-4 space-y-4"
    >
      <h3 className="font-sans text-base font-bold text-white">
        Novo líder
      </h3>

      {mensagem && (
        <p
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="lider-name"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Nome
          </label>
          <input
            id="lider-name"
            name="name"
            type="text"
            required
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
            htmlFor="lider-role"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Cargo
          </label>
          <input
            id="lider-role"
            name="role"
            type="text"
            required
            placeholder="ex.: Pastor Presidente"
            className={inputClass}
          />
          {camposErro.role && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.role}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[140px]">
        <label
          htmlFor="lider-order"
          className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
        >
          Ordem
        </label>
        <input
          id="lider-order"
          name="order"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
          className={inputClass}
        />
        {camposErro.order && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.order}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white/90 font-sans font-bold px-6 py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Adicionando..." : "Adicionar líder"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors cursor-pointer"
        > 
          Cancelar
        </button>
      </div>
    </form>
  );
}