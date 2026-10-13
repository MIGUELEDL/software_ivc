/**
 * Constantes partilhadas entre a página de detalhe (server) e os forms de
 * edição (client). Ficam aqui (módulo sem diretivas) para não duplicar mapas.
 */

export const TRANSICAO_ROTULO: Record<string, string> = {
  ATIVO: "Reativar",
  INATIVO: "Inativar (remover)",
  TRANSFERIDO: "Marcar como transferido",
};

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  comprovante_endereco: "Comprovante de endereço",
  outro: "Outro",
};

export const INPUT_CLASS =
  "w-full rounded-lg border bg-white/10 border-white/30 px-4 py-2.5 font-serif text-white/80 focus:border-accent-light focus:ring-1 focus:ring-primary outline-none transition-colors";
