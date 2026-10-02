/**
 * Normalização e validação dos dados de documento do cartão de membro
 * (CART-04..CART-07). Módulo puro: sem I/O e sem relógio próprio — `hoje` é
 * sempre injetado pelo caller para que o comportamento seja determinístico em
 * teste. Só depende de `civilDe`, o calendário civil compartilhado com o
 * cálculo de validade.
 *
 * Convenção: campo **vazio** é válido e resolve para `""`; o caller converte
 * `""` em `null` antes de gravar, porque `NULL` e `""` são estados distintos
 * e a coluna é nullable (`0020_member_card_columns.sql`).
 */

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

import { civilDe } from "./validade";

const SOMENTE_DIGITOS = /^\d+$/;

/** RG: texto livre por estado (SSP varia), apenas saneado e limitado. */
const RG_MAX = 20;

/**
 * Remove qualquer caractere de controle (inclusive CR/LF/TAB) — impede que
 * um dado de documento quebre o layout de/impressão do cartão ID-1.
 */
function temControle(valor: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(valor);
}

/**
 * Ausência de erro no mapa por campo das rotas.
 *
 * Existe como função pura para que o "não grava nada quando um campo é
 * inválido" (CART-05..07) seja observável: o probe a executa nos dois
 * sentidos, e inverter a comparação dentro dela quebra o gate. Escretado
 * inline como `Object.keys(campos).length > 0` na rota, trocar por `=== 0`
 * mantinha typecheck, lint, build e todas as probes verdes.
 */
export function temErros(campos: Record<string, string>): boolean {
  return Object.keys(campos).length > 0;
}

/**
 * CPF: aceita apenas dígitos e exige exatamente 11 (CART-05). Máscara é
 * tolerada na entrada (o usuário digita `123.456.789-09`) mas **não** é
 * persistida — o cartão ID-1 não comporta máscara e duas representações do
 * mesmo CPF quebrariam a busca por ele.
 */
export function normalizarCpf(valor: string): Resultado<string> {
  // Controle é testado na entrada CRUA, antes do `trim`: `\n`, `\r` e `\t`
  // são whitespace e o `trim()` removeria um "\n no fim" sem que ele
  // aparecesse em `bruto` — o "11 dígitos" viraria 11 dígitos limpos e a
  // entrada seria aceita. Nenhum campo de documento é textarea, então o
  // browser não produz esses caracteres; quando aparecem, a entrada não veio
  // de um formulário.
  if (temControle(valor)) {
    return { ok: false, erro: "Informe um CPF com 11 dígitos." };
  }

  const bruto = valor.trim();

  if (bruto.length === 0) {
    return { ok: true, valor: "" };
  }

  const digitos = bruto.replace(/\D/g, "");

  // `digitos` vazio com entrada não vazia ("abcdefghijk") cai aqui: é CPF
  // inválido, não CPF ausente.
  if (!SOMENTE_DIGITOS.test(digitos) || digitos.length !== 11) {
    return { ok: false, erro: "Informe um CPF com 11 dígitos." };
  }

  return { ok: true, valor: digitos };
}

/**
 * RG: `trim`, limite de 20 caracteres e rejeição de caractere de controle
 * (CART-07). Sem normalização de máscara — o formato varia por estado.
 */
export function normalizarRg(valor: string): Resultado<string> {
  // Mesma ordem do CPF: controle na entrada crua, senão `\n`/`\t` no fim
  // somem no `trim()` e o limite de 20 caracteres é conferido sobre um valor
  // que o cliente não enviou.
  if (temControle(valor)) {
    return { ok: false, erro: "Informe um RG válido." };
  }

  const limpo = valor.trim();

  if (limpo.length === 0) {
    return { ok: true, valor: "" };
  }

  if (limpo.length > RG_MAX) {
    return {
      ok: false,
      erro: `Informe um RG com no máximo ${RG_MAX} caracteres.`,
    };
  }

  return { ok: true, valor: limpo };
}

/**
 * Data de batismo em `YYYY-MM-DD`: data real no calendário e não posterior a
 * `hoje` (CART-06). Mesma guarda de três passos de `validarNascimento`
 * (`src/app/api/painel/perfil/route.ts`).
 */
