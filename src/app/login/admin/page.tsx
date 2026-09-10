export default async function LoginAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error =
    typeof params?.error === "string" ? params.error : null;

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Área Administrativa
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Acesso restrito a gestores da IVC
            </p>
          </div>

          {error === "invalid_credentials" && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif">
              Credenciais inválidas
            </div>
          )}

          <form
            action="/api/auth/login/admin"
            method="POST"
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-accent hover:bg-accent-light text-bg-dark font-sans font-bold py-2.5 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
