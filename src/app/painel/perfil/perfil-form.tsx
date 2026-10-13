"use client";

import { useRef, useState } from "react";
import type { Member } from "@/lib/painel/members";
import { civilDe } from "@/lib/painel/validade";

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
    "w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2.5 font-serif text-white placeholder:text-white/40 focus:border-accent-light/60 focus:ring-1 focus:ring-accent-light outline-none transition-colors";

  const labelClass =
    "block font-sans text-sm font-semibold text-white/70 mb-1.5";

  return (
    <div className="space-y-8">
      {mensagem && (
        <p
          className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      <form
        ref={dadosFormRef}
        onSubmit={salvarDados}
        className="rounded-xl hero-background-admin border border-white/10 p-8 sm:p-10 space-y-5"
      >
        <div>
          <label htmlFor="nome" className={labelClass}>
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
            <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
              {camposErro.nome}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="nascimento" className={labelClass}>
            Data de nascimento
          </label>
          <input
            id="nascimento"
            name="nascimento"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={member?.nascimento ?? ""}
            className={`${inputClass} [color-scheme:dark]`}
          />
          {camposErro.nascimento && (
            <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
              {camposErro.nascimento}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="whatsapp" className={labelClass}>
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
            <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
              {camposErro.whatsapp}
            </p>
          )}
        </div>

        <fieldset className="space-y-5 border-t border-white/10 pt-5">
          <legend className="font-sans text-sm font-semibold text-white/70">
            Dados do cartão (opcional)
          </legend>
          <p className="font-serif text-sm text-white/50">
            Deixe em branco o que você ainda não quiser informar no cartão.
          </p>

          <div>
            <label htmlFor="rg" className={labelClass}>
              RG
            </label>
            <input
              id="rg"
              name="rg"
              type="text"
              maxLength={20}
              placeholder="12.345.678-9"
              defaultValue={member?.rg ?? ""}
              className={inputClass}
            />
            {camposErro.rg && (
              <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
                {camposErro.rg}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cpf" className={labelClass}>
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              defaultValue={member?.cpf ?? ""}
              className={inputClass}
            />
            <p className="mt-1 font-serif text-xs text-white/40">
              11 dígitos. A máscara é convertida e os dígitos verificadores não
              são conferidos.
            </p>
            {camposErro.cpf && (
              <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
                {camposErro.cpf}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="data_batismo" className={labelClass}>
              Data de batismo
            </label>
            <input
              id="data_batismo"
              name="data_batismo"
              type="date"
              max={civilDe(new Date())}
              defaultValue={member?.data_batismo ?? ""}
              className={`${inputClass} [color-scheme:dark]`}
            />
            {camposErro.data_batismo && (
              <p className="mt-1 text-sm text-red-400 font-serif" role="alert">
                {camposErro.data_batismo}
              </p>
            )}
          </div>
        </fieldset>

        {member && (
          <p className="font-serif text-sm text-white/50">
            Matrícula:{" "}
            <span className="font-bold text-accent">
              {member.matricula}
            </span>
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white font-sans font-bold py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Salvando..." : member ? "Salvar alterações" : "Criar cadastro"}
        </button>
      </form>

      <form
        onSubmit={salvarFoto}
        className="rounded-xl hero-background-admin border border-white/10 p-8 sm:p-10 space-y-5"
      >
        <div>
          <label htmlFor="foto" className={labelClass}>
            Foto 4x4
          </label>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!member}
            className="w-full font-serif text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:hero-background-admin file:px-4 file:py-2.5 file:font-sans file:font-bold file:text-accent"
          />
          {!member && (
            <p className="mt-1 text-sm text-white/40 font-serif">
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
          className="w-full rounded-lg border border-accent-light text-accent-light hover:bg-accent-light/30 hover:text-white disabled:opacity-60 font-sans font-bold py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Enviando..." : "Enviar foto"}
        </button>
      </form>
    </div>
  );
}