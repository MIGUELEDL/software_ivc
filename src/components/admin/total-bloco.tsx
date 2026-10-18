/**
 * Bloco de totalização das listagens do painel admin: rótulo TOTAL em cima,
 * número de registros embaixo, alinhado à esquerda — renderizado na faixa do
 * cabeçalho do card da tabela (TAB-06, padrão usuários). Em listagens
 * filtradas o número é a contagem do resultado do filtro ativo (TAB-05); a
 * omissão em falha de consulta é responsabilidade da página (TAB-07). `tom`
 * adapta o texto ao fundo da página (admin escuro ou cards claros, ex.:
 * fechamento).
 */
export function TotalBloco({
  total,
  tom = "escuro",
}: {
  total: number;
  tom?: "escuro" | "claro";
}) {
  const rotulo =
    tom === "claro" ? "text-text-dark/60" : "text-white/60";
  const valor = tom === "claro" ? "text-text-dark" : "text-white";

  return (
    <div className="flex flex-col items-start" data-testid="total-bloco">
      <span
        className={`font-sans text-[11px] font-semibold uppercase tracking-wider ${rotulo}`}
      >
        TOTAL
      </span>
      <span
        className={`font-sans text-2xl font-bold leading-tight ${valor}`}
      >
        {total}
      </span>
    </div>
  );
}
