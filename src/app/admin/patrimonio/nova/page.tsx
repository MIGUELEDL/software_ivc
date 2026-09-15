import { AssetNovoForm } from "./asset-novo-form";

export default function AdminPatrimonioNovaPage() {
  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="font-sans text-3xl font-bold text-primary mb-6">
          Novo bem patrimonial
        </h1>
        <AssetNovoForm />
      </div>
    </section>
  );
}