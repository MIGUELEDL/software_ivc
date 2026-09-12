import { Eye, IdCard, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { isAdminWriterRole } from "@/lib/auth/rbac";
import { listMembros } from "@/lib/admin/membros";

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

// Opções de filtro da spec (ADMINMEM-04): todos/ativos/inativos/transferidos.
// O parâmetro de URL é o nome da opção; o valor enviado ao serviço é o status
// do banco (mesmo texto da option = mais simples, aqui mapeado explicitamente).
const STATUS_OPCOES: { valor: string; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
  { valor: "transferidos", rotulo: "Transferidos" },
];

const STATUS_PARA_DB: Record<string, string | undefined> = {
  todos: undefined,
  ativos: "ATIVO",
  inativos: "INATIVO",
  transferidos: "TRANSFERIDO",
};

/**
 * Lista de membros (ADMINMEM-01..05): ordenada `nome asc` por padrão
 * (listMembros), busca por nome/matrícula (`q`) e filtro por situação
 * (`status`) via searchParams. Estado vazio quando o filtro não retorna nada.
 * Ações de leitura (detalhe/cartão) para todo papel admin; link "Novo membro"
 * só para escritores (design, RBAC de UI — o guard real fica nas rotas de API).
 */
export default async function AdminMembrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusOpt =
    typeof params.status === "string" ? params.status : "todos";
  const status = STATUS_PARA_DB[statusOpt] ?? undefined;

  const claims = await getClaims();
  const escritor = isAdminWriterRole(claims?.role ?? "");

  let membros: Awaited<ReturnType<typeof listMembros>> = [];
  let falhaConsulta = false;
  try {
    membros = await listMembros({ q, status });
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Membros
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Registro oficial de membros da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/membros/novo"
              className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <UserPlus size={16} aria-hidden="true" />
              Novo membro
            </Link>
          )}
        </div>

        <form
          method="GET"
          action="/admin/membros"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white shadow-xl p-5"
        >
          <label className="sr-only" htmlFor="q">
            Buscar membro
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40"
              aria-hidden="true"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por nome ou matrícula"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          <label className="sr-only" htmlFor="status">
            Filtrar por situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusOpt}
            className="rounded-lg border border-gray-300 px-3 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          >
            {STATUS_OPCOES.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold px-5 py-2.5 transition-colors"
          >
            Filtrar
          </button>
        </form>

        {falhaConsulta ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-text-dark/70">
              Não foi possível carregar os membros. Tente novamente mais tarde.
            </p>
          </div>
        ) : membros.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center">
            <p className="font-serif text-base text-text-dark/70">
              Nenhum membro encontrado.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-dark/10 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {membros.map((membro) => (
                  <tr
                    key={membro.id}
                    className="border-b border-text-dark/5 last:border-0"
                  >
                    <td className="px-6 py-4 font-sans font-semibold text-text-dark">
                      {membro.nome}
                    </td>
                    <td className="px-6 py-4 font-serif text-primary font-bold">
                      {membro.matricula}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full border px-3 py-1 font-sans text-xs font-bold ${
                          STATUS_CLASS[membro.status] ?? ""
                        }`}
                      >
                        {STATUS_LABEL[membro.status] ?? membro.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/membros/${membro.id}`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        <Link
                          href={`/admin/membros/${membro.id}/cartao`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                        >
                          <IdCard size={15} aria-hidden="true" />
                          Cartão
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}