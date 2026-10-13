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
import { MembroEditarForms } from "./membro-editar-forms";
import { TIPO_DOCUMENTO_LABEL } from "./membro-form-constantes";
import { civilDe } from "@/lib/painel/validade";

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
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-background-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div
            className="rounded-2xl bg-white shadow-xl p-10 text-center"
            role="alert"
          >
            <h1 className="font-sans text-2xl font-bold text-white mb-3">
              Detalhe do membro
            </h1>
            <p className="font-serif text-white/70">
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


  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            href="/admin/membros"
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent-light transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar aos membros
          </Link>
          <Link
            href={`/admin/membros/${id}/cartao`}
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent-light transition-colors"
          >
            <IdCard size={16} aria-hidden="true" />
            Ver cartão
          </Link>
        </div>

        <div className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-sans text-2xl font-bold text-white">
                {membro.nome}
              </h1>
              <p className="mt-1 font-sans text-sm font-semibold text-white/80">
                Matrícula {membro.matricula}
              </p>
            </div>
            <span
              className={`inline-block rounded-full bg-white/20 border border-white/50 text-white px-3 py-1 font-sans text-xs font-bold ${
                STATUS_CLASS[membro.status] ?? ""
              }`}
            >
              {STATUS_LABEL[membro.status] ?? membro.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/80">
                WhatsApp
              </dt>
              <dd className="mt-1 font-serif text-base text-white">
                {membro.whatsapp}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-white/80">
                Nascimento
              </dt>
              <dd className="mt-1 font-serif text-base text-white">
                {membro.nascimento}
              </dd>
            </div>
          </dl>

          {endereco && (
            <div className="mt-5">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-white/80">
                Endereço
              </p>
              <p className="mt-1 font-serif text-base text-white/80">
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
          <MembroEditarForms
            id={id}
            membro={membro}
            transicoes={transicoes}
          />
        )}

        <div className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 space-y-4 mb-6">
          <h2 className="font-sans text-lg font-bold text-white">
            Documentos registrados
          </h2>

          {documentos.length === 0 ? (
            <p className="font-serif text-base text-white/70">
              Nenhum documento registrado.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {documentos.map((documento) => (
                <li
                  key={documento.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-sans text-sm font-bold text-white">
                      {TIPO_DOCUMENTO_LABEL[documento.tipo] ?? documento.tipo}
                    </p>
                    {documento.descricao && (
                      <p className="font-serif text-sm text-white/60">
                        {documento.descricao}
                      </p>
                    )}
                    <p className="font-sans text-xs text-white/40">
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
          <div className="rounded-2xl hero-background-admin shadow-xl p-8 sm:p-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-sans text-lg font-bold text-red-400">
                <Trash2 size={18} aria-hidden="true" />
                Zona de exclusão
              </h2>
              <p className="mt-1 font-serif text-sm text-white/60">
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