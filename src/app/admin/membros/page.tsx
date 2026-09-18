import { Eye, IdCard, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listMembros } from "@/lib/admin/membros";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  TRANSFERIDO: "Transferido",
};

const STATUS_CLASS: Record<string, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  INATIVO: "bg-white/10 text-white/60 border border-white/10",
  TRANSFERIDO: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
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
  const mesAniversario =
    typeof params.mes === "string" && params.mes
      ? Number(params.mes)
      : undefined;

  const claims = await getClaims();
  const escritor = await can(claims?.role ?? "", "membros", "escrever");

  let membros: Awaited<ReturnType<typeof listMembros>> = [];
  let falhaConsulta = false;
  try {
    membros = await listMembros({ q, status, mesAniversario });
  } catch {
    falhaConsulta = true;
  }

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-bold text-white mb-2">
              Membros
            </h1>
            <p className="font-serif text-base text-white/60">
              Registro oficial de membros da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/membros/novo"
              className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c] font-sans text-sm font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <UserPlus size={16} aria-hidden="true" />
              Novo membro
            </Link>
          )}
        </div>

        <form
          method="GET"
          action="/admin/membros"
          className="mb-6 flex flex-wrap items-center gap-3 bg-[#132744] border border-white/10 rounded-xl p-5"
        >
          <label className="sr-only" htmlFor="q">
            Buscar membro
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por nome ou matrícula"
              className="w-full bg-[#0d1f3c] border border-white/10 text-white rounded-lg pl-9 pr-3 py-2 font-sans focus:border-[#c9a84c] focus:outline-none transition-colors"
            />
          </div>

          <label className="sr-only" htmlFor="status">
            Filtrar por situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusOpt}
            className="bg-[#0d1f3c] border border-white/10 text-white rounded-lg px-3 py-2 font-sans focus:border-[#c9a84c] focus:outline-none transition-colors"
          >
            {STATUS_OPCOES.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="mes">
            Filtrar por mês de aniversário
          </label>
          <select
            id="mes"
            name="mes"
            defaultValue={mesAniversario?.toString() ?? ""}
            className="bg-[#0d1f3c] border border-white/10 text-white rounded-lg px-3 py-2 font-sans focus:border-[#c9a84c] focus:outline-none transition-colors"
          >
            <option value="">Mês aniversário</option>
            {[
              { valor: "1", rotulo: "Janeiro" },
              { valor: "2", rotulo: "Fevereiro" },
              { valor: "3", rotulo: "Março" },
              { valor: "4", rotulo: "Abril" },
              { valor: "5", rotulo: "Maio" },
              { valor: "6", rotulo: "Junho" },
              { valor: "7", rotulo: "Julho" },
              { valor: "8", rotulo: "Agosto" },
              { valor: "9", rotulo: "Setembro" },
              { valor: "10", rotulo: "Outubro" },
              { valor: "11", rotulo: "Novembro" },
              { valor: "12", rotulo: "Dezembro" },
            ].map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c] font-sans font-bold rounded-lg px-4 py-2 transition-colors"
          >
            Filtrar
          </button>
        </form>

        {falhaConsulta ? (
          <div className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar os membros. Tente novamente mais tarde.
            </p>
          </div>
        ) : membros.length === 0 ? (
          <div className="bg-[#132744] border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-base text-white/60">
              Nenhum membro encontrado.
            </p>
          </div>
        ) : (
          <div className="bg-[#132744] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
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
                    className="bg-[#0d1f3c] border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-4 font-sans font-semibold text-white">
                      {membro.nome}
                    </td>
                    <td className="px-6 py-4 font-sans text-[#c9a84c] font-bold">
                      {membro.matricula}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 font-sans text-xs font-bold ${
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
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-[#c9a84c] hover:text-[#e0c872] transition-colors"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Detalhes
                        </Link>
                        <Link
                          href={`/admin/membros/${membro.id}/cartao`}
                          className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-[#c9a84c] hover:text-[#e0c872] transition-colors"
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
