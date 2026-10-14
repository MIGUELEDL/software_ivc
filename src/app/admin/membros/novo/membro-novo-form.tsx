"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { civilDe } from "@/lib/painel/validade";

type MembroCriado = {
  id: string;
  matricula: string;
};

/**
 * Form de criação de membro (padrão F4 / perfil-form). POST no route handler
 * `/api/admin/membros`; em 201 exibe a SENHA TEMPORÁRIA uma única vez (estado
 * local + botão copiar; nunca em URL — a navegação para o detalhe destrói o
 * estado); 400 mapeia `campos` por campo; 409 avisa `email_em_uso`.
 */
export function MembroNovoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [membroCriado, setMembroCriado] = useState<MembroCriado | null>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [fotoMsg, setFotoMsg] = useState<string | null>(null);
  const [fotoEnviando, setFotoEnviando] = useState(false);
  const [fotoOk, setFotoOk] = useState(false);

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCamposErro({});
    setMensagem(null);
    setEnviando(true);

    const form = formRef.current;
    if (!form) {
      setEnviando(false);
      return;
    }

    try {
      const resposta = await fetch("/api/admin/membros", {
        method: "POST",
        body: new FormData(form),
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (
        resposta.status === 201 &&
        corpo?.member?.id &&
        typeof corpo?.senha_temporaria === "string"
      ) {
        setMembroCriado({
          id: corpo.member.id,
          matricula: corpo.member.matricula,
        });
        setSenhaTemporaria(corpo.senha_temporaria);
        return;
      }

      if (resposta.status === 400 && corpo?.campos) {
        setCamposErro(corpo.campos);
        return;
      }

      if (resposta.status === 409) {
        setMensagem(
          "Este e-mail já está em uso. A pessoa provavelmente já tem acesso."
        );
        return;
      }

      if (resposta.status === 403) {
        setMensagem("Você não tem permissão para cadastrar membros.");
        return;
      }

      setMensagem("Não foi possível cadastrar o membro. Tente novamente.");
    } catch {
      setMensagem("Não foi possível cadastrar o membro. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarSenha() {
    if (!senhaTemporaria) {
      return;
    }
    try {
      await navigator.clipboard.writeText(senhaTemporaria);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 3000);
    } catch {
      setMensagem("Não foi possível copiar. Selecione a senha manualmente.");
    }
  }

  const inputClass =
    "w-full bg-white/10 rounded-lg border border-white/30 px-4 py-2.5 font-serif text-white/80 focus:border-accent-light focus:ring-1 focus:ring-primary outline-none transition-colors";

  async function enviarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !membroCriado) return;

    setFotoMsg(null);
    setFotoOk(false);
    setFotoEnviando(true);

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const resposta = await fetch(
        `/api/admin/membros/${membroCriado.id}/foto`,
        { method: "POST", body: formData }
      );

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return;
      }

      const corpo = await resposta.json().catch(() => null);

      if (resposta.status === 200 && corpo?.foto_url) {
        setFotoOk(true);
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
      event.target.value = "";
    }
  }

  if (membroCriado && senhaTemporaria) {
    return (
      <div className="rounded-2xl hero-lite-admin shadow-xl p-8 sm:p-10 space-y-5 text-center">
        <h2 className="font-sans text-xl font-bold text-white mb-2">
          Membros {membroCriado.matricula} cadastrado!
        </h2>
        <p className="font-serif text-base text-white/70">
          Entregue esta senha temporária ao membro. O primeiro acesso exigirá a
          troca de senha.
        </p>

        <div
          aria-live="polite"
          className="rounded-lg bg-white/10 border border-white/30 p-4 break-all font-mono text-lg font-bold text-white/80"
        >
          {senhaTemporaria}
        </div>

        <div>
          <label
            htmlFor="foto-pos-cadastro"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Foto 4x4 (opcional)
          </label>
          <input
            id="foto-pos-cadastro"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={enviarFoto}
            disabled={fotoEnviando}
            className="w-full rounded-lg bg-white/10 border border-white/30 px-3 py-2 font-serif text-sm text-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-accent-light/20 file:px-4 file:py-1.5 file:font-sans file:text-xs file:font-bold file:text-accent-light cursor-pointer"
          />
          {fotoEnviando && (
            <p className="mt-1 font-serif text-sm text-white/60">
              Enviando foto...
            </p>
          )}
          {fotoOk && (
            <p className="mt-1 font-serif text-sm text-emerald-400">
              Foto registrada!
            </p>
          )}
          {fotoMsg && (
            <p className="mt-1 font-serif text-sm text-red-400" role="alert">
              {fotoMsg}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={copiarSenha}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-6 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copiado ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copiado ? "Senha copiada!" : "Copiar senha"}
          </button>

          <Link
            href={`/admin/membros/${membroCriado.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-light text-white font-sans text-sm font-bold px-6 py-3 transition-colors"
          >
            <UserPlus size={16} aria-hidden="true" />
            Continuar para o cadastro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={cadastrar}
      className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-5"
    >
      {mensagem && (
        <p
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      <div>
        <label
          htmlFor="nome"
          className="block font-sans text-sm font-semibold text-white mb-1.5"
        >
          Nome completo
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
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
          className="block font-sans text-sm font-semibold text-white mb-1.5"
        >
          Data de nascimento
        </label>
        <input
          id="nascimento"
          name="nascimento"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
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
          className="block font-sans text-sm font-semibold text-white mb-1.5"
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
          className={inputClass}
        />
        {camposErro.whatsapp && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.whatsapp}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block font-sans text-sm font-semibold text-white mb-1.5"
        >
          E-mail (acesso do membro)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="membro@email.com"
          className={inputClass}
        />
        {camposErro.email && (
          <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
            {camposErro.email}
          </p>
        )}
      </div>

      <fieldset className="rounded-lg border border-text-dark/10 p-4 space-y-4">
        <legend className="font-sans text-sm font-semibold text-white px-1">
          Dados do cartão (opcional)
        </legend>

        <p className="font-serif text-sm text-white/70">
          Campos em branco ficam sem valor no cartão do membro.
        </p>

        <div>
          <label
            htmlFor="rg"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            RG
          </label>
          <input
            id="rg"
            name="rg"
            type="text"
            maxLength={20}
            placeholder="12.345.678-9"
            className={inputClass}
          />
          {camposErro.rg && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.rg}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cpf"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            className={inputClass}
          />
          <p className="mt-1 font-serif text-xs text-white/50">
            11 dígitos. A máscara é convertida e os dígitos verificadores não são
            conferidos.
          </p>
          {camposErro.cpf && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.cpf}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="data_batismo"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            Data de batismo
          </label>
          <input
            id="data_batismo"
            name="data_batismo"
            type="date"
            max={civilDe(new Date())}
            className={inputClass}
          />
          {camposErro.data_batismo && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.data_batismo}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-text-dark/10 p-4 space-y-4">
        <legend className="font-sans text-sm font-semibold text-white px-1">
          Endereço (opcional)
        </legend>

        <div>
          <label
            htmlFor="logradouro"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            Logradouro
          </label>
          <input
            id="logradouro"
            name="logradouro"
            type="text"
            autoComplete="street-address"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="numero"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            Número
          </label>
          <input
            id="numero"
            name="numero"
            type="text"
            autoComplete="address-line1"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="bairro"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            Bairro
          </label>
          <input
            id="bairro"
            name="bairro"
            type="text"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="cidade"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            Cidade
          </label>
          <input
            id="cidade"
            name="cidade"
            type="text"
            autoComplete="address-level2"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="uf"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            UF
          </label>
          <input
            id="uf"
            name="uf"
            type="text"
            maxLength={2}
            placeholder="PB"
            autoComplete="address-level1"
            className={inputClass}
          />
          {camposErro.uf && (
            <p className="mt-1 text-sm text-red-600 font-serif" role="alert">
              {camposErro.uf}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cep"
            className="block font-sans text-sm font-semibold text-white mb-1.5"
          >
            CEP
          </label>
          <input
            id="cep"
            name="cep"
            type="text"
            autoComplete="postal-code"
            placeholder="00000-000"
            className={inputClass}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white/90 font-sans font-bold py-2.5 transition-colors"
      >
        {enviando ? "Cadastrando..." : "Cadastrar membro"}
      </button>
    </form>
  );
}