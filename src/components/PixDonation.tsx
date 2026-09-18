"use client";

import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, QrCode } from "lucide-react";
import { CHURCH } from "@/lib/constants";

type PixDonationProps = {
  payload: string;
};

export default function PixDonation({ payload }: PixDonationProps) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setNotice(null);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setNotice("Não foi possível copiar. Tente selecionar o código manualmente.");
    }
  }, [payload]);

  return (
    <div className="grid md:grid-cols-2 gap-10 items-start">
      <div className="rounded-2xl bg-[#132744] shadow-xl p-8 sm:p-10 flex flex-col items-center text-center">
        <QrCode className="w-12 h-12 text-accent mb-4" aria-hidden="true" />
        <h2 className="font-sans text-xl font-bold text-white mb-2">
          Escaneie o QR Code
        </h2>
        <p className="font-serif text-base text-white/70 mb-8">
          Abra o app do seu banco, escaneie o código e faça sua doação.
        </p>
        <QRCodeSVG
          value={payload}
          size={220}
          level="M"
          marginSize={1}
          aria-label={`QR Code PIX de ${CHURCH.name}`}
          role="img"
        />
      </div>

      <div className="rounded-2xl bg-[#132744] shadow-xl p-8 sm:p-10 flex flex-col">
        <h2 className="font-sans text-xl font-bold text-white mb-2">
          Ou use o código PIX
        </h2>
        <p className="font-serif text-base text-white/70 mb-8">
          Copie o código abaixo e cole no campo PIX do seu app bancário.
        </p>
        <div
          aria-live="polite"
          className="rounded-lg bg-[#0d1f3c] border border-white/10 p-4 mb-6 break-all font-mono text-xs text-white/80"
        >
          {payload}
        </div>
        {notice ? (
          <p className="font-serif text-sm text-orange-600" role="alert">
            {notice}
          </p>
        ) : null}
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-6 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? "Código copiado!" : "Copiar código PIX"}
        </button>
      </div>
    </div>
  );
}