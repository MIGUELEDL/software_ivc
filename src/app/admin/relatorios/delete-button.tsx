"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({ documentoId }: { documentoId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(
      `/api/admin/relatorios/documentos/${documentoId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center gap-1.5 rounded-lg bg-bg-dark/30 border border-red-500 text-red-500 hover:bg-red-500/20 hover:text-white/90 font-sans text-xs font-bold px-3 py-1.5 transition-colors cursor-pointer"
    >
      <Trash2 size={12} aria-hidden="true" />
      Excluir
    </button>
  );
}
