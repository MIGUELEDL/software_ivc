import Image from "next/image";
import { CHURCH } from "@/lib/constants";
import type { Member } from "@/lib/painel/members";
import { code128, code128Runs } from "@/lib/barcode/code128";
import { camposCartao } from "@/lib/painel/cartao";

/** Código de barras Code 128 real da matrícula (módulos proporcionais). */
function Code128Barcode({ value }: { value: string }) {
  let runs: { bar: boolean; modules: number }[] = [];
  try {
    runs = code128Runs(code128(value), 8);
  } catch {
    runs = [];
  }

  if (runs.length === 0) {
    return <div className="h-full w-full" role="img" aria-label="Código de barras indisponível" />;
  }

  return (
    <div
      className="flex h-full w-full items-stretch"
      role="img"
      aria-label={`Código de barras da matrícula ${value}`}
    >
      {runs.map((r, i) => (
        <span
          key={i}
          className={r.bar ? "bg-[#111]" : undefined}
          style={{ flexGrow: r.modules, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

/**
 * Estilos de impressão: frente + verso lado a lado numa única folha A4,
 * colados no meio (linha de dobra), prontos para dobrar e plastificar.
 * Use UMA vez em cada página que imprime o cartão.
 */
export function CardPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 0; }

        /* trava em 1 folha: nada além do cartão pode gerar página extra */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
          background: #fff !important;
        }

        /* esconde tudo, mostra só os cartões */
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

        /* folha: frente | verso, centralizados no topo da A4 */
        #cartao-print {
          position: fixed !important;
          top: 15mm;
          left: 50%;
          transform: translateX(-50%);
          display: flex !important;
          flex-direction: row !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 171.2mm;
        }
        #cartao-print * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        /* marcas de dobra (fora dos cartões, no topo e na base) */
        #cartao-print::before,
        #cartao-print::after {
          content: "";
          position: absolute;
          left: 50%;
          width: 0;
          height: 3mm;
          border-left: 0.2mm solid #888;
        }
        #cartao-print::before { top: -4mm; }
        #cartao-print::after { bottom: -4mm; }

        /* cada face = tamanho ISO ID-1 exato */
        #cartao-print .card-face {
          width: 85.6mm !important;
          height: 53.98mm !important;
          flex: 0 0 85.6mm !important;
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

/** Fundo compartilhado (cor + listras diagonais) da frente e do verso. */
function CardBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[#dce6f8]" />

      <div
        className="absolute -left-[12%] -top-[30%] h-[180%] w-[46%] rotate-[26deg] opacity-55"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #9ca8b8 28%, #e5ebf5 29%, #8e99a8 32%, transparent 34%)",
        }}
      />
      <div
        className="absolute -left-[12%] -top-[15%] h-[170%] w-[62%] rotate-[25deg] opacity-55"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(80,98,120,0.20) 4px, rgba(80,98,120,0.20) 5px, transparent 6px, transparent 9px)",
        }}
      />
      <div
        className="absolute -left-[15%] -top-[20%] h-[180%] w-[68%] rotate-[25deg] opacity-40"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 5px, rgba(255,255,255,0.75) 6px, rgba(255,255,255,0.75) 7px, transparent 8px, transparent 12px)",
        }}
      />
      <div
        className="absolute -bottom-[35%] -left-[15%] h-[100%] w-[90%] rotate-[25deg] opacity-35"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(80,100,125,0.18) 5px, rgba(80,100,125,0.18) 6px, transparent 7px, transparent 11px)",
        }}
      />
    </div>
  );
}

/**
 * Cartão de membro (frente) — ISO/IEC 7810 ID-1 (85,6×53,98 mm).
 * Tudo em % ou cqw (relativo à largura do cartão) → mesma proporção
 * na tela e na impressão. 1mm do layout antigo = 0.59cqw.
 */
