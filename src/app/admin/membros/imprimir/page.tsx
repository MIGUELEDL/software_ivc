import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MemberCard, MemberCardBack } from "@/components/MemberCard";
import { getMembro } from "@/lib/admin/membros";
import { PrintButton } from "@/app/painel/cartao/print-button";

/** Máximo de pares frente+verso por folha A4 (CART-03). */
const MAXIMO_CARTOES = 4;

/**
 * Estilos de impressão multi-cartão (CART-03/04): até 4 pares frente+verso
 * empilhados verticalmente numa única folha A4 portrait. Faces ampliadas
 * ~+2px por lado (86,7×55,0mm ≈ escala 1.2%) mantendo proporção.
 */
function MultiCardPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 0; }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
          background: #fff !important;
        }

        body * { visibility: hidden; }
        #cartao-print, #cartao-print * { visibility: visible; }

        .print-root {
          min-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          background: none !important;
        }
        .print-root::before, .print-root::after { display: none !important; }
        .print-reset {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* coluna de pares, centralizada no topo da A4 */
        #cartao-print {
          position: fixed !important;
          top: 12mm;
          left: 50%;
          transform: translateX(-50%);
          display: flex !important;
          flex-direction: column !important;
          gap: 8mm !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 175.4mm;
        }
        #cartao-print * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        /* cada par = row frente+verso */
        #cartao-print .card-par {
          display: flex !important;
          flex-direction: row !important;
          gap: 0 !important;
          width: 175.4mm;
        }

        /* faces ampliadas: +~2px por lado (86,7×55,0mm) */
        #cartao-print .card-face {
          width: 86.7mm !important;
          height: 55mm !important;
          flex: 0 0 86.7mm !important;
          margin: 0 !important;
          overflow: hidden !important;
          break-inside: avoid;
        }
        #cartao-print .card-face .member-card {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
        }
      }
    `}</style>
  );
}

/**
 * Impressão multi-cartão (CART-02..05): até 4 membros via ?ids=a,b,c,d.
 * Cada membro vira um par frente+verso empilhado. Ids inválidos são
 * ignorados; mais de 4 são cortados. Sem ids → aviso.
 */
export default async function MembrosImprimirPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.ids === "string" ? params.ids : "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAXIMO_CARTOES);

  const membros: NonNullable<Awaited<ReturnType<typeof getMembro>>>[] = [];
  for (const id of ids) {
    try {
      const m = await getMembro(id);
      if (m) membros.push(m);
    } catch {
      // ignora id inválido / falha de banco individual
    }
  }

  if (membros.length === 0) {
    return (
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="rounded-2xl bg-white shadow-xl p-10 text-center" role="alert">
            <h1 className="font-sans text-2xl font-bold text-primary mb-3">
              Impressão de cartões
            </h1>
            <p className="font-serif text-text-dark/70">
              Nenhum membro válido selecionado. Volte à lista e marque de 1 a 4 membros.
            </p>
            <Link
              href="/admin/membros"
              className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar aos membros
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="print-root pt-24 sm:pt-32 pb-20 sm:pb-32 hero-lite-admin min-h-screen">
      <div className="print-reset max-w-3xl mx-auto px-4">
        <Link
          href="/admin/membros"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold text-primary hover:text-accent-light mb-6 transition-colors print:hidden"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos membros
        </Link>

        <div className="text-center mb-8 print:hidden">
          <h1 className="font-sans text-3xl font-bold text-primary mb-2">
            Impressão de cartões
          </h1>
          <p className="font-serif text-base text-primary/70">
            {membros.length} {membros.length === 1 ? "cartão" : "cartões"} — frente e verso numa folha A4.
          </p>
        </div>

        <div id="cartao-print" className="space-y-8">
          {membros.map((membro) => (
            <div key={membro.id} className="card-par">
              <div className="card-face">
                <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-primary/60 print:hidden">
                  Frente — {membro.nome}
                </p>
                <MemberCard member={membro} />
              </div>
              <div className="card-face">
                <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-primary/60 print:hidden">
                  Verso — {membro.nome}
                </p>
                <MemberCardBack member={membro} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>

      <MultiCardPrintStyles />
    </section>
  );
}
