/** Máximo de pares frente+verso por folha A4 (CART-03/04). */
export const MAXIMO_CARTOES_POR_FOLHA = 4;

/**
 * Normaliza o query param `ids` da página de impressão (CART-03): separa por
 * vírgula, remove espaços e entradas vazias e corta no máximo de pares por
 * folha — id extra é silenciosamente descartado (prova E2E: 6 ids → 4 pares).
 */
export function parseIdsImpressao(
  raw: string,
  max: number = MAXIMO_CARTOES_POR_FOLHA
): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}
