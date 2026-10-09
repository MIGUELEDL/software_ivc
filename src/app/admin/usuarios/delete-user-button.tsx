"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MENSAGENS: Record<string, string> = {
  nao_encontrado: "Usuário não encontrado.",
  auto_modificacao_nao_permitida: "Você não pode excluir sua própria conta.",
  super_admin_protegido: "Conta SUPER_ADMIN não pode ser excluída.",
  usuario_protegido: "Usuário do sistema não pode ser excluído.",
  usuario_com_vinculos: "Usuário possui registros vinculados; exclusão bloqueada.",
};

export function DeleteUserButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a conta ${email} permanentemente?`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(
          MENSAGENS[data?.error] ??
            "Não foi possível excluir. Tente novamente."
        );
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
      className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
    >
      <Trash2 size={15} aria-hidden="true" />
      {deleting ? "Excluindo..." : "Excluir"}
    </button>
  );
}
