import {
  IdCard,
  Megaphone,
  QrCode,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/auth/claims";
import { listAvisosVisiveis } from "@/lib/painel/avisos";
import { getMemberByAuthUid } from "@/lib/painel/members";

const AVISOS_DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const NAV_CARDS = [
  {
    href: "/painel/dizimo",
    icon: QrCode,
    title: "Dízimo",
    description: "QR PIX pessoal da sua contribuição",
  },
  {
    href: "/painel/cartao",
    icon: IdCard,
    title: "Cartão de membro",
    description: "Cartão para impressão e identificação",
  },
  {
    href: "/painel/perfil",
    icon: UserRound,
    title: "Meus dados",
    description: "Nome, nascimento, WhatsApp e foto",
  },
];

export default async function PainelPage() {
  const claims = await getClaims();

  if (!claims) {
    redirect("/login");
  }

  // Primeiro acesso sem registro em members: encaminha ao autocadastro.
  let semRegistro = false;
  try {
    semRegistro = (await getMemberByAuthUid(claims.sub)) === null;
  } catch {
    // Banco indisponível: a landing segue visível sem quebrar (spec edge case).
    semRegistro = false;
  }
  if (semRegistro) {
    redirect("/painel/perfil?primeiro=1");
  }

  const avisos = await listAvisosVisiveis();

  return (
    <section className="py-8 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h1 className="font-sans text-2xl font-bold text-primary mb-1">
            Painel do Membro
          </h1>
          <p className="font-serif text-sm text-primary/60">
            Bem-vindo, {claims.email}
          </p>
        </div>

        <nav
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Ações do painel"
        >
          {NAV_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl hero-background-admin border border-white/10 p-6 hover:border-accent/40 hover:bg-white/15 transition-all"
              >
                <Icon
                  className="w-8 h-8 text-accent mb-3 group-hover:scale-110 transition-transform"
                  aria-hidden="true"
                />
                <h2 className="font-sans text-lg font-bold text-white mb-1">
                  {card.title}
                </h2>
                <p className="font-serif text-sm text-white/50">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-xl hero-background-admin border border-white/10 p-8 sm:p-10">
          <h2 className="font-sans text-sm font-bold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" aria-hidden="true" />
            Avisos da igreja
          </h2>
          <p className="font-serif text-sm text-white/50 mb-6">
            Fique por dentro dos próximos eventos e campanhas.
          </p>

          {avisos.length === 0 ? (
            <p className="font-serif text-center text-white/40 py-10">
              Nenhum aviso disponível
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {avisos.map((aviso) => (
                <li key={aviso.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <h3 className="font-sans text-base font-bold text-white">
                      {aviso.titulo}
                    </h3>
                    <time
                      dateTime={aviso.data_hora}
                      className="shrink-0 font-sans text-xs font-semibold text-white/40"
                    >
                      {AVISOS_DATE_FORMAT.format(new Date(aviso.data_hora))}
                    </time>
                  </div>
                  <p className="font-serif text-sm text-white/60">
                    {aviso.conteudo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}