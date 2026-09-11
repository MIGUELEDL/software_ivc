import {
  IdCard,
  LogOut,
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
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Painel do Membro
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Bem-vindo, {claims.email}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans text-sm font-bold px-5 py-2.5 transition-colors"
            >
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>

        <nav
          className="grid gap-4 sm:grid-cols-3 mb-12"
          aria-label="Ações do painel"
        >
          {NAV_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl bg-white shadow-xl p-6 hover:shadow-2xl transition-shadow"
              >
                <Icon
                  className="w-8 h-8 text-accent mb-3 group-hover:text-accent-light transition-colors"
                  aria-hidden="true"
                />
                <h2 className="font-sans text-lg font-bold text-primary mb-1">
                  {card.title}
                </h2>
                <p className="font-serif text-sm text-text-dark/60">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-10">
          <h2 className="font-sans text-xl font-bold text-primary mb-2 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-accent" aria-hidden="true" />
            Avisos da igreja
          </h2>
          <p className="font-serif text-sm text-text-dark/60 mb-6">
            Fique por dentro dos próximos eventos e campanhas.
          </p>

          {avisos.length === 0 ? (
            <p className="font-serif text-center text-text-dark/60 py-10">
              Nenhum aviso disponível
            </p>
          ) : (
            <ul className="divide-y divide-text-dark/10">
              {avisos.map((aviso) => (
                <li key={aviso.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <h3 className="font-sans text-base font-bold text-text-dark">
                      {aviso.titulo}
                    </h3>
                    <time
                      dateTime={aviso.data_hora}
                      className="shrink-0 font-sans text-xs font-semibold text-text-dark/50"
                    >
                      {AVISOS_DATE_FORMAT.format(new Date(aviso.data_hora))}
                    </time>
                  </div>
                  <p className="font-serif text-sm text-text-dark/70">
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