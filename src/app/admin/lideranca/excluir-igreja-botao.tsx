"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Botão de excluir igreja (hard-delete em cascata, IGR-11). Só é renderizado
 * para `SUPER_ADMIN` na página (IGR-12); o guard real revalida no route handler
 * (DELETE /api/admin/igrejas/[id]) e na RLS `churches_delete_super_admin`.
 */
export function ExcluirIgrejaBotao({
  igrejaId,
  nome,
  redirecionar,
}: {
  igrejaId: string;
  nome: string;
  redirecionar?: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    const confirmado = window.confirm(
      `Excluir a igreja "${nome}" e todos os seus líderes? Esta ação não pode ser desfeita.`
    );
    if (!confirmado) {
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch(`/api/admin/igrejas/${igrejaId}`, {
        method: "DELETE",
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      if (resposta.status === 403) {
        setErro("Somente SUPER_ADMIN pode excluir igrejas.");
        window.alert("Somente SUPER_ADMIN pode excluir igrejas.");
        return;
      }

      if (resposta.status === 204) {
        if (redirecionar) {
          router.push(redirecionar);
        } else {
          router.refresh();
        }
        return;
      }

      if (resposta.status === 404) {
        setErro("Igreja não encontrada.");
        window.alert("Igreja não encontrada.");
        return;
      }

      setErro("Não foi possível excluir a igreja. Tente novamente.");
      window.alert("Não foi possível excluir a igreja. Tente novamente.");
    } catch {
      setErro("Não foi possível excluir a igreja. Tente novamente.");
      window.alert("Não foi possível excluir a igreja. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={enviando}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-500 px-3 py-1 font-sans text-xs font-bold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-60 transition-colors cursor-pointer"
    >
      <Trash2 size={13} aria-hidden="true" />
      {enviando ? "Excluindo..." : "Excluir"}
      {erro && <span className="sr-only">{erro}</span>}
    </button>
  );
}