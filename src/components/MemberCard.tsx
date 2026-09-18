import { UserRound } from "lucide-react";
import { CHURCH } from "@/lib/constants";
import type { Member } from "@/lib/painel/members";

/**
 * Cartão de membro (ADMINMEM-25) — presentacional, usado no `/painel/cartao`
 * (T17) e no `/admin/membros/[id]/cartao` (T18). O `id="cartao-membro"` é
 * referenciado pelos estilos de impressão das páginas (regra `@media print`),
 * por isso vive aqui com o mesmo markup do bloco original
 * (`painel/cartao/page.tsx:78-132`) — 1 fonte, 2 cartões, zero divergência.
 */
export function MemberCard({ member }: { member: Member }) {
  return (
    <div
      id="cartao-membro"
      className="overflow-hidden rounded-2xl bg-white shadow-xl"
    >
      <div className="flex items-center justify-between bg-[#1a3a6b] px-6 py-4">
        <span className="font-sans text-lg font-bold text-white">
          {CHURCH.shortName}
        </span>
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#c9a84c]">
          Membro
        </span>
      </div>

      <div className="flex items-center gap-5 p-6">
        {member.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase (host externo) sem remotePatterns no next.config
          <img
            src={member.foto_url}
            alt={`Foto de ${member.nome}`}
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100"
            aria-label="Foto não enviada"
          >
            <UserRound
              className="h-10 w-10 text-gray-300"
              aria-hidden="true"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
            Nome
          </p>
          <p className="truncate font-sans text-lg font-bold text-[#1a3a6b]">
            {member.nome}
          </p>
          <p className="mt-2 font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
            Matrícula
          </p>
          <p className="font-sans text-base font-bold text-[#c9a84c]">
            {member.matricula}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">RG</span>
            <p className="font-serif text-gray-800">{member.rg || "—"}</p>
          </div>
          <div>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">CPF</span>
            <p className="font-serif text-gray-800">{member.cpf || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">Batismo</span>
            <p className="font-serif text-gray-800">
              {member.data_batismo
                ? new Date(member.data_batismo + "T00:00:00").toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
          <div>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">Validade</span>
            <p className="font-serif text-gray-800">
              {member.validade_cartao
                ? new Date(member.validade_cartao + "T00:00:00").toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
        <p className="text-center font-serif text-xs text-gray-500">
          {CHURCH.name}
        </p>
      </div>
    </div>
  );
}
