"use client";

import { Cake, PartyPopper, X } from "lucide-react";
import { useState } from "react";

/** Formata a lista de nomes: "A", "A e B", "A, B e C" (ANI-02). */
function formatarNomes(nomes: string[]): string {
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * Caixa flutuante de parabéns do topo da home (ANI-01..05): tema da landing
 * (gradiente primary + borda accent), ícone de bolo, nomes em destaque,
 * mensagem de carinho, botão X (dispensa em memória) e animação sutil de
 * entrada. Responsiva 360px+; some na impressão.
 */
export function BirthdayBanner({ aniversariantes }: { aniversariantes: string[] }) {
  const [visivel, setVisivel] = useState(true);

  if (!visivel || aniversariantes.length === 0) {
    return null;
  }

  const nomes = formatarNomes(aniversariantes);
  const plural = aniversariantes.length > 1;

  return (
    <div
      className="fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 print:hidden birthday-fade-in"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes birthday-in {
          from { opacity: 0; transform: translate(-50%, -14px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .birthday-fade-in { animation: birthday-in .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .birthday-fade-in { animation: none; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-gradient-to-r from-[#0d1f3c] via-[#17325a] to-[#0d1f3c] px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)] sm:px-6 sm:py-5">
        {/* brilho sutil de fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl"
        />
        {/* confetes decorativos */}
        <span aria-hidden="true" className="absolute left-4 top-2 text-xs text-accent/70">✦</span>
        <span aria-hidden="true" className="absolute right-14 bottom-2 text-[10px] text-accent/60">✦</span>

        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent/15 sm:h-12 sm:w-12">
            <Cake size={22} className="text-accent" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-accent">
              <PartyPopper size={14} aria-hidden="true" />
              Hoje tem aniversário!
            </p>
            <p className="mt-1 font-serif text-lg font-semibold leading-snug text-white sm:text-xl">
              Feliz aniversário, {nomes}!
            </p>
            <p className="mt-1 font-serif text-sm leading-relaxed text-white/75 sm:text-base">
              {plural
                ? "Que Deus abençoe vocês com muita saúde, paz e alegria neste dia especial!"
                : "Que Deus abençoe você com muita saúde, paz e alegria neste dia especial!"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setVisivel(false)}
            aria-label="Fechar saudação de aniversário"
            className="shrink-0 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
