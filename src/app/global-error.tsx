"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Fallback de erro de rota (OBS-04): captura a exceção no Sentry e orienta
 * o usuário sem expor stack trace nem a mensagem interna do erro.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="erro-inesperado">
          <h1>Algo não saiu como esperado</h1>
          <p>Tente novamente. Se o problema continuar, fale com a liderança da igreja.</p>
          <button type="button" onClick={() => reset()}>
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