export function MemberCard({ member }: { member: Member }) {
  const campos = camposCartao(member, new Date());

  return (
    <div
      id="cartao-membro"
      className="member-card relative aspect-[85.6/53.98] w-full select-none overflow-hidden rounded-[5px] bg-[#dce6f8] text-black [container-type:inline-size]"
    >
    
      <CardBackground />

      {/* ═══════════ FORMAS AZUIS SUPERIORES ═══════════ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36%]">
        <div className="absolute left-[20%] -top-[105%] h-[145%] w-[172%] rounded-[6.25cqw] bg-[#315b8e]" />
        <div className="absolute left-[45%] -top-[20%] h-[70%] w-[70%] rounded-bl-[9.4cqw] rounded-tr-[10.9cqw] bg-[#254e78]" />
        <div className="absolute right-[0%] top-[-5%] h-[30%] w-[20%] rounded-l-full bg-[#315f91]" />
        <div className="absolute left-[54%] top-[70%] h-[22%] w-[70%] rounded-full bg-[#254e78]" />
        <div className="absolute left-[-60%] top-[70%] h-[22%] w-[70%] rounded-full bg-[#254e78]" />
      </div>

      {/* ═══════════ LOGO ═══════════ */}
      <div className="absolute left-[4%] top-[6%] z-20 h-[13%] w-[13%]">
        <Image
          src="/logo.png"
          alt={`Logotipo ${CHURCH.name}`}
          fill
          priority
          sizes="200px"
          className="object-contain object-left"
        />
      </div>

      {/* ═══════════ TÍTULO DO CARTÃO ═══════════ */}
      <div className="absolute left-[17.5%] top-[25%] z-30">
        <div className="flex h-[5.26cqw] w-[29.53cqw] items-center justify-center rounded-full bg-[#254e78] px-[2.5cqw]">
          <span className="whitespace-nowrap text-[2.36cqw] font-bold tracking-tight text-white">
            CARTÃO DE MEMBRO
          </span>
        </div>
      </div>

      {/* ═══════════ BARRA DE IDENTIFICAÇÃO ═══════════ */}
      <div className="absolute left-[33%] top-[37.5%] z-30 flex h-[10%] w-[80%] items-center bg-[#555555] px-[3%]">
        <div className="flex w-full items-center gap-[7%] whitespace-nowrap">
          <div className="flex items-center gap-[1.18cqw]">
            <span className="text-[1.77cqw] font-bold text-white">ID:</span>
            <span className="text-[2.36cqw] font-bold text-white">{campos.id}</span>
          </div>
          <div className="flex items-center gap-[1.18cqw]">
            <span className="text-[1.77cqw] font-bold text-white">NOME:</span>
            <span className="text-[2.36cqw] font-bold text-white">{campos.name}</span>
          </div>
        </div>
      </div>

      {/* ═══════════ FOTO ═══════════ */}
      <div className="absolute left-[5%] top-[57%] z-30 h-[36%] w-[23%] overflow-hidden rounded-[0.89cqw] bg-[#607cac]">
        {campos.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase (host externo) sem remotePatterns no next.config
          <img
            src={campos.photo}
            alt={`Foto de ${campos.name}`}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      {/* ═══════════ INFORMAÇÕES — COLUNA ESQUERDA ═══════════ */}
      <div className="absolute left-[36%] top-[54%] z-30">
        <div className="mb-[4%]">
          <p className="m-0 text-[2.07cqw] font-bold leading-tight">DATA DE BATISMO</p>
          <p className="m-0 mt-[0.59cqw] text-[2.36cqw] leading-tight">{campos.baptismDate}</p>
        </div>
        <div>
          <p className="m-0 text-[2.07cqw] font-bold leading-tight">DATA DE NASCIMENTO</p>
          <p className="m-0 mt-[0.59cqw] text-[2.36cqw] leading-tight">{campos.birthDate}</p>
        </div>
      </div>

      {/* ═══════════ INFORMAÇÕES — COLUNA DIREITA ═══════════ */}
      <div className="absolute left-[74%] top-[54%] z-30">
        <div className="mb-[4%]">
          <p className="m-0 text-[2.07cqw] font-bold leading-tight">CPF</p>
          <p className="m-0 mt-[0.59cqw] text-[2.36cqw] leading-tight">{campos.cpf}</p>
        </div>
        <div>
          <p className="m-0 text-[2.07cqw] font-bold leading-tight">VALIDADE</p>
          <p className="m-0 mt-[0.59cqw] text-[2.36cqw] leading-tight">{campos.validity}</p>
        </div>
      </div>

      {/* ═══════════ ASSINATURA ═══════════ */}
      <div className="absolute bottom-[5%] left-[42%] z-30">
        <div className="relative h-[5.91cqw] w-[16.24cqw]">
          <div className="absolute bottom-[1.18cqw] left-0 h-px w-full bg-black" />
        </div>
        <p className="m-0 text-center text-[1.48cqw] font-bold">Assinatura do Pastor</p>
      </div>
    </div>
  );
}

/** Verso do cartão: mesmo fundo da frente + código de barras da matrícula. */
export function MemberCardBack({ member }: { member: Member }) {
  const campos = camposCartao(member, new Date());

  return (
    <div
      id="cartao-verso"
      className="member-card relative aspect-[85.6/53.98] w-full select-none overflow-hidden rounded-[5px] bg-[#dce6f8] text-black [container-type:inline-size]"
    >
      <CardBackground />

      {/* Código de barras — mesma posição e proporção que tinha na frente */}
      <div className="absolute bottom-[8%] right-[6%] z-30 h-[8%] w-[20%]">
        <Code128Barcode value={campos.id} />
        <div className="mt-[0.47cqw] text-center font-mono text-[0.83cqw] leading-none tracking-[0.24cqw] text-[#111]">
          {campos.id}
        </div>
      </div>
    </div>
  );
}