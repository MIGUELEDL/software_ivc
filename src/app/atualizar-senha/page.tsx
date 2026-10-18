import { AtualizarSenhaForm } from "./atualizar-senha-form";

export default async function AtualizarSenhaPage({
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
              Criar nova senha
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Defina a senha da sua conta IVC.
            </p>
          </div>

          <AtualizarSenhaForm serverError={error} />
        </div>
      </div>
    </section>
  );
}
