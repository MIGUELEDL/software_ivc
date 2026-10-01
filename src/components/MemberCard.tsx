import Image from "next/image";
import { CHURCH } from "@/lib/constants";
import type { Member } from "@/lib/painel/members";
import { code128, code128Runs } from "@/lib/barcode/code128";
import { calcularValidadeCartao } from "@/lib/painel/validade";

function fmtData(v: string | null | undefined) {
  return v ? new Date(v + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

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
      {runs.map((r, i) =>
        r.bar ? (
          <span
            key={i}
            className="bg-[#111]"
            style={{ flexGrow: r.modules, flexBasis: 0 }}
          />
        ) : (
          <span key={i} style={{ flexGrow: r.modules, flexBasis: 0 }} />
        )
      )}
    </div>
  );
}

/**
 * Cartão de membro (ADMINMEM-25) — usado no `/painel/cartao` (T17) e no
 * `/admin/membros/[id]/cartao` (T18). Modelo `public/logo.png` + layout
 * físico ISO/IEC 7810 ID-1 (85,60×53,98 mm). Posições em %, tamanhos em mm
 * (independem do DPI da tela); dados 100% dinâmicos via `Member`.
 * `id="cartao-membro"` é o hook da regra `@media print` das páginas.
 */
export function MemberCard({ member }: { member: Member }) {
  // A validade exibida é o ciclo corrente calculado de `criado_em`, não a
  // coluna `validade_cartao`: ela guarda só o ciclo-base (registro + 1 ano) e
  // um trigger não renova sozinho, porque só dispara em escrita (CART-09..11).
  // Component é de servidor, então `new Date()` aqui é o dia da renderização.
  const validadeCiclo = calcularValidadeCartao(member.criado_em, new Date());

  const campos = {
    id: member.matricula,
    name: member.nome,
    baptismDate: fmtData(member.data_batismo),
    cpf: member.cpf || "—",
    rg: member.rg || "—",
    validity: fmtData(validadeCiclo),
    photo: member.foto_url || undefined,
  };

  return (
    <div id="cartao-membro" className="member-card relative aspect-[85.6/53.98] w-full select-none overflow-hidden bg-[#dce6f8] text-black
    rounded-bl-[5px] rounded-br-[5px] rounded-tl-[5px] rounded-tr-[5px]">
      {/* ═══════════ BACKGROUND — LINHAS DIAGONAIS ═══════════ */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#dce6f8]" />

        {/* Grande onda cinza no lado esquerdo */}
        <div
          className="absolute -left-[12%] -top-[30%] h-[180%] w-[46%] rotate-[26deg] opacity-55"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #9ca8b8 28%, #e5ebf5 29%, #8e99a8 32%, transparent 34%)",
          }}
        />

        {/* Linhas finas diagonais */}
        <div
          className="absolute -left-[12%] -top-[15%] h-[170%] w-[62%] rotate-[25deg] opacity-55"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(80,98,120,0.20) 4px, rgba(80,98,120,0.20) 5px, transparent 6px, transparent 9px)",
          }}
        />

        {/* Segunda camada de linhas */}
        <div
          className="absolute -left-[15%] -top-[20%] h-[180%] w-[68%] rotate-[25deg] opacity-40"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 5px, rgba(255,255,255,0.75) 6px, rgba(255,255,255,0.75) 7px, transparent 8px, transparent 12px)",
          }}
        />

        {/* Ondas inferiores */}
        <div
          className="absolute -bottom-[35%] -left-[15%] h-[100%] w-[90%] rotate-[25deg] opacity-35"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(80,100,125,0.18) 5px, rgba(80,100,125,0.18) 6px, transparent 7px, transparent 11px)",
          }}
        />
      </div>

      {/* ═══════════ FORMAS AZUIS SUPERIORES ═══════════ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36%]">
        {/* Grande bloco azul superior */}
        <div className="absolute -left-[-20%] -top-[105%] h-[145%] w-[172%] rounded-[40px] bg-[#315b8e]" />

        {/* Camada azul escura */}
        <div className="absolute left-[45%] -top-[20%] h-[70%] w-[70%] rounded-bl-[60px] rounded-br-[0px] rounded-tl-[0px] rounded-tr-[70px] bg-[#254e78]" />

        {/* Barra superior direita */}
        <div className="absolute right-[0%] top-[-5%] h-[30%] w-[20%] rounded-l-full bg-[#315f91]" />
        
        {/* linha detalhe esquerda */}
        <div className="absolute left-[54%] -top-[-70%] h-[22%] w-[70%] rounded-full bg-[#254e78]" />

        {/* linha detalhe direita */}
        <div className="absolute left-[-60%] -top-[-70%] h-[22%] w-[70%] rounded-full bg-[#254e78]" />
      
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
      <div className="absolute left-[15.5%] top-[25%] z-30">
        <div className="flex h-[5.5mm] w-[35mm] items-center justify-center rounded-full bg-[#254e78] px-4">
          <span className="whitespace-nowrap text-[3mm] font-bold tracking-tight text-white">
            CARTÃO DE MEMBRO
          </span>
        </div>
      </div>

      {/* ═══════════ BARRA DE IDENTIFICAÇÃO ═══════════ */}
      <div className="absolute left-[33%] top-[37.5%] z-30 flex h-[10%] w-[80%] items-center bg-[#555555] px-[3%]">
        <div className="flex w-full items-center gap-[7%] whitespace-nowrap">
          <div className="flex items-center gap-[2mm]">
            <span className="text-[2.2mm] font-bold text-white">ID:</span>
            <span className="text-[2.2mm] font-bold text-white">{campos.id}</span>
          </div>
          <div className="flex items-center gap-[2mm]">
            <span className="text-[2.2mm] font-bold text-white">NOME:</span>
            <span className="text-[2.2mm] font-bold text-white">{campos.name}</span>
          </div>
        </div>
      </div>

      {/* ═══════════ FOTO ═══════════ */}
      <div className="absolute left-[5%] top-[57%] z-30 h-[36%] w-[23%] overflow-hidden rounded-[1.5mm] bg-[#607cac]">
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
          <p className="m-0 text-[2.2mm] font-bold leading-tight">DATA DE BATISMO</p>
          <p className="m-0 mt-[1.5mm] text-[2.2mm] leading-tight">{campos.baptismDate}</p>
        </div>
        <div>
          <p className="m-0 text-[2.2mm] font-bold leading-tight">RG</p>
          <p className="m-0 mt-[1.5mm] text-[2.2mm] leading-tight">{campos.rg}</p>
        </div>
      </div>

      {/* ═══════════ INFORMAÇÕES — COLUNA DIREITA ═══════════ */}
      <div className="absolute left-[74%] top-[54%] z-30">
        <div className="mb-[4%]">
          <p className="m-0 text-[2.2mm] font-bold leading-tight">CPF</p>
          <p className="m-0 mt-[1.5mm] text-[2.2mm] leading-tight">{campos.cpf}</p>
        </div>
        <div>
          <p className="m-0 text-[2.2mm] font-bold leading-tight">VALIDADE</p>
          <p className="m-0 mt-[1.5mm] text-[2.2mm] leading-tight">{campos.validity}</p>
        </div>
      </div>

      {/* ═══════════ ASSINATURA ═══════════ */}
      <div className="absolute bottom-[5%] left-[42%] z-30">
        <div className="relative h-[10mm] w-[27.5mm]">
          <div className="absolute bottom-[2mm] left-0 h-px w-full bg-black" />
        </div>
        <p className="m-0 text-[2mm] font-bold">Assinatura do Pastor Presidente</p>
      </div>

      {/* ═══════════ CÓDIGO DE BARRAS — CODE 128 (matrícula) ═══════════ */}
      <div className="absolute bottom-[8%] right-[6%] z-30 h-[8%] w-[20%]">
        <Code128Barcode value={campos.id} />
        <div className="mt-[0.8mm] text-center text-[1.4mm] font-mono leading-none tracking-[0.4mm] text-[#111]">
          {campos.id}
        </div>
      </div>
    </div>
  );
}