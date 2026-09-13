import { ArrowLeft, IdCard, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import {
  getMembro,
  listDocumentos,
  TRANSICOES,
} from "@/lib/admin/membros";
import { RemoverDocumentoButton, HardDeleteButton } from "./membro-detalhe-acoes";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  TRANSFERIDO: "Transferido",
};

const STATUS_CLASS: Record<string, string> = {
  ATIVO: "border-green-200 bg-green-50 text-green-700",
  INATIVO: "border-gray-200 bg-gray-50 text-text-dark/60",
  TRANSFERIDO: "border-amber-200 bg-amber-50 text-amber-700",
};

const TRANSICAO_ROTULO: Record<string, string> = {
  ATIVO: "Reativar",
  INATIVO: "Inativar (remover)",
  TRANSFERIDO: "Marcar como transferido",
};

const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  comprovante_endereco: "Comprovante de endereço",
  outro: "Outro",
};

/**
 * Detalhe do membro (ADMINMEM-24): dados, contatos, endereço, situação,
 * documentos e ações. Qualquer papel admin lê; forms de escrita (dados,
 * transição, documentos) e remoção de doc só para escritores; hard-delete só
 * quem administra membros na matriz (can "membros","administrar"). Guard real
 * nas rotas de API (403).
 */
export default async function MembroDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claims = await getClaims();
  const escritor = await can(claims?.role ?? "", "membros", "escrever");
  const hardDelete = await can(claims?.role ?? "", "membros", "administrar");

  let membro: Awaited<ReturnType<typeof getMembro>> = null;
  let documentos: Awaited<ReturnType<typeof listDocumentos>> = [];
  let falhaConsulta = false;
  try {
    membro = await getMembro(id);
    if (membro) {
      documentos = await listDocumentos(id);
    }
  } catch {
    falhaConsulta = true;
  }

  if (falhaConsulta) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Detalhe do membro
            </h1>
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar os dados. Tente novamente mais tarde.
            </p>
            <Link
              href="/admin/membros"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar aos membros
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!membro) {
    notFound();
  }

  const transicoes = TRANSICOES[membro.status] ?? [];
  const endereco = [
    membro.logradouro,
    membro.numero,
    membro.bairro,
    membro.cidade,
    membro.uf,
    membro.cep,
  ].some(Boolean);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors";

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            href="/admin/membros"
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar aos membros
          </Link>
          <Link
            href={`/admin/membros/${id}/cartao`}
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
          >
            <IdCard size={16} aria-hidden="true" />
            Ver cartão
          </Link>
        </div>

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-sans text-2xl font-bold text-primary">
                {membro.nome}
              </h1>
              <p className="mt-1 font-sans text-sm font-semibold text-primary">
                Matrícula {membro.matricula}
              </p>
            </div>
            <span
              className={`inline-block rounded-full border px-3 py-1 font-sans text-xs font-bold ${
                STATUS_CLASS[membro.status] ?? ""
              }`}
            >
              {STATUS_LABEL[membro.status] ?? membro.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                WhatsApp
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {membro.whatsapp}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Nascimento
              </dt>
              <dd className="mt-1 font-serif text-base text-text-dark">
                {membro.nascimento}
              </dd>
            </div>
          </dl>

          {endereco && (
            <div className="mt-5">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                Endereço
              </p>
              <p className="mt-1 font-serif text-base text-text-dark">
                {[membro.logradouro, membro.numero]
                  .filter(Boolean)
                  .join(", ")
                  .trim() || "—"}
                {membro.bairro ? `, ${membro.bairro}` : ""}
                {membro.cidade ? ` - ${membro.cidade}` : ""}
                {membro.uf ? `/${membro.uf}` : ""}
                {membro.cep ? ` · CEP ${membro.cep}` : ""}
              </p>
            </div>
          )}
        </div>

        {escritor && (
          <>
            <form
              action={`/api/admin/membros/${id}/dados`}
              method="POST"
              className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5 mb-6"
            >
              <h2 className="font-sans text-lg font-bold text-primary">
                Editar dados
              </h2>

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
                  defaultValue={membro.nome}
                  className={inputClass}
                />
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
                  defaultValue={membro.nascimento}
                  className={inputClass}
                />
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
                  defaultValue={membro.whatsapp}
                  className={inputClass}
                />
              </div>

              <fieldset className="rounded-lg border border-text-dark/10 p-4 space-y-4">
                <legend className="font-sans text-sm font-semibold text-text-dark px-1">
                  Endereço (opcional)
                </legend>

                <div>
                  <label
                    htmlFor="logradouro"
                    className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                  >
                    Logradouro
                  </label>
                  <input
                    id="logradouro"
                    name="logradouro"
                    type="text"
                    defaultValue={membro.logradouro ?? ""}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="numero"
                      className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                    >
                      Número
                    </label>
                    <input
                      id="numero"
                      name="numero"
                      type="text"
                      defaultValue={membro.numero ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bairro"
                      className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                    >
                      Bairro
                    </label>
                    <input
                      id="bairro"
                      name="bairro"
                      type="text"
                      defaultValue={membro.bairro ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cidade"
                      className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                    >
                      Cidade
                    </label>
                    <input
                      id="cidade"
                      name="cidade"
                      type="text"
                      defaultValue={membro.cidade ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="uf"
                        className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
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
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cep"
                        className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                      >
                        CEP
                      </label>
                      <input
                        id="cep"
                        name="cep"
                        type="text"
                        defaultValue={membro.cep ?? ""}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className="w-full rounded-lg bg-accent hover:bg-accent-light text-bg-dark font-sans font-bold py-2.5 transition-colors"
              >
                Salvar alterações
              </button>
            </form>

            <form
              action={`/api/admin/membros/${id}/status`}
              method="POST"
              className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5 mb-6"
            >
              <h2 className="font-sans text-lg font-bold text-primary">
                Situação do membro
              </h2>

              {transicoes.length === 0 ? (
                <p className="font-serif text-base text-text-dark/70">
                  Situação terminal: nenhuma transição disponível.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {transicoes.map((destino) => (
                    <button
                      key={destino}
                      type="submit"
                      name="status"
                      value={destino}
                      className="rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans text-sm font-bold px-5 py-2 transition-colors"
                    >
                      {TRANSICAO_ROTULO[destino] ?? destino}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <form
              action={`/api/admin/membros/${id}/documentos`}
              method="POST"
              className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-5 mb-6"
            >
              <h2 className="font-sans text-lg font-bold text-primary">
                Documentos
              </h2>

              <div>
                <label
                  htmlFor="tipo"
                  className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                >
                  Tipo
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  className={inputClass}
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
                  className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                >
                  Descrição (opcional)
                </label>
                <input
                  id="descricao"
                  name="descricao"
                  type="text"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-accent hover:bg-accent-light text-bg-dark font-sans font-bold py-2.5 transition-colors"
              >
                Registrar documento
              </button>
            </form>
          </>
        )}

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 space-y-4 mb-6">
          <h2 className="font-sans text-lg font-bold text-primary">
            Documentos registrados
          </h2>

          {documentos.length === 0 ? (
            <p className="font-serif text-base text-text-dark/70">
              Nenhum documento registrado.
            </p>
          ) : (
            <ul className="divide-y divide-text-dark/5">
              {documentos.map((documento) => (
                <li
                  key={documento.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-sans text-sm font-bold text-text-dark">
                      {TIPO_DOCUMENTO_LABEL[documento.tipo] ?? documento.tipo}
                    </p>
                    {documento.descricao && (
                      <p className="font-serif text-sm text-text-dark/60">
                        {documento.descricao}
                      </p>
                    )}
                    <p className="font-sans text-xs text-text-dark/40">
                      {new Date(documento.criado_em).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  {escritor && (
                    <RemoverDocumentoButton
                      membroId={id}
                      docId={documento.id}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {hardDelete && (
          <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-sans text-lg font-bold text-red-600">
                <Trash2 size={18} aria-hidden="true" />
                Zona de exclusão
              </h2>
              <p className="mt-1 font-serif text-sm text-text-dark/60">
                Remove o cadastro e a conta de acesso. Só disponível sem
                documentos registrados.
              </p>
            </div>
            <HardDeleteButton membroId={id} nome={membro.nome} />
          </div>
        )}
      </div>
    </section>
  );
}