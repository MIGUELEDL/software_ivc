"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-full hero-background-accent hover:bg-accent-light text-white font-sans text-sm font-bold px-6 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
    >
      <Printer size={16} aria-hidden="true" />
      Imprimir cartão
    </button>
  );
}