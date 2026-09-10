import { getClaims } from "@/lib/auth/claims";

export default async function AdminPage() {
  const claims = await getClaims();

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Área Administrativa
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Bem-vindo à gestão da IVC
            </p>
          </div>

          {claims ? (
            <div className="space-y-6">
              <div className="rounded-lg bg-bg-gray p-5">
                <p className="font-sans text-sm font-semibold text-text-dark/60 mb-1">
                  E-mail
                </p>
                <p className="font-serif text-base text-text-dark">
                  {claims.email}
                </p>
              </div>

              <div className="rounded-lg bg-bg-gray p-5">
                <p className="font-sans text-sm font-semibold text-text-dark/60 mb-1">
                  Papel
                </p>
                <p className="font-serif text-base text-text-dark">
                  {claims.role ?? "Sem papel atribuído"}
                </p>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white font-sans font-bold py-2.5 transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <p className="text-center font-serif text-text-dark/60">
              Sessão não disponível.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}