"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { civilDe } from "@/lib/painel/validade";
import type { MembroAdmin } from "@/lib/admin/membros";
import {
  INPUT_CLASS,
  TIPO_DOCUMENTO_LABEL,
  TRANSICAO_ROTULO,
} from "./membro-form-constantes";

/**
 * Forms de escrita do detalhe do membro (dados, transição, documentos).
 * Envio via fetch (nunca submit nativo): submit nativo navegava para a URL
 * da API exibindo JSON cru. Sucesso → volta para `/admin/membros`;
 * 401 → login; erro → mensagem inline sem sair da página.
 */
/**
 * Só os campos editáveis atravessam para o client (nada de auth_user_id
 * ou metadados na serialização do RSC).
 */
type MembroEditavel = Pick<
  MembroAdmin,
  | "nome"
  | "nascimento"
  | "whatsapp"
  | "rg"
  | "cpf"
  | "data_batismo"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "uf"
  | "cep"
>;

export function MembroEditarForms({
  id,
  membro,
  transicoes,
}: {
  id: string;
  membro: MembroEditavel;
  transicoes: string[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function postar(
    caminho: string,
    dados: FormData,
    sucessoStatus: number[],
    erroMsg: string
  ): Promise<boolean> {
    setMensagem(null);
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/membros/${id}/${caminho}`, {
        method: "POST",
        body: dados,
      });

      if (resposta.status === 401) {
        window.location.assign("/login/admin");
        return false;
      }

      if (sucessoStatus.includes(resposta.status)) {
        router.push("/admin/membros");
        return true;
      }

      if (resposta.status === 404) {
        setMensagem("Este membro não existe mais.");
        return false;
      }

      setMensagem(erroMsg);
      return false;
    } catch {
      setMensagem(erroMsg);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function salvarDados(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postar(
      "dados",
      new FormData(event.currentTarget),
      [200],
      "Não foi possível salvar. Tente novamente."
    );
  }

  async function trocarStatus(status: string) {
    const dados = new FormData();
    dados.set("status", status);
    await postar(
      "status",
      dados,
      [200],
      "Não foi possível alterar a situação. Tente novamente."
    );
  }

  async function registrarDocumento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postar(
      "documentos",
      new FormData(event.currentTarget),
      [200, 201],
      "Não foi possível registrar o documento. Tente novamente."
    );
  }

  return (
    <>
      {mensagem && (
        <p
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif mb-6"
          role="alert"
        >
          {mensagem}
        </p>
      )}

      <form
        onSubmit={salvarDados}
        className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-5 mb-6"
      >
        <h2 className="font-sans text-lg font-bold text-white">
          Editar dados
        </h2>

        <div>
          <label
            htmlFor="nome"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Nome completo
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            defaultValue={membro.nome}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="nascimento"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Data de nascimento
          </label>
          <input
            id="nascimento"
            name="nascimento"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={membro.nascimento}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="whatsapp"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            required
            defaultValue={membro.whatsapp}
            className={INPUT_CLASS}
          />
        </div>

        <fieldset className="rounded-lg border bg-white/10 border-white/30 p-4 space-y-4">
          <legend className="font-sans text-sm font-semibold text-white px-1">
            Dados do cartão (opcional)
          </legend>

          <p className="font-serif text-sm text-white/80">
            Apagar o conteúdo de um campo limpa o dado do cartão.
          </p>

          <div>
            <label
              htmlFor="rg"
              className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
            >
              RG
            </label>
            <input
              id="rg"
              name="rg"
              type="text"
              maxLength={20}
              placeholder="12.345.678-9"
              defaultValue={membro.rg ?? ""}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label
              htmlFor="cpf"
              className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
            >
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              defaultValue={membro.cpf ?? ""}
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-serif text-xs text-white/70">
              11 dígitos. A máscara é convertida e os dígitos verificadores
              não são conferidos.
            </p>
          </div>

          <div>
            <label
              htmlFor="data_batismo"
              className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
            >
              Data de batismo
            </label>
            <input
              id="data_batismo"
              name="data_batismo"
              type="date"
              max={civilDe(new Date())}
              defaultValue={membro.data_batismo ?? ""}
              className={INPUT_CLASS}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-white/30 p-4 space-y-4">
          <legend className="font-sans text-sm font-semibold text-white/80 px-1">
            Endereço (opcional)
          </legend>

          <div>
            <label
              htmlFor="logradouro"
              className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
            >
              Logradouro
            </label>
            <input
              id="logradouro"
              name="logradouro"
              type="text"
              defaultValue={membro.logradouro ?? ""}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="numero"
                className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
              >
                Número
              </label>
              <input
                id="numero"
                name="numero"
                type="text"
                defaultValue={membro.numero ?? ""}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="bairro"
                className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
              >
                Bairro
              </label>
              <input
                id="bairro"
                name="bairro"
                type="text"
                defaultValue={membro.bairro ?? ""}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="cidade"
                className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
              >
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                type="text"
                defaultValue={membro.cidade ?? ""}
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="uf"
                  className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
                >
                  UF
                </label>
                <input
                  id="uf"
                  name="uf"
                  type="text"
                  maxLength={2}
                  placeholder="PB"
                  defaultValue={membro.uf ?? ""}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="cep"
                  className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
                >
                  CEP
                </label>
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  defaultValue={membro.cep ?? ""}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white/90 font-sans font-bold py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-5 mb-6"
      >
        <h2 className="font-sans text-lg font-bold text-white">
          Situação do membro
        </h2>

        {transicoes.length === 0 ? (
          <p className="font-serif text-base text-white/70">
            Situação terminal: nenhuma transição disponível.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {transicoes.map((destino) => (
              <button
                key={destino}
                type="button"
                disabled={enviando}
                onClick={() => trocarStatus(destino)}
                className="rounded-full bg-white/10 border-2 border-white/20 text-white hover:bg-white/30 hover:text-white disabled:opacity-60 font-sans text-sm font-bold px-5 py-2 transition-colors cursor-pointer"
              >
                {TRANSICAO_ROTULO[destino] ?? destino}
              </button>
            ))}
          </div>
        )}
      </form>

      <form
        onSubmit={registrarDocumento}
        className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-5 mb-6"
      >
        <h2 className="font-sans text-lg font-bold text-white">
          Documentos
        </h2>

        <div>
          <label
            htmlFor="tipo"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            required
            className={INPUT_CLASS}
          >
            {Object.entries(TIPO_DOCUMENTO_LABEL).map(
              ([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="descricao"
            className="block font-sans text-sm font-semibold text-white/80 mb-1.5"
          >
            Descrição (opcional)
          </label>
          <input
            id="descricao"
            name="descricao"
            type="text"
            className={INPUT_CLASS}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg hero-background-accent hover:bg-accent-light disabled:opacity-60 text-white/90 font-sans font-bold py-2.5 transition-colors cursor-pointer"
        >
          {enviando ? "Registrando..." : "Registrar documento"}
        </button>
      </form>
    </>
  );
}
