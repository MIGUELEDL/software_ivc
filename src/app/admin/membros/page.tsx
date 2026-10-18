import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { getClaims } from "@/lib/auth/claims";
import { can } from "@/lib/auth/rbac";
import { listMembros } from "@/lib/admin/membros";
import { TotalBloco } from "@/components/admin/total-bloco";
import { MembrosListaClient } from "./membros-lista-client";

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
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Membros
            </h1>
            <p className="font-serif text-base text-primary/60">
              Registro oficial de membros da igreja.
            </p>
          </div>

          {escritor && (
            <Link
              href="/admin/membros/novo"
              className="inline-flex items-center gap-2 hero-background-accent hover:bg-accent text-white font-sans text-sm font-bold rounded-lg px-4 py-2 transition-colors"
            >
              <UserPlus size={16} aria-hidden="true" />
              Novo membro
            </Link>
          )}
        </div>

        <form
          method="GET"
          action="/admin/membros"
          className="mb-6 flex flex-wrap items-center gap-3 hero-background-admin border border-white/10 rounded-xl p-5"
        >
          <label className="sr-only" htmlFor="q">
            Buscar membro
          </label>
          <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80"
              aria-hidden="true"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por nome ou matrícula"
              className="w-full bg-white/10 border border-white/10 text-white rounded-lg pl-9 pr-3 py-2 font-sans focus:border-accent-light focus:outline-none transition-colors"
            />
          </div>

          <label className="sr-only" htmlFor="status">
            Filtrar por situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusOpt}
            className="min-w-0 flex-1 sm:flex-none bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 font-sans focus:border-accent-light focus:outline-none transition-colors"
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
            className="min-w-0 flex-1 sm:flex-none bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 font-sans focus:border-accent-light focus:outline-none transition-colors"
          >
            <option value="">
              Mês aniversário
            </option>
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
            className="hero-background-accent hover:bg-accent text-white font-sans font-bold rounded-lg px-4 py-2 transition-colors cursor-pointer"
          >
            Filtrar
          </button>
        </form>

        {!falhaConsulta && (
          <div className="mb-4">
            <TotalBloco total={membros.length} />
          </div>
        )}

        {falhaConsulta ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-white/60">
              Não foi possível carregar os membros. Tente novamente mais tarde.
            </p>
          </div>
        ) : membros.length === 0 ? (
          <div className="hero-background-admin border border-white/10 rounded-xl p-10 text-center">
            <p className="font-serif text-base text-white/60">
              Nenhum membro encontrado.
            </p>
          </div>
        ) : (
          <MembrosListaClient membros={membros} />
        )}
      </div>
    </section>
  );
}
