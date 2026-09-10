import { TrocarSenhaForm } from "./trocar-senha-form";

export default async function TrocarSenhaPage({
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
              Trocar senha
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Para sua segurança, defina uma nova senha.
            </p>
          </div>

          {error === "auth_required" && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif">
              Sessão não encontrada. Faça login novamente para trocar a senha.
            </div>
          )}

          {error === "weak_password" && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif">
              A senha não atende aos requisitos: mínimo 8 caracteres, com letra
              e número.
            </div>
          )}

          <TrocarSenhaForm />
        </div>
      </div>
    </section>
  );
}
