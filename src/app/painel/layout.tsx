import { getClaims } from "@/lib/auth/claims";
import { getMemberByAuthUid } from "@/lib/painel/members";
import { PainelNavbar } from "./painel-navbar";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await getClaims();

  let nome = "";
  let fotoUrl: string | null = null;
  if (claims) {
    try {
      const member = await getMemberByAuthUid(claims.sub);
      nome = member?.nome ?? "";
      fotoUrl = member?.foto_url ?? null;
    } catch {
      // sem registro ou banco indisponível: navbar segue sem foto/nome
    }
  }

  return (
    <div className="min-h-screen hero-lite-admin">
      <PainelNavbar
        nome={nome || claims?.email || ""}
        email={claims?.email ?? ""}
        fotoUrl={fotoUrl}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}