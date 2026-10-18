"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, X } from "lucide-react";

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
      className="font-sans text-sm font-bold text-red-400 hover:text-red-500 transition-colors"
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
      className="rounded-lg border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white font-sans font-bold py-2.5 px-5 transition-colors cursor-pointer"
    >
      Excluir definitivamente
    </button>
  );
}
/**
 * Redefinir senha do membro (SEN-04/05): só renderizado na página para quem
 * passa em `can(role,'membros','administrar')` (ADMIN/SUPER_ADMIN; guard real
 * na rota → 403). POST gera temporária; sucesso abre modal exibindo a senha
 * UMA vez com botão copiar + aviso de entrega manual (fecha zera o estado).
 */
export function RedefinirSenhaButton({ membroId }: { membroId: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState<string | null>(null);
  const [copiada, setCopiada] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function redefinir() {
    if (
      !window.confirm(
        "Gerar uma nova senha temporária para este membro? A senha atual deixa de funcionar e ele será obrigado a trocar no próximo acesso."
      )
    ) {
      return;
    }

    setOcupado(true);
    try {
      const resposta = await fetch(
        `/api/admin/membros/${membroId}/redefinir-senha`,
        { method: "POST" }
      );
      if (resposta.status === 403 || resposta.status === 401) {
        window.alert("Você não tem permissão para redefinir senhas.");
        return;
      }
      if (!resposta.ok) {
        window.alert("Não foi possível redefinir a senha. Tente novamente.");
        return;
      }
      const dados = (await resposta.json()) as { senha?: string };
      if (!dados.senha) {
        window.alert("Não foi possível redefinir a senha. Tente novamente.");
        return;
      }
      setCopiada(false);
      setSenha(dados.senha);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    if (!senha) return;
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
    } catch {
      window.alert("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={redefinir}
        disabled={ocupado}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-accent text-accent hover:bg-accent hover:text-bg-dark font-sans font-bold py-2.5 px-5 transition-colors cursor-pointer disabled:opacity-60"
      >
        <KeyRound size={16} aria-hidden="true" />
        {ocupado ? "Gerando…" : "Redefinir senha"}
      </button>

      {senha && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nova senha temporária"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-sans text-lg font-bold text-primary">
                  Nova senha temporária
                </h3>
                <p className="font-serif text-sm text-text-dark/60 mt-1">
                  Exibida apenas agora. Entregue ao membro em mãos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSenha(null)}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-text-dark/40 hover:text-text-dark hover:bg-gray-100 transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-primary/40 bg-bg-gray px-4 py-3 mb-4">
              <code className="block font-mono text-base sm:text-lg font-bold text-primary break-all select-all">
                {senha}
              </code>
            </div>

            <button
              type="button"
              onClick={copiar}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold py-2.5 transition-colors mb-4"
            >
              {copiada ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Copiada!
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  Copiar senha
                </>
              )}
            </button>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-serif text-amber-800">
              Esta senha será exibida <strong>uma única vez</strong>. O membro
              será obrigado a criar outra no próximo login. Se perder, gere uma
              nova.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
