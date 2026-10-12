/**
 * Fonte única do `release` (OBS-03): SHA do deploy na Vercel, ou "unknown"
 * fora dela (contrato testável local + real em produção).
 */
export function getRelease(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha !== undefined && sha.trim() !== "" ? sha : "unknown";
}