export function normalizarDataBatismo(
  valor: string,
  hoje: Date
): Resultado<string> {
  // Controle na entrada crua, antes do `trim()`: um "\n" no fim passaria
  // pelo `trim()` e pelo `/^\d{4}-\d{2}-\d{2}$/`, gravando a data.
  if (temControle(valor)) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  const bruto = valor.trim();

  if (bruto.length === 0) {
    return { ok: true, valor: "" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  const [ano, mes, dia] = bruto.split("-").map(Number);

  // Validação de calendário por round-trip em UTC: `new Date(y, m, d)` depende
  // do fuso do processo, então num servidor em UTC+14 a checagem de overflow
  // (2026-02-30 -> 01/03) poderia escapar.
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return { ok: false, erro: "Informe uma data de batismo válida." };
  }

  // Comparação de dias civis, não de instantes: uma data é "futura" quando está
  // depois do dia de hoje no calendário da igreja. Usar `Date` aqui faria o
  // resultado variar com o TZ do deploy.
  if (bruto > civilDe(hoje)) {
    return {
      ok: false,
      erro: "A data de batismo não pode ser futura.",
    };
  }

  return { ok: true, valor: bruto };
}

export type DadosDocumentoEntrada = {
  rg: string;
  cpf: string;
  dataBatismo: string;
};

/**
 * Lê o trio de um `FormData` de cadastro (as três actions usam as mesmas
 * chaves) e devolve o mesmo `{ dados, campos }` do restante da validação.
 *
 * Fica aqui, e não em cada route, porque `FormData` é um objeto simples: dá
 * para exercitar a extração das chaves em teste, o que antes só se provava
 * lendo o código da rota.
 */
export function lerDocumentoForm(
  formData: FormData,
  hoje: Date
): { dados: DadosDocumento; campos: Record<string, string> } {
  return dadosDocumento(
    {
      rg: String(formData.get("rg") ?? ""),
      cpf: String(formData.get("cpf") ?? ""),
      dataBatismo: String(formData.get("data_batismo") ?? ""),
    },
    hoje
  );
}

export type DadosDocumento = {
  rg: string | null;
  cpf: string | null;
  data_batismo: string | null;
};

/** Mesma forma, aceitando ausência (`undefined`) — como os payloads do form. */
export type DadosDocumentoParcial = {
  rg?: string | null;
  cpf?: string | null;
  data_batismo?: string | null;
};

/**
 * Colunas de documento para insert/update. Recebe o payload já validado e
 * devolve **apenas** as três colunas, convertendo ausente para `NULL`.
 *
 * Existe como função exportada (e não como helper privado duplicado em cada
 * service) porque a whitelist é a barreira de segurança da feature:
 * `members_update_own` restringe a linha, não as colunas, então é a montagem
 * daqui que impede um membro de escrever `status`, `matricula` ou `criado_em`.
 * Testar o contrato desta função prova a barreira; ler o `update` só prova que
 * alguém leu.
 */
export function colunasDocumento(dados: DadosDocumentoParcial): DadosDocumento {
  // `||` e não `??`: `""` também é ausência de dado. Com `??` uma string vazia
  // escaparia para a coluna, e `''` e `NULL` são estados distintos lá — é o
  // que CART-04 exige não acontecer.
  return {
    rg: dados.rg || null,
    cpf: dados.cpf || null,
    data_batismo: dados.data_batismo || null,
  };
}

/** Campos que o autoedição de perfil aceita, mais os de documento. */
export type DadosPerfil = DadosDocumentoParcial & {
  nome: string;
  nascimento: string;
  whatsapp: string;
};

/**
 * Objeto exato entregue ao `.update()` do autoedição de perfil.
 *
 * Existe para que a composição seja *executável* pelo probe, não apenas
 * legível. A versão anterior escrevia o objeto literal dentro do service, e um
 * guard estático que procurasse `colunasDocumento` continuaria verde se alguém
 * apagasse o spread — o token ficaria no arquivo, o dado deixaria de chegar ao
 * banco. Testando esta função, remover o spread falha.
 *
 * `atualizadoEm` é injetado pelo mesmo motivo de `hoje` nos módulos puros: o
 * valor é observável e o teste não pode depender do relógio.
 */
export function colunasPerfil(
  dados: DadosPerfil,
  atualizadoEm: string
): DadosPerfil & { atualizado_em: string } {
  return {
    nome: dados.nome,
    nascimento: dados.nascimento,
    whatsapp: dados.whatsapp,
    ...colunasDocumento(dados),
    atualizado_em: atualizadoEm,
  };
}

/** Campos que o cadastro admin aceita, mais endereço e documento. */
export type DadosMembro = DadosDocumentoParcial & {
  nome: string;
  nascimento: string;
  whatsapp: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
};

/** Colunas textuais de endereço, compartilhadas por create e edit. */
function colunasEndereco(dados: DadosMembro) {
  return {
    logradouro: dados.logradouro ?? null,
    numero: dados.numero ?? null,
    bairro: dados.bairro ?? null,
    cidade: dados.cidade ?? null,
    uf: dados.uf ?? null,
    cep: dados.cep ?? null,
  };
}

/**
 * Objeto exato entregue ao `.insert()` do cadastro admin (CART-01). `authUserId`
 * e `matricula` são injetados porque são gerados fora do payload do formulário.
 */
export function colunasCriarMembro(
  dados: DadosMembro,
  authUserId: string,
  matricula: string
): Record<string, unknown> {
  return {
    auth_user_id: authUserId,
    nome: dados.nome,
    nascimento: dados.nascimento,
    whatsapp: dados.whatsapp,
    matricula,
    ...colunasEndereco(dados),
    ...colunasDocumento(dados),
  };
}

/** Objeto exato entregue ao `.update()` da edição admin (CART-02). */
export function colunasEditarMembro(
  dados: DadosMembro,
  atualizadoEm: string
): Record<string, unknown> {
  return {
    nome: dados.nome,
    nascimento: dados.nascimento,
    whatsapp: dados.whatsapp,
    ...colunasEndereco(dados),
    ...colunasDocumento(dados),
    atualizado_em: atualizadoEm,
  };
}

/**
 * Junta o documento ao payload e ao mapa de erros que a rota já montou.
 *
 * É a etapa que uma rota faz a cada `POST`: `lerDocumentoForm`, mesclar os
 * erros por campo e mesclar os dados normalizados. Deixando a mesclaragem
 * escrita dentro do handler, um guard que procurasse `lerDocumentoForm` no
 * arquivo continuaria verde se alguém apagasse o spread dos dados ou o
 * `Object.assign` dos erros — o token ficaria, o efeito sumiria, e o gate não
 * distinguiria. Aqui a composição é executada pelo probe, então as duas
 * remoções falham.
 *
 * Não muta os argumentos: devolve os dois maps mesclados.
 */
export function comporDadosDocumento<T extends object>(
  dadosBase: T,
  camposBase: Record<string, string>,
  formData: FormData,
  hoje: Date
): { dados: T & DadosDocumento; campos: Record<string, string> } {
  const documento = lerDocumentoForm(formData, hoje);

  return {
    dados: { ...dadosBase, ...documento.dados },
    campos: { ...camposBase, ...documento.campos },
  };
}

/**
 * Agrega os três campos e monta a mensagem de erro por campo, no mesmo
 * formato `{ dados, campos }` usado por `validarFormulario`. Campo vazio
 * resolve para `null` (CART-04).
 */
export function dadosDocumento(
  entrada: DadosDocumentoEntrada,
  hoje: Date
): { dados: DadosDocumento; campos: Record<string, string> } {
  const rg = normalizarRg(entrada.rg);
  const cpf = normalizarCpf(entrada.cpf);
  const batismo = normalizarDataBatismo(entrada.dataBatismo, hoje);

  const campos: Record<string, string> = {};
  if (rg.ok === false) campos.rg = rg.erro;
  if (cpf.ok === false) campos.cpf = cpf.erro;
  if (batismo.ok === false) campos.data_batismo = batismo.erro;

  const paraColuna = (r: Resultado<string>): string | null =>
    r.ok === true && r.valor !== "" ? r.valor : null;

  return {
    dados: {
      rg: paraColuna(rg),
      cpf: paraColuna(cpf),
      data_batismo: paraColuna(batismo),
    },
    campos,
  };
}
