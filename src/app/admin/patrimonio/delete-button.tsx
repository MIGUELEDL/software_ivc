"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja excluir este bem permanentemente?")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/assets/${assetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error === "nao_encontrado"
          ? "Bem não encontrado."
          : "Não foi possível excluir. Tente novamente.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
    >
      <Trash2 size={15} aria-hidden="true" />
      {deleting ? "Excluindo..." : "Excluir"}
    </button>
  );
}
