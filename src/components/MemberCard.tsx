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
      <div className="flex items-center justify-between bg-bg-dark px-6 py-4">
        <span className="font-sans text-lg font-bold text-white">
          {CHURCH.shortName}
        </span>
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-accent">
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
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-bg-gray"
            aria-label="Foto não enviada"
          >
            <UserRound
              className="h-10 w-10 text-text-dark/30"
              aria-hidden="true"
            />
          </div>
        )}

        <div className="min-w-0">
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
            Nome
          </p>
          <p className="truncate font-sans text-lg font-bold text-text-dark">
            {member.nome}
          </p>
          <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-wider text-text-dark/50">
            Matrícula
          </p>
          <p className="font-sans text-lg font-bold text-primary">
            {member.matricula}
          </p>
        </div>
      </div>

      <div className="border-t border-text-dark/10 bg-bg-gray px-6 py-3">
        <p className="text-center font-serif text-xs text-text-dark/70">
          {CHURCH.name}
        </p>
      </div>
    </div>
  );
}