"use client";

import { useRouter } from "next/navigation";

/**
 * Ações de escrita que exigem DELETE (rotas /api/admin/membros/[id] e
 * /documentos/[docId]): confirmação client + fetch + refresh. O hard-delete
 * só é renderizado para ADMIN/SUPER_ADMIN (guard de UI na página; o guard
 * real está no route handler — 403 para os demais, probado em T23).
 */
export function RemoverDocumentoButton({
  membroId,
  docId,
}: {
  membroId: string;
  docId: string;
}) {
  const router = useRouter();

  async function remover() {
    if (!window.confirm("Remover este documento da ficha do membro?")) {
      return;
    }
    const resposta = await fetch(
      `/api/admin/membros/${membroId}/documentos/${docId}`,
      { method: "DELETE" }
    );
    if (resposta.status === 204) {
      router.refresh();
      return;
    }
    window.alert("Não foi possível remover o documento. Tente novamente.");
  }

  return (
    <button
      type="button"
      onClick={remover}
      className="font-sans text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
    >
      Remover
    </button>
  );
}

export function HardDeleteButton({
  membroId,
  nome,
}: {
  membroId: string;
  nome: string;
}) {
  const router = useRouter();

  async function excluir() {
    if (
      !window.confirm(
        `Excluir DEFINITIVAMENTE ${nome}? A conta de acesso e o cadastro serão removidos. Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    const resposta = await fetch(`/api/admin/membros/${membroId}`, {
      method: "DELETE",
    });
    if (resposta.status === 204) {
      router.push("/admin/membros");
      return;
    }
    if (resposta.status === 409) {
      window.alert(
        "Não é possível excluir: há documentos cadastrados na ficha."
      );
      return;
    }
    window.alert("Não foi possível excluir o membro. Tente novamente.");
  }

  return (
    <button
      type="button"
      onClick={excluir}
      className="rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-sans font-bold py-2.5 px-5 transition-colors"
    >
      Excluir definitivamente
    </button>
  );
}