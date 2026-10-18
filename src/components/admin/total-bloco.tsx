/**
 * Bloco de totalização das listagens do painel admin (TAB-01): rótulo TOTAL
 * em cima, número de registros embaixo, alinhado à esquerda — exibido acima
 * da tabela. Em listagens filtradas o número é o total geral (TAB-02), não o
 * resultado do filtro; a omissão em falha de consulta é responsabilidade da
 * página (TAB-04).
 */
export function TotalBloco({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-start" data-testid="total-bloco">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/60">
        TOTAL
      </span>
      <span className="font-sans text-2xl font-bold leading-tight text-white">
        {total}
      </span>
    </div>
  );
}
