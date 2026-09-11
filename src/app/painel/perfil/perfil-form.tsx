"use client";

import { useRef, useState } from "react";
import type { Member } from "@/lib/painel/members";

type PerfilFormProps = {
  member: Member | null;
};

const FOTO_ERRO_MENSAGEM: Record<string, string> = {
  foto_invalida: "Selecione um arquivo de imagem.",
  foto_tamanho_invalido: "A foto deve ter no máximo 2MB.",
  foto_tipo_invalido: "Formato permitido: JPG, PNG ou WEBP.",
  membro_nao_encontrado: "Complete seu cadastro antes de enviar a foto.",
  upload_falhou: "Não foi possível enviar a foto. Tente novamente.",
};

export function PerfilForm({ member }: PerfilFormProps) {
  const dadosFormRef = useRef<HTMLFormElement>(null);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvarDados(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = dadosFormRef.current;
    if (!form) {
      setEnviando(false);
      return;
    }

    try {
      const resposta = await fetch("/api/painel/perfil", {
        method: "POST",
        body: new FormData(form),
      });

      if (resposta.status === 401) {
        window.location.assign("/login");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 201) {
        // Autocadastro: confirma e revela a matrícula gerada (PAINEL-19).
        const matricula =
          typeof corpo?.matricula === "string" ? corpo.matricula : "";
        window.location.assign(
          `/painel/perfil?sucesso=criado&matricula=${encodeURIComponent(matricula)}`
        );
        return;
      }

      if (resposta.ok) {
        window.location.assign("/painel/perfil?sucesso=salvo");
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos);
        return;
      }

      if (resposta.status === 409) {
        setMensagem("Seu cadastro já existe. Recarregue a página para editar.");
        return;
      }

      setMensagem("Não foi possível salvar seus dados. Tente novamente.");
    } catch {
      setMensagem("Não foi possível salvar seus dados. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function salvarFoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem(null);
    setEnviando(true);

    const form = event.currentTarget;

    try {
      const resposta = await fetch("/api/painel/perfil/foto", {
        method: "POST",
        body: new FormData(form),
      });

      if (resposta.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (resposta.ok) {
        window.location.assign("/painel/perfil?sucesso=foto");
        return;
      }

      const corpo = await resposta.json().catch(() => null);
      const chave = typeof corpo?.error === "string" ? corpo.error : "";
      setMensagem(
        FOTO_ERRO_MENSAGEM[chave] ??
          "Não foi possível enviar a foto. Tente novamente."
      );
    } catch {
      setMensagem("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  return (
    <div className="space-y-8">
      {mensagem && (
        <p
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      <form
        ref={dadosFormRef}
        onSubmit={salvarDados}
        className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5"
      >
        <div>
          <label
            htmlFor="nome"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Nome completo
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            autoComplete="name"
            defaultValue={member?.nome ?? ""}
            className={inputClass}
          />
          {camposErro.nome && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.nome}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="nascimento"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Data de nascimento
          </label>
          <input
            id="nascimento"
            name="nascimento"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={member?.nascimento ?? ""}
            className={inputClass}
          />
          {camposErro.nascimento && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.nascimento}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="whatsapp"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            required
            autoComplete="tel"
            placeholder="(83) 99999-0000"
            defaultValue={member?.whatsapp ?? ""}
            className={inputClass}
          />
          {camposErro.whatsapp && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.whatsapp}
            </p>
          )}
        </div>

        {member && (
          <p className="font-serif text-sm text-text-dark/60">
            Matrícula: <span className="font-bold">{member.matricula}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-accent hover:bg-accent-light disabled:opacity-60 text-bg-dark font-sans font-bold py-2.5 transition-colors"
        >
          {enviando ? "Salvando..." : member ? "Salvar alterações" : "Criar cadastro"}
        </button>
      </form>

      <form
        onSubmit={salvarFoto}
        className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5"
      >
        <div>
          <label
            htmlFor="foto"
            className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
          >
            Foto 4x4
          </label>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!member}
            className="w-full font-serif text-sm text-text-dark file:mr-4 file:rounded-lg file:border-0 file:bg-bg-gray file:px-4 file:py-2.5 file:font-sans file:font-bold file:text-text-dark"
          />
          {!member && (
            <p className="mt-1 text-sm text-text-dark/60 font-serif">
              Salve seus dados primeiro para liberar o envio da foto.
            </p>
          )}
          {member?.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase (host externo) sem remotePatterns no next.config
            <img
              src={member.foto_url}
              alt="Sua foto atual"
              className="mt-3 h-24 w-24 rounded-lg object-cover"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={!member || enviando}
          className="w-full rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-60 font-sans font-bold py-2.5 transition-colors"
        >
          {enviando ? "Enviando..." : "Enviar foto"}
        </button>
      </form>
    </div>
  );
}