"use client";

import { Camera, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Lider, LiderStatus } from "@/lib/admin/lideranca";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const STATUS_CLASS: Record<string, string> = {
  ATIVO: "border-green-200 bg-green-50 text-green-700",
  INATIVO: "border-gray-200 bg-gray-50 text-text-dark/60",
};

/**
 * Linha/card de um líder (IGR-18/19/20/21). Exibe nome, cargo, foto e status;
 * em modo edição: campos nome/cargo/ordem + toggle status (ATIVO/INATIVO) e
 * upload de foto. Escritores veem os controles; leitores veem somente leitura.
 */
export function LiderLinha({
  lider,
  escritor,
}: {
  lider: Lider;
  escritor: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fotoMsg, setFotoMsg] = useState<string | null>(null);
  const [fotoEnviando, setFotoEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  async function atualizar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;
    const dados = new FormData(form);

    try {
      const resposta = await fetch(`/api/admin/lideres/${lider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(dados.get("name") ?? "").trim(),
          role: String(dados.get("role") ?? "").trim(),
          order: Number(dados.get("order")),
        }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.lider) {
        setEditando(false);
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

  async function toggleStatus() {
    const novoStatus: LiderStatus =
      lider.status === "ATIVO" ? "INATIVO" : "ATIVO";

    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/lideres/${lider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      if (resposta.status === 200) {
        router.refresh();
        return;
      }

      window.alert("Não foi possível alterar o status. Tente novamente.");
    } catch {
      window.alert("Não foi possível alterar o status. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function uploadFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFotoMsg(null);
    setFotoEnviando(true);

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const resposta = await fetch(`/api/admin/lideres/${lider.id}/foto`, {
        method: "POST",
        body: formData,
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.photo_url) {
        router.refresh();
        return;
      }

      if (resposta.status === 400) {
        setFotoMsg("Tipo de arquivo não permitido (use JPG, PNG ou WebP).");
        return;
      }

      if (resposta.status === 413) {
        setFotoMsg("Arquivo excede 2 MB.");
        return;
      }

      setFotoMsg("Não foi possível enviar a foto. Tente novamente.");
    } catch {
      setFotoMsg("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setFotoEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl p-6">
      <div className="flex items-start gap-4">
        {lider.photo_url ? (
          <img
            src={lider.photo_url}
            alt={lider.name}
            className="h-16 w-16 rounded-full object-cover border border-text-dark/10"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-sans text-lg font-bold text-primary">
            {lider.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {editando ? (
            <form onSubmit={atualizar} className="space-y-3">
              {mensagem && (
                <p
                  className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
                  role="alert"
                >
                  {mensagem}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`lider-name-${lider.id}`}
                    className="sr-only"
                  >
                    Nome
                  </label>
                  <input
                    id={`lider-name-${lider.id}`}
                    name="name"
                    type="text"
                    required
                    defaultValue={lider.name}
                    placeholder="Nome"
                    className={inputClass}
                  />
                  {camposErro.name && (
                    <p
                      className="mt-1 text-sm text-red-600 font-serif"
                      role="alert"
                    >
                      {camposErro.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`lider-role-${lider.id}`}
                    className="sr-only"
                  >
                    Cargo
                  </label>
                  <input
                    id={`lider-role-${lider.id}`}
                    name="role"
                    type="text"
                    required
                    defaultValue={lider.role}
                    placeholder="Cargo"
                    className={inputClass}
                  />
                  {camposErro.role && (
                    <p
                      className="mt-1 text-sm text-red-600 font-serif"
                      role="alert"
                    >
                      {camposErro.role}
                    </p>
                  )}
                </div>
              </div>

              <div className="max-w-[100px]">
                <label
                  htmlFor={`lider-order-${lider.id}`}
                  className="sr-only"
                >
                  Ordem
                </label>
                <input
                  id={`lider-order-${lider.id}`}
                  name="order"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={lider.order}
                  placeholder="Ordem"
                  className={inputClass}
                />
                {camposErro.order && (
                  <p
                    className="mt-1 text-sm text-red-600 font-serif"
                    role="alert"
                  >
                    {camposErro.order}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent hover:bg-accent-light disabled:opacity-60 text-white font-sans text-xs font-bold px-4 py-1.5 transition-colors"
                >
                  <Check size={14} aria-hidden="true" />
                  {enviando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-white font-sans text-xs font-bold px-4 py-1.5 transition-colors"
                >
                  <X size={14} aria-hidden="true" />
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="font-sans text-base font-bold text-text-dark truncate">
                {lider.name}
              </p>
              <p className="font-serif text-sm text-text-dark/60">
                {lider.role} · ordem {lider.order}
              </p>
              <span
                className={`mt-2 inline-block rounded-full border px-3 py-1 font-sans text-xs font-bold ${
                  STATUS_CLASS[lider.status] ?? ""
                }`}
              >
                {STATUS_LABEL[lider.status] ?? lider.status}
              </span>
            </div>
          )}
        </div>

        {escritor && !editando && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-white font-sans text-xs font-bold px-4 py-1.5 transition-colors"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={toggleStatus}
              disabled={enviando}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 font-sans text-xs font-bold px-4 py-1.5 transition-colors disabled:opacity-60 ${
                lider.status === "ATIVO"
                  ? "border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white"
                  : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              }`}
            >
              {enviando
                ? "..."
                : lider.status === "ATIVO"
                  ? "Inativar"
                  : "Ativar"}
            </button>
          </div>
        )}
      </div>

      {escritor && (
        <div className="mt-4 border-t border-text-dark/5 pt-4">
          <label className="inline-flex items-center gap-2 cursor-pointer font-sans text-xs font-bold text-primary hover:text-accent transition-colors">
            <Camera size={15} aria-hidden="true" />
            {fotoEnviando ? "Enviando foto..." : "Trocar foto"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={uploadFoto}
              disabled={fotoEnviando}
            />
          </label>
          {fotoMsg && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {fotoMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}