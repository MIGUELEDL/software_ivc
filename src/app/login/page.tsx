import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error =
    typeof params?.error === "string" ? params.error : null;

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-landing min-h-screen">
      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl hero-background-lite border border-white/10 shadow-xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="Logo IVC"
              width={64}
              height={64}
              className="mx-auto mb-4"
            />
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Entrar
            </h1>
            <p className="font-serif text-base text-primary/50">
              Área do membro da IVC
            </p>
          </div>

          {error === "invalid_credentials" && (
            <div className="mb-6 rounded-lg bg-white/20 border border-red-200 px-4 py-3 text-sm text-center text-red-700/60 font-serif">
              Credenciais inválidas
            </div>
          )}

          <form action="/api/auth/login" method="POST" className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-sans text-sm font-semibold text-primary/80 mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg bg-white/50 border border-white/10 px-4 py-2.5 font-serif text-primary/80 focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-sans text-sm font-semibold text-primary/80 mb-1.5"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg bg-white/50 border border-white/10 px-4 py-2.5 font-serif text-primary/80 focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold py-2.5 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
