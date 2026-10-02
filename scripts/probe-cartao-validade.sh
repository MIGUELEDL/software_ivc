#!/usr/bin/env bash
#
# Probes por AC da feature cartao-valididade-anual (CART-01..CART-16).
# Uso: bash scripts/probe-cartao-validade.sh   (node + npx via nvm — PATH ativado)
#
# Runtime (node): executa os módulos puros compilados — normalização/rejeição de
# RG, CPF e data de batismo (CART-04..07), o cálculo de validade com clamp
# 29/02, limite inclusivo e criado_em futuro (CART-09..12), o mapper do cartão
# (CART-08) e os payloads gravados em insert/update (CART-01..03).
# Estático: só o wiring que o runtime não alcança — os formulários têm os inputs,
# o MemberCard liga o retorno do mapper ao JSX, e a rota compõe via o helper.
#
# Banco: a migration NÃO é verificada aqui. Ela roda de verdade, num Postgres
# efêmero, em `scripts/probe-cartao-db.sh` (CART-13, CART-14, CART-16) — guard
# textual sobre `.sql` aceitava `+ 0` anos, `at time zone 'UTC'` e backfill com
# data arbitrária. Rode com `--com-db` para incluir.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC="$ROOT/src/lib/painel/documento.ts"
VAL="$ROOT/src/lib/painel/validade.ts"
CART="$ROOT/src/lib/painel/cartao.ts"
UI_CARD="$ROOT/src/components/MemberCard.tsx"
PERFIL="$ROOT/src/app/api/painel/perfil/route.ts"
ADMIN_LIB="$ROOT/src/lib/admin/membros.ts"
ADMIN_CREATE="$ROOT/src/app/api/admin/membros/route.ts"
ADMIN_EDIT="$ROOT/src/app/api/admin/membros/[id]/dados/route.ts"
PERFIL_FORM="$ROOT/src/app/painel/perfil/perfil-form.tsx"
ADMIN_NOVO="$ROOT/src/app/admin/membros/novo/membro-novo-form.tsx"
ADMIN_EDICAO="$ROOT/src/app/admin/membros/[id]/page.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

# `--domain` roda somente as asserções de domínio puro (gate quick da fase 1,
# tasks T1-T3). Sem o flag, roda o probe completo — o gate full/build das fases
# 2 e 3, que inclui rotas, MemberCard e migration.
SOMENTE_DOMINIO=0
[ "${1:-}" = "--domain" ] && SOMENTE_DOMINIO=1
COM_DB=0
[ "${1:-}" = "--com-db" ] && COM_DB=1

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes cartao-valididade-anual (CART)%s ==\n' "$([ "$SOMENTE_DOMINIO" -eq 1 ] && printf ' [dominio]')"

if [ "$SOMENTE_DOMINIO" -eq 0 ]; then
# Os guards estáticos abaixo operam sobre o ARQUIVO COM COMENTÁRIOS REMOVIDOS.
# Sem isso um grep de token é satisfeito pelo import (`import { civilDe }`) ou
# por uma frase no cabeçalho da migration, e o gate passa enquanto o
# comportamento some — foi exatamente o que o sensor de mutação pegou.
#
# A primeira versão só removia `--` (comentário de SQL) e deixava `//` e
# `/* */` passarem intactos nos arquivos TS/TSX: um `/* camposCartao(...) */`
# satisfazia o guard. Aqui removemos os três dialects. O `(?<!:)` antes do `//`
# preserva `http://` dentro de string, senão o stripper comeria URLs.
sem_comentarios() {
  perl -0777 -pe 's{/\*.*?\*/}{}gs; s{^[ \t]*//[^\n]*}{}gm; s{[ \t]+//[^\n]*}{}g; s{--[^\n]*}{}g' "$1" \
    | sed -e '/^[[:space:]]*$/d'
}

# `chama` exige o símbolo em posição de uso, não em import — e exige que o
# RESULTADO seja usado. Uma chamada solta (`camposCartao(m, new Date());`) ou
# código morto (`if (false) camposCartao(...)`) deixa o gate verde sem nenhum
# comportamento: o token existe, o efeito não. Por isso o padrão só aceita
# atribuição, retorno, encadeamento de propriedade ou spread — as quatro formas
# em que o valor calculado realmente chega a algum lugar.
#
# Captura a saída antes de filtrar em vez de encadear `grep -q`: com `pipefail`,
# o `grep -q` fecha o pipe cedo, o `sed` upstream morre por SIGPIPE e o guard
# fica flaky (passava num arquivo e falhava no outro sem mudança no código).
chama() {
  local codigo
  codigo="$(sem_comentarios "$1" | grep -Ev '^[[:space:]]*import([\\{[:space:]]|.* from )')" || true
  printf '%s' "$codigo" | grep -cE \
    '(=|return|=>|:|\.\.\.)[[:space:]]*(const[[:space:]]+)?(\?)?\(?[A-Za-z0-9_]*\b'"$2"'[[:space:]]*\(' >/dev/null
}

# Mesmo cuidado de `chama` para busca literal: captura antes de casar.
contem() {
  local codigo
  codigo="$(sem_comentarios "$1")" || true
  printf '%s' "$codigo" | grep -qF "$2"
}

# `ligada` é o guard mais forte do arquivo: exige que o resultado do símbolo seja
# atribuído a uma variável E que essa mesma variável seja a interpolada no JSX.
# Sem a segunda metade, `const _descartado = camposCartao(...)` satisfazia o
# guard `chama` (tem `=` antes da chamada) enquanto o cartão renderizava um
# objeto fixo — o token existia, o efeito não.
ligada() {
  local codigo
  local var
  codigo="$(sem_comentarios "$1" | grep -Ev '^[[:space:]]*import([\\{[:space:]]|.* from )')" || true

  # Extrai o nome da variável que recebe o símbolo: `const campos = f(...)`,
  # `campos = f(...)` ou encadeado `a = b = f(...)`.
  for var in $(printf '%s' "$codigo" | perl -ne '
    while (/(?:const\s+)?([A-Za-z0-9_]+)\s*=\s*'"$2"'\s*\(/g) { print "$1\n" }
  ' | sort -u); do
    if printf '%s' "$codigo" | grep -qE '\{[[:space:]]*'"$var"'\.'; then
      return 0
    fi
  done
  return 1
}

# `persistido` amarra a composição ao que é realmente gravado. Três fatos, e
# cada um mata um mutante que o Verifier mediu passando com typecheck, lint,
# build e todas as probes verdes:
#
#   (a) o `FormData` da request é o 3º argumento — passar `new FormData()`
#       fazia rg/cpf/batismo chegarem sempre `null` e sem erro;
#   (b) TODO serviço de gravação da rota recebe `<pronto>.dados` como último
#       argumento, o identificador cru. Nem `{ ...pronto.dados, rg: null }`,
#       nem `base.dados` com `createMember` ainda correto;
#   (c) o `if (!<pronto>.ok)` aparece antes deles.
#
# O `return` desse `if` NÃO é verificado aqui, e não precisa: `pronto.dados`
# só existe no ramo `ok: true`, então trocar o `return` por um `console.error`
# deixa de compilar. É a diferença entre um guard e uma barreira de tipo —
# guardUid é o que o Verifier reprovou quatro vezes seguidas.
#
# Trade-off aceito: um alias semanticamente correto (`const alias =
# pronto.dados`) é reprovado. O preço é uma refatoração de uma linha virar
# alteração de gate; a alternativa custou quatro rodadas.
persistido() {
  local simbolo="$2" servicos="$3"
  local codigo
  codigo="$(sem_comentarios "$1" | grep -Ev '^[[:space:]]*import([\\{[:space:]]|.* from )')" || true

  # Um nome por chamada: `const X = simbolo(...)`.
  local var fd varDe fdDe contagem linhaOk linhaServico
  varDe="$(printf '%s' "$codigo" | perl -0777 -ne '
    while (/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:await\s+)?'"$simbolo"'\s*[(]/g) { print "$1\n" }' | sort -u)"
  [ -n "$varDe" ] || return 1

  # (a) o `FormData` da request é o 3º argumento da composição
  fdDe="$(printf '%s' "$codigo" | perl -0777 -ne '
    while (/([A-Za-z0-9_]+)\s*=\s*await\s+request\.formData\s*[(]/g) { print "$1\n" }' | sort -u)"
  [ -n "$fdDe" ] || return 1

  for var in $varDe; do
    if ! printf '%s' "$codigo" | perl -0777 -ne '
      # 3º argumento de topo da chamada. A quebra de vírgula tem de contar
      # profundidade de ()[]{}: um `split /,/` simples parte o objeto literal
      # `{ nome, nascimento, ... }` em pedaços e a comparação nunca casa.
      sub topo {
        my ($s) = @_;
        my (@p, $cur, $d);
        $d = 0; $cur = "";
        for my $ch (split //, $s) {
          $d++ if $ch =~ /[(\[{]/;
          $d-- if $ch =~ /[)\]}]/;
          if ($ch eq "," && $d == 0) { push @p, $cur; $cur = ""; next }
          $cur .= $ch;
        }
        push @p, $cur;
        return map { my $x = $_; $x =~ s/\A\s+|\s+\z//g; $x } @p;
      }
      my $alvo = "'"$var"'";
      while (/\b'"$simbolo"'\s*[(]((?:[^()]++|\((?:[^()]++|\([^()]*\))*\))*)\s*\)/gs) {
        my @partes = topo($1);
        next unless @partes >= 3;
        # O 2º argumento é o mapa de erros que a rota montou. Passar `{}`
        # descartaria as mensagens de nome/nascimento/whatsapp e ainda assim
        # gravaria a row: o mesmo bug de "chamei certo e ignorei o efeito", só
        # com um parâetro a menos. Aceita `campos` ou `algo.campos`.
        exit(2) unless $partes[1] =~ /\A[A-Za-z0-9_]*\.?campos\z/;
        exit(0) if $partes[2] eq "'"$fdDe"'";
      }
      exit(1);
    '; then
      # saida 1: FormData da request nao e o 3º argumento
      # saida 2: o mapa de erros da rota nao e o 2º argumento
      continue
    fi

    # (b) o ÚLTIMO argumento de cada serviço é o payload PRONTO, literal.
    #
    # A versão anterior aceitava `service(f(pronto.dados))`: o `[^)]*?` parava
    # no primeiro `)`, que era o do wrapper, então o mutante que embrulha o
    # payload numa função que zera o documento passava com typecheck, lint,
    # build e todas as probes verdes — gravando `rg = null`. Medido na R5
    # (A1b/A1c/A1d sobreviveram). Agora os argumentos da chamada são quebrados
    # contando profundidade de ()[]{} e o último tem de ser EXATAMENTE
    # `pronto.dados`: nada de wrapper, nada de spread, nada de sufixo.
    contagem="$(printf '%s' "$codigo" | perl -0777 -ne '
      sub topo {
        my ($s) = @_;
        my (@p, $cur, $d);
        $d = 0; $cur = "";
        for my $ch (split //, $s) {
          $d++ if $ch =~ /[(\[{]/;
          $d-- if $ch =~ /[)\]}]/;
          if ($ch eq "," && $d == 0) { push @p, $cur; $cur = ""; next }
          $cur .= $ch;
        }
        push @p, $cur;
        return map { my $x = $_; $x =~ s/\A\s+|\s+\z//g; $x } @p;
      }
      my ($c, $l) = (0, 0);
      while (/\b(?:'"$servicos"')\s*[(]((?:[^()]++|\((?:[^()]++|\([^()]*\))*\))*)\s*\)/gs) {
        $c++;
        my @a = topo($1);
        next unless @a >= 1;
        $l++ if $a[-1] eq "'"$var"'.dados";
      }
      print "$c $l";
    ')"
    [ "${contagem%% *}" -ge 1 ] 2>/dev/null || continue
    [ "${contagem%% *}" = "${contagem##* }" ] || continue

    # (c) o 400 devolvido tem que carregar o mapa de erros da composição.
    #
    # A R4 mediu A2/A2b sobrevivendo com `erroCampos({})` e `campos: {}`: o guard
    # via que a rota montava um 400, não que o corpo do 400 era o erro. Um 400
    # vazio é o pior dos dois mundos — não grava a row E não diz por quê.
    resposta400="$(printf '%s' "$codigo" | grep -nE "$var"'\.campos' | head -1 | cut -d: -f1)"
    if [ -z "$resposta400" ]; then
      continue
    fi

    # (d) o estreitamento do `ok` vem antes da gravação
    linhaOk="$(printf '%s' "$codigo" | grep -nE '!\s*'"$var"'\.ok' | head -1 | cut -d: -f1)"
    linhaServico="$(printf '%s' "$codigo" | grep -nE '\b('"$servicos"')[(]' | head -1 | cut -d: -f1)"
    if [ -n "$linhaOk" ] && [ -n "$linhaServico" ] && [ "$linhaOk" -lt "$linhaServico" ]; then
      return 0
    fi
  done
  return 1
}

# --- CART-04: rota e services produzem as colunas de documento
for rota in "$PERFIL" "$ADMIN_CREATE" "$ADMIN_EDIT"; do
  case "$rota" in
    *painel/perfil*) nome="painel/perfil/route.ts" ;;
    *membros/\[id\]*) nome="admin/membros/[id]/dados/route.ts" ;;
    *) nome="admin/membros/route.ts" ;;
  esac
  if chama "$rota" 'comporDadosDocumento'; then
    ok "CART-04 $nome compoe o documento no payload via helper puro"
  else
    ko "CART-04 $nome sem chamada a comporDadosDocumento"
  fi

  case "$rota" in
    *painel/perfil*) svc="updateMember|createMember" ;;
    *membros/\[id\]*) svc="atualizarDadosMembro" ;;
    *) svc="criarMembro" ;;
  esac
  if persistido "$rota" 'comporDadosDocumento' "$svc"; then
    ok "CART-01/02/03 $nome persiste o retorno da composicao e barra o 400 antes"
  else
    ko "CART-01/02/03 $nome nao persiste o retorno de comporDadosDocumento (ou barra o 400 depois de gravar)"
  fi
done

# --- CART-01/02/03: o payload gravado é o objeto devolvido pela função pura
# O guard exige o símbolo como ARGUMENTO de `.insert(`/`.update(`: basta estar
# no arquivo não prova que é o objeto enviado ao banco. A semântica da
# composição (quais colunas, e que status/matricula/criado_em ficam de fora) é
# verificada por execução no bloco node; aqui prova-se só o caminho.
gravando() {
  local codigo
  codigo="$(sem_comentarios "$1" | grep -Ev '^[[:space:]]*import([\{[:space:]]|.* from )')" || true
  # Primeiro argumento de `colunas*` tem de ser EXATAMENTE o `dados` ja tipado.
  #
  # A versao anterior so exigia o token `colunas*(` na frente de `.insert(`/`.update(`.
  # Isso provava que a funcao de payload era chamada, nao que o payload que
  # chegava ao banco era o `dados` composto: `colunasCriarMembro({ ...dados, rg: null })`
  # type-checava (o spread preserva os tipos) e passava. Medido na R6 — 6
  # mutantes sobreviveram assim, gravando `rg = cpf = data_batismo = NULL`.
  # Mesma amarra de valor que o `persistido` recebeu: argumentos quebrados por
  # profundidade de ()[]{} e comparados com igualdade exata.
  printf '%s' "$codigo" | perl -0777 -ne '
    sub topo {
      my ($s) = @_;
      my (@p, $cur, $d);
      $d = 0; $cur = "";
      for my $ch (split //, $s) {
        $d++ if $ch =~ /[(\[{]/;
        $d-- if $ch =~ /[)\]}]/;
        if ($ch eq "," && $d == 0) { push @p, $cur; $cur = ""; next }
        $cur .= $ch;
      }
      push @p, $cur;
      return map { my $x = $_; $x =~ s/\A\s+|\s+\z//g; $x } @p;
    }
    while (/\b'"$2"'\s*\(((?:[^()]++|\((?:[^()]++|\([^()]*\))*\))*)\s*\)/gs) {
      my @a = topo($1);
      next unless @a >= 1;
      exit 0 if $a[0] eq "dados";
    }
    exit 1;
  '
}

for svc in "$ROOT/src/lib/painel/members.ts" "$ADMIN_LIB"; do
  for fn in colunasCriarMembro colunasPerfil colunasEditarMembro; do
    if gravando "$svc" "$fn"; then
      ok "CART-04 $(basename "$svc") grava via $fn"
    fi
  done
done

if gravando "$ROOT/src/lib/painel/members.ts" 'colunasPerfil' \
  && gravando "$ROOT/src/lib/painel/members.ts" 'colunasCriarMembro'; then
  ok "CART-03 autoedicao de perfil grava via colunasPerfil"
else
  ko "CART-03 autoedicao de perfil nao grava via colunasPerfil"
fi
if gravando "$ADMIN_LIB" 'colunasCriarMembro' && gravando "$ADMIN_LIB" 'colunasEditarMembro'; then
  ok "CART-01/02 admin grava create e edit via as funcoes de payload"
else
  ko "CART-01/02 admin nao grava create/edit via as funcoes de payload"
fi

# --- CART-01/02/03: cada formulario aceita os tres campos e envia o trio
# Rótulo do AC conforme o formulário: criação/edição no admin (CART-01/02) e
# autoedição do membro no painel (CART-03).
rotular() {
  case "$1" in
    *perfil-form*) printf 'CART-03' ;;
    *membro-novo-form*) printf 'CART-01' ;;
    *) printf 'CART-02' ;;
  esac
}
for alvo in "$PERFIL_FORM" "$ADMIN_NOVO" "$ADMIN_EDICAO"; do
  nome="$(basename "$alvo")"
  ac="$(rotular "$alvo")"
  for campo in rg cpf data_batismo; do
    if contem "$alvo" "name=\"$campo\""; then
      ok "$ac $nome tem input $campo"
    else
      ko "$ac $nome sem input $campo"
    fi
  done
  # O limite do input é `max={civilDe(new Date())}`; exigir a chamada evita que
  # o simples import satisfaça o gate.
  if contem "$alvo" 'civilDe(new Date())'; then
    ok "CART-06 $nome limita a data de batismo no calendario civil"
  else
    ko "CART-06 $nome sem limite de data de batismo"
  fi
done

# --- CART-09/11: MemberCard consome o mapa testavel, não a coluna crua
if ligada "$UI_CARD" 'camposCartao'; then
  ok "CART-09 MemberCard renderiza a variavel devolvida por camposCartao"
else
  ko "CART-09 MemberCard nao liga o retorno de camposCartao ao JSX"
fi
if contem "$UI_CARD" 'validade_cartao'; then
  ko "CART-09 MemberCard ainda le a coluna bruta validade_cartao"
else
  ok "CART-09 MemberCard nao le mais a coluna bruta"
fi

# --- CART-13/14: migration com trigger e backfill idempotente
# Exige a ATRIBUIÇÃO dentro do corpo do trigger (não a palavra "trigger" num
# comentário) e a cláusula `is null` no WHERE do backfill.
MIG="$ROOT/supabase/migrations/0024_validade_cartao.sql"
if [ ! -f "$MIG" ]; then
  ko "CART-13/14 migration 0024 ausente"
else
  sql="$(sem_comentarios "$MIG" | tr 'A-Z' 'a-z' | tr -s '[:space:]' ' ')"
  if printf '%s' "$sql" | grep -q 'create or replace function public.members_ciclo_base' \
    && printf '%s' "$sql" | grep -q 'create or replace function public.members_set_validade_cartao'; then
    ok "CART-13/14 0024 declara as duas funcoes"
  else
    ko "CART-13/14 0024 sem as funcoes de ciclo-base e trigger"
  fi
  if printf '%s' "$sql" | grep -q 'new.validade_cartao := public.members_ciclo_base(new.criado_em)'; then
    ok "CART-13 trigger atribui ciclo-base derivado de criado_em"
  else
    ko "CART-13 trigger nao atribui members_ciclo_base(new.criado_em)"
  fi
  if printf '%s' "$sql" | grep -q 'before insert or update on public.members'; then
    ok "CART-13 trigger e BEFORE INSERT OR UPDATE"
  else
    ko "CART-13 trigger nao cobre insert e update"
  fi
  if printf '%s' "$sql" | grep -q 'drop trigger if exists members_validade_cartao'; then
    ok "CART-13 trigger recreation idempotente"
  else
    ko "CART-13 trigger sem drop if exists"
  fi
  if printf '%s' "$sql" | grep -q 'where validade_cartao is null'; then
    ok "CART-14 backfill restrito a validade_cartao IS NULL"
  else
    ko "CART-14 backfill nao restrito a IS NULL (sobrescreveria valores)"
  fi
  if printf '%s' "$sql" | grep -q 'at time zone' ; then
    ok "CART-11 ciclo-base fixado no fuso civil, nao no da sessao"
  else
    ko "CART-11 ciclo-base depende do TimeZone da sessao"
  fi
fi

fi # fim do bloco de integração (--domain pula)

# --- CART-04..07 + CART-09..12: runtime node sobre os módulos puros ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Assercao de TEMPO DE COMPILACAO do `Readonly` do payload pronto. O probe roda
# o `tsc` de qualquer jeito; o que ele acrescenta e o arquivo `readonly.ts`, que
# tenta escrever no payload. Com o tipo correto, a escrita e erro e o
# `@ts-expect-error` e satisfeito; sem ele (Readonly removido), o compilador
# reclama do `@ts-expect-error` nao usado. Nos dois casos o resultado e o mesmo
# — verde quando o congelamento existe, vermelho quando sumiu.
DOC_REL="$(realpath --relative-to="$TMP" "$DOC")"
DOC_REL="${DOC_REL%.ts}"
cat >"$TMP/readonly.ts" <<TS
import { comporDadosDocumento } from "$DOC_REL";

const pronto = comporDadosDocumento({}, {}, new FormData(), new Date());

if (pronto.ok) {
  // @ts-expect-error o payload pronto e Readonly (AD-021)
  pronto.dados.rg = "12.345.678-9";
  const semFreeze: { rg: string | null } = pronto.dados;
  void semFreeze;
}
TS

npx tsc "$DOC" "$VAL" "$CART" "$TMP/readonly.ts" --outDir "$TMP/out" \
  --module commonjs --target es2020 \
  --moduleResolution node --esModuleInterop --skipLibCheck >"$TMP/tsc.log" 2>&1 \
  || ko "compilacao dos modulos p/ teste falhou (ver $TMP/tsc.log)"

# `tsc` calcula a raiz comum entre o repo e o $TMP, então o emitido pode cair
# em `$TMP/out/<caminho-absoluto-da-arvore>/readonly.js`.
if [ -n "$(find "$TMP/out" -name 'readonly.js' -print -quit)" ]; then
  ok "CART-01/02/03 payload pronto e Readonly no tipo (escrita nao compila)"
else
  ko "CART-01/02/03 o payload pronto deixou de ser Readonly"
fi

DOC_JS="$(find "$TMP/out" -name 'documento.js' -print -quit)"
VAL_JS="$(find "$TMP/out" -name 'validade.js' -print -quit)"
CART_JS="$(find "$TMP/out" -name 'cartao.js' -print -quit)"

if [ ! -f "$DOC_JS" ] || [ ! -f "$VAL_JS" ] || [ ! -f "$CART_JS" ]; then
  ko "modulos compilados nao encontrados"
else
  if DOC_J="$DOC_JS" VAL_J="$VAL_JS" CART_J="$CART_JS" node -e '
const assert = require("assert");
const D = require(process.env.DOC_J);
const V = require(process.env.VAL_J);
const C = require(process.env.CART_J);

// Instantes construídos com deslocamento explícito de -03:00 (fuso civil da
// igreja) para que o dia civil esperado não dependa do TZ da máquina de teste.
const d = (y, m, dia) => new Date(`${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`);
const HOJE = d(2026, 10, 1); // 2026-10-01 no calendário civil

// ── CART-05: CPF
assert.strictEqual(D.normalizarCpf("12345678909").valor, "12345678909", "CPF cru");
assert.strictEqual(D.normalizarCpf("  12345678909 ").valor, "12345678909", "CPF com espaço");
assert.strictEqual(D.normalizarCpf("123.456.789-09").valor, "12345678909", "CPF com máscara");
assert.strictEqual(D.normalizarCpf("").ok, true, "CPF vazio é válido");
assert.strictEqual(D.normalizarCpf("   ").valor, "", "CPF só espaços -> vazio");
assert.strictEqual(D.normalizarCpf("1234567890").ok, false, "CPF 10 dígitos rejeitado");
assert.strictEqual(D.normalizarCpf("123456789099").ok, false, "CPF 12 dígitos rejeitado");
assert.strictEqual(D.normalizarCpf("abcdefghijk").ok, false, "CPF só letras rejeitado");
assert.strictEqual(D.normalizarCpf("1234567890a").ok, false, "CPF 11 com letra rejeitado");
assert.strictEqual(D.normalizarCpf("123\n45678909").ok, false, "CPF com newline rejeitado");
// Controle no FIM: LF, CR e TAB sao whitespace, entao um `trim()` antes da
// checagem os apagaria e o CPF entraria limpo. Foi exatamente o que a 3a rodada
// do Verifier mediu: `normalizarCpf("12345678909\\n")` devolvia `{ok:true}`.
assert.strictEqual(D.normalizarCpf("12345678909\n").ok, false, "CPF 11 dígitos + \\n no fim rejeitado");
assert.strictEqual(D.normalizarCpf("12345678909\r").ok, false, "CPF 11 dígitos + \\r no fim rejeitado");
assert.strictEqual(D.normalizarCpf("12345678909\t").ok, false, "CPF 11 dígitos + \\t no fim rejeitado");
assert.strictEqual(D.normalizarCpf("12345678909\u0000").ok, false, "CPF 11 dígitos + NUL rejeitado");

// ── CART-07: RG
assert.strictEqual(D.normalizarRg(" 12.345.678-9 ").valor, "12.345.678-9", "RG com máscara preservada");
assert.strictEqual(D.normalizarRg("").valor, "", "RG vazio");
assert.strictEqual(D.normalizarRg("x".repeat(20)).ok, true, "RG 20 chars aceito");
assert.strictEqual(D.normalizarRg("x".repeat(21)).ok, false, "RG 21 chars rejeitado");
assert.strictEqual(D.normalizarRg("123\n456").ok, false, "RG com newline rejeitado");
assert.strictEqual(D.normalizarRg("123\t456").ok, false, "RG com tab rejeitado");
// LF e TAB no fim somem no `trim()`: o limite de 20 era conferido sobre
// um valor de 20 que o cliente nao enviou.
assert.strictEqual(D.normalizarRg("x".repeat(20) + "\n").ok, false, "RG 20 chars + \\n no fim rejeitado");
assert.strictEqual(D.normalizarRg("x".repeat(20) + "\t").ok, false, "RG 20 chars + \\t no fim rejeitado");

// ── CART-06: data de batismo
assert.strictEqual(D.normalizarDataBatismo("2020-05-10", HOJE).valor, "2020-05-10", "batismo passado");
assert.strictEqual(D.normalizarDataBatismo("", HOJE).valor, "", "batismo vazio");
assert.strictEqual(D.normalizarDataBatismo("2026-10-01", HOJE).ok, true, "batismo hoje aceito");
assert.strictEqual(D.normalizarDataBatismo("2026-10-02", HOJE).ok, false, "batismo futuro rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2026-02-30", HOJE).ok, false, "overflow 02-30 rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2026-13-01", HOJE).ok, false, "mês 13 rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2020-05-10\n", HOJE).ok, false, "batismo + \\n no fim rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2020-05-10\r\n", HOJE).ok, false, "batismo + \\r\\n no fim rejeitado");
assert.strictEqual(D.normalizarDataBatismo("10/05/2020", HOJE).ok, false, "formato DD/MM/YYYY rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2020-5-1", HOJE).ok, false, "sem zero à esquerda rejeitado");

// ── CART-04: agregado converte vazio em NULL, nunca string vazia
const agg = D.dadosDocumento({ rg: "", cpf: "  ", dataBatismo: "" }, HOJE);
assert.deepStrictEqual(agg.campos, {}, "agregado sem erros quando vazio");
assert.strictEqual(agg.dados.rg, null, "rg vazio -> null");
assert.strictEqual(agg.dados.cpf, null, "cpf vazio -> null");
assert.strictEqual(agg.dados.data_batismo, null, "batismo vazio -> null");

const agg2 = D.dadosDocumento({ rg: "12.345.678-9", cpf: "123.456.789-09", dataBatismo: "2020-05-10" }, HOJE);
assert.deepStrictEqual(agg2.campos, {}, "agregado sem erros quando válido");
assert.deepStrictEqual(agg2.dados, { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }, "agregado normalizado");

const agg3 = D.dadosDocumento({ rg: "x".repeat(21), cpf: "123", dataBatismo: "2030-01-01" }, HOJE);
assert.deepStrictEqual(Object.keys(agg3.campos).sort(), ["cpf", "data_batismo", "rg"], "agregado reporta os 3 campos");

// ── CART-10: clamp 29/02 -> 28/02
assert.strictEqual(V.aniversario("2024-02-29", 1), "2025-02-28", "29/02 + 1 ano = 28/02");
assert.strictEqual(V.aniversario("2024-02-29", 4), "2028-02-29", "29/02 + 4 anos = 29/02 bissexto");
assert.strictEqual(V.aniversario("2024-02-29", 2), "2026-02-28", "29/02 + 2 anos = 28/02");
assert.strictEqual(V.aniversario("2023-02-28", 1), "2024-02-28", "28/02 + 1 ano = 28/02");

// ── CART-09/11: rolagem com limite inclusivo
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2026,10,1)), "2027-09-13", "mesmo ano -> +1 ano");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,13)), "2027-09-13", "1 dia antes -> ainda +1");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,14)), "2028-09-13", "1 dia depois -> +2 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,13)), "2027-09-13", "limite inclusivo no próprio dia");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2031,1,1)), "2031-09-13", "ciclo ainda corrente em 2031 -> 2031-09-13");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2031,9,14)), "2032-09-13", "5 anos depois -> +6 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-01-01", d(2026,1,1)), "2027-01-01", "registro hoje -> +1 ano");

// created_at futuro: não é "corrigido" para hoje
assert.strictEqual(V.calcularValidadeCartao("2030-06-15", d(2026,10,1)), "2031-06-15", "criado_em futuro conta a partir dele");

// rollover de ano bissexto em member real
assert.strictEqual(V.calcularValidadeCartao("2024-02-29", d(2025,3,1)), "2026-02-28", "29/02/2024 com hoje 01/03/2025 -> 28/02/2026");

// ── CART-11: criado_em chega como timestamptz ISO, não como data civil
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T14:22:31.123Z", HOJE), "2027-09-13", "ISO com Z aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T00:30:00-03:00", HOJE), "2027-09-13", "ISO com offset aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", HOJE), "2027-09-13", "ISO 23:30 -03:00 aceito");
assert.strictEqual(V.dataCivil("2026-09-13T00:30:00-03:00"), "2026-09-13", "dataCivil com offset -03:00");
assert.strictEqual(V.dataCivil("2026-09-13T23:30:00-03:00"), "2026-09-13", "dataCivil 23:30 -03:00 não vira dia 14");
assert.strictEqual(V.dataCivil("2026-09-14T00:30:00Z"), "2026-09-13", "dataCivil 00:30Z é dia anterior no Brasil");
// O cálculo NÃO pode variar com o TZ do processo (Vercel roda UTC).
// NÃO dá para provar isso mutando `process.env.TZ` aqui: `Intl.DateTimeFormat`
// resolve e memoiza a zona na construção do módulo, e `validade.ts` já foi
// require()ado acima — a mutação não teria efeito e a asserção seria verde por
// acidente. Quem prova é a matriz externa do gate:
//   for tz in UTC Asia/Tokyo Pacific/Kiritimati Europe/Lisbon; do
//     TZ=$tz bash scripts/probe-cartao-validade.sh
// e, do lado do SQL, `probe-cartao-db.sh` roda a mesma função sob `set timezone`
// de UTC e de Asia/Tokyo.
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", new Date("2027-09-14T00:30:00-03:00")), "2028-09-13", "cálculo fixo no calendário civil (TZ矩阵 no gate)");
assert.strictEqual(V.dataCivil("lixo"), null, "dataCivil lixo -> null");
assert.strictEqual(V.dataCivil(null), null, "dataCivil null -> null");

// ── CART-16 / AD-025: ano de 5 dígitos, onde TS e SQL divergiam
//
// O trigger grava `make_date(ano + 1, ...)`; um `criado_em` de 9999-12-31 vira
// `10000-12-31` na coluna. Duas peças independentes caem aqui:
//
//   1. o formato aceitou só 4 dígitos, então `10000-12-31` não casava;
//   2. a comparação era lexical, e `"10000-12-31" >= "2026-01-01"` é FALSO
//      porque "1" ordena antes de "2" — o cartão mostrava `—` para um registro
//      cujo ciclo-base o banco já tinha gravado.
//
// Medido no Postgres efêmero: SQL devolvia `10000-12-31`, o TS devolvia `—`.
assert.strictEqual(
  V.aniversario("9999-12-31", 1), "10000-12-31",
  "aniversario produz ano de 5 dígitos"
);
assert.strictEqual(
  V.calcularValidadeCartao("9999-12-31T23:59:59+00:00", HOJE), "10000-12-31",
  "calcularValidadeCartao concorda com o ciclo-base que o trigger gravou"
);
// `hoje` tem que ser um ano que o `Date` do JS representa. O teto medido e
// `+275760-09-13T00:00:00.000Z`, ou seja, o ano 275760 so vale ate 13 de
// setembro — a janela residual comeca DENTRO dele, nao em 275761. Do lado do
// Postgres, `criado_em` e `timestamptz` e estoura em 294276.
assert.strictEqual(
  V.calcularValidadeCartao("10000-12-31", HOJE), "10001-12-31",
  "ano de 5 dígitos também como entrada já civil, e a saída segue de 5 dígitos"
);
// O caso de 4 dígitos que a comparação lexical resolvia: se `compararDatas`
// voltasse a ser string, este ainda passaria — por isso o par de asserções
// acima é que trava a regressão, e não este.
assert.strictEqual(
  V.calcularValidadeCartao("9999-01-01T00:00:00+00:00", HOJE), "9999-12-31",
  "ano de 4 dígitos segue igual (controle de não-regressão)"
);

// A janela BAIXA é fechável e foi fechada: o número de candidatos vem da
// distância entre os anos, não de um teto arbitrário. Medido: `1800-06-01` dava
// `null` aqui enquanto o trigger tinha gravado `1801-06-01` na coluna.
assert.strictEqual(
  V.calcularValidadeCartao("1800-06-01", HOJE), "2027-06-01",
  "criado_em de 226 anos atrás ainda acha o aniversário corrente"
);
// Contrato `YYYY-MM-DD | null`: nada de `NaN` dentro de uma data. Medido na
// R6 — `diasNoMes` devolvia `NaN` acima do teto do `Date`, `dia > NaN` era
// `false` (a validação de calendário passava em silêncio) e `formatar`
// despejava `"275761-09-NaN"`. `Number.isNaN` tem de morrer na tier TS.
assert.strictEqual(
  V.calcularValidadeCartao("275760-09-12", HOJE), null,
  "ano no teto do Date devolve null, nunca uma data com NaN"
);
assert.strictEqual(
  V.aniversario("275760-09-12", 1), null,
  "aniversario no teto do Date devolve null"
);
assert.strictEqual(
  V.aniversario("275760-01-01", 1), null,
  "mes representavel, ano-alvo nao: null em vez de dado invalido"
);
assert.strictEqual(
  V.aniversario("9999-12-31", 1), "10000-12-31",
  "ano de 5 digitos continua sendo derivado, nao cortado"
);
assert.strictEqual(
  V.calcularValidadeCartao("1700-01-01", HOJE), "2027-01-01",
  "criado_em de 326 anos atrás também"
);
// O teto fixo de 200 mataria estes dois; um `+ 2` insuficiente também.
assert.strictEqual(
  V.calcularValidadeCartao("2020-12-31", HOJE), "2026-12-31",
  "criado_em no mesmo ano, aniversario ainda depois de hoje"
);

// ── CART-12: entrada inválida -> null
assert.strictEqual(V.calcularValidadeCartao(null, HOJE), null, "null -> null");
assert.strictEqual(V.calcularValidadeCartao(undefined, HOJE), null, "undefined -> null");
assert.strictEqual(V.calcularValidadeCartao("", HOJE), null, "vazio -> null");
assert.strictEqual(V.calcularValidadeCartao("13/09/2026", HOJE), null, "formato inválido -> null");
assert.strictEqual(V.calcularValidadeCartao("2026-13-01", HOJE), null, "mês inválido -> null");
assert.strictEqual(V.aniversario("nao-data", 1), null, "aniversario inválido -> null");

// ── CART-01/02/03: o que a rota extrai do FormData chega normalizado aos services
const fd = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

const viaForm = D.lerDocumentoForm(fd({ rg: " 12.345.678-9 ", cpf: "123.456.789-09", data_batismo: "2020-05-10" }), HOJE);
assert.deepStrictEqual(viaForm.dados, { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }, "lerDocumentoForm normaliza");
assert.deepStrictEqual(viaForm.campos, {}, "lerDocumentoForm sem erro");

const viaFormVazio = D.lerDocumentoForm(fd({}), HOJE);
assert.deepStrictEqual(viaFormVazio.dados, { rg: null, cpf: null, data_batismo: null }, "FormData vazio -> 3 NULLs");
assert.deepStrictEqual(Object.keys(viaFormVazio.dados).sort(), ["cpf","data_batismo","rg"], "as 3 chaves presentes");

const viaFormErro = D.lerDocumentoForm(fd({ rg: "x".repeat(21), cpf: "1", data_batismo: "2030-01-01" }), HOJE);
assert.deepStrictEqual(Object.keys(viaFormErro.campos).sort(), ["cpf","data_batismo","rg"], "erros por campo no FormData");

// ── CART-04: a whitelist de colunas e o contrato dos services
// Bug real que a assinatura permite: aceitar `""` como se fosse valor gravaria
// string vazia na coluna, que e estado distinto de NULL.
assert.deepStrictEqual(D.colunasDocumento({}), { rg: null, cpf: null, data_batismo: null }, "payload vazio -> 3 NULLs");
assert.deepStrictEqual(
  D.colunasDocumento({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }),
  { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" },
  "payload completo preservado"
);
assert.deepStrictEqual(D.colunasDocumento({ rg: "", cpf: "" }), { rg: null, cpf: null, data_batismo: null }, "string vazia -> NULL");
// a funcao nao aceita nem propaga colunas sensiveis: nem status, nem matricula
assert.deepStrictEqual(
  Object.keys(D.colunasDocumento({ rg: "x", cpf: "y", data_batismo: "z", status: "ATIVO", matricula: "IVC-1", criado_em: "2020-01-01" })).sort(),
  ["cpf", "data_batismo", "rg"],
  "whitelist barra colunas sensiveis (status/matricula/criado_em)"
);

// ── CART-01/02/03: o objeto EXATO entregue ao .insert()/.update()
const completo = {
  nome: "Miguel Ernandes", nascimento: "2004-12-28", whatsapp: "84999766852",
  logradouro: "Rua A", numero: "12", bairro: "Centro", cidade: "Santa Luzia",
  uf: "PB", cep: "58900000",
  rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10",
};
const ATUALIZADO = "2026-10-01T12:00:00.000Z";

// CART-01: cadastro admin. As três colunas de documento têm de estar no objeto.
const pCreate = D.colunasCriarMembro(completo, "uuid-1", "IVC-0001");
assert.deepStrictEqual(
  [pCreate.rg, pCreate.cpf, pCreate.data_batismo],
  ["12.345.678-9", "12345678909", "2020-05-10"],
  "CART-01 create admin leva rg/cpf/batismo ao insert"
);
assert.strictEqual(pCreate.auth_user_id, "uuid-1", "CART-01 create leva o auth_user_id");
assert.strictEqual(pCreate.matricula, "IVC-0001", "CART-01 create leva a matricula gerada");
assert.strictEqual(pCreate.logradouro, "Rua A", "CART-01 create preserva o endereco");
assert.strictEqual(pCreate.cep, "58900000", "CART-01 create preserva o cep");

// CART-02: edicao admin.
const pEdit = D.colunasEditarMembro(completo, ATUALIZADO);
assert.deepStrictEqual(
  [pEdit.rg, pEdit.cpf, pEdit.data_batismo],
  ["12.345.678-9", "12345678909", "2020-05-10"],
  "CART-02 edit admin leva rg/cpf/batismo ao update"
);
assert.strictEqual(pEdit.atualizado_em, ATUALIZADO, "CART-02 edit reanota atualizado_em");

// CART-03: autoedicao. `status`, `matricula` e `criado_em`Jamais entram — e o
// teste passa `dados` com essas chaves, então um `...dados` no service seria
// pego aqui, não por um guard que só lê o texto.
const pPerfil = D.colunasPerfil({ ...completo, status: "ATIVO", matricula: "IVC-0001", criado_em: "2020-01-01" }, ATUALIZADO);
assert.deepStrictEqual(
  Object.keys(pPerfil).sort(),
  ["atualizado_em", "cpf", "data_batismo", "nascimento", "nome", "rg", "whatsapp"],
  "CART-03 autoedicao grava exatamente 7 colunas, sem status/matricula/criado_em"
);
assert.deepStrictEqual(
  [pPerfil.rg, pPerfil.cpf, pPerfil.data_batismo],
  ["12.345.678-9", "12345678909", "2020-05-10"],
  "CART-03 autoedicao leva rg/cpf/batismo ao update"
);
for (const proibida of ["status", "matricula", "criado_em", "id", "validade_cartao"]) {
  assert.strictEqual(
    proibida in pPerfil, false,
    `CART-03 autoedicao nao escreve ${proibida} (AD-019)`
  );
}

// documento vazio no autoedicao limpa a coluna (CART-04 no caminho do update)
const pPerfilLimpo = D.colunasPerfil({ nome: "X", nascimento: "2000-01-01", whatsapp: "84" }, ATUALIZADO);
assert.deepStrictEqual(
  [pPerfilLimpo.rg, pPerfilLimpo.cpf, pPerfilLimpo.data_batismo],
  [null, null, null],
  "CART-04 autoedicao sem documento limpa as tres colunas"
);
const pCreateLimpo = D.colunasCriarMembro({ nome: "X", nascimento: "2000-01-01", whatsapp: "84" }, "u", "IVC-0002");
assert.strictEqual(pCreateLimpo.cidade, null, "CART-04 create sem endereco grava NULL, nao ausente");
assert.strictEqual("logradouro" in pCreateLimpo, true, "coluna presente mesmo vazia (evita depender do default do banco)");

// ── CART-01/02/03: a MESCLAGEM que cada rota faz antes de chamar o service
// Se uma rota parasse de mesclar os dados (`...documento.dados`) ou de mesclar
// os erros por campo (`Object.assign(campos, ...)`), um guard que só procurasse
// `lerDocumentoForm` no arquivo continuaria verde. Aqui a mesclagem é executada.
const baseDados = { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" };
const baseErros = { nome: "Informe seu nome completo." };

// A união discriminada é o que torna a barreira de tipo: `dados` só existe no
// ramo `ok: true`. Um caminho que grava sem estreitar não compila — não há
// guarda de probe que pudesse substituir isso.
const mOk = D.comporDadosDocumento(
  baseDados, {},
  fd({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }),
  HOJE
);
assert.strictEqual(mOk.ok, true, "CART-01 formulario valido devolve o ramo ok");
assert.deepStrictEqual(
  [mOk.dados.rg, mOk.dados.cpf, mOk.dados.data_batismo],
  ["12.345.678-9", "12345678909", "2020-05-10"],
  "CART-01 rota compoe o documento no payload"
);
assert.strictEqual(mOk.dados.nome, "Miguel", "a mesclagem preserva os campos da rota");
assert.ok(!("campos" in mOk), "o ramo ok nao carrega mapa de erros");
assert.ok(Object.isFrozen(mOk.dados), "o payload pronto e imutavel");

const mBase = D.comporDadosDocumento(
  baseDados, baseErros,
  fd({ rg: "12.345.678-9" }),
  HOJE
);
assert.strictEqual(mBase.ok, false, "erro da propria rota tambem barra a gravacao");
assert.deepStrictEqual(Object.keys(mBase.campos), ["nome"], "erro da rota chega no 400");

const mErro = D.comporDadosDocumento(
  baseDados, baseErros,
  fd({ cpf: "123" }),
  HOJE
);
assert.strictEqual(mErro.ok, false, "CART-05 campo invalido devolve o ramo de erro");
assert.deepStrictEqual(
  Object.keys(mErro.campos).sort(), ["cpf", "nome"],
  "CART-05 erros de documento e da rota convivem no mesmo 400"
);
assert.ok(!("dados" in mErro), "o ramo de erro nao expoe payload: nao ha o que gravar");
assert.strictEqual(typeof mErro.campos.cpf, "string", "erro de documento presente no mapa");

// Um único campo invalido tem de derrubar o documento inteiro: nao existe
// "gravar o que deu" com parte invalida (CART-05..07, "SHALL NOT write").
const mParcial = D.comporDadosDocumento(
  baseDados, {},
  fd({ rg: "12.345.678-9", cpf: "123" }),
  HOJE
);
assert.strictEqual(mParcial.ok, false, "RG valido nao salva um CPF invalido ao lado");

const mLimpo = D.comporDadosDocumento(baseDados, {}, fd({}), HOJE);
assert.strictEqual(mLimpo.ok, true, "FormData sem documento e valido");
assert.deepStrictEqual(
  [mLimpo.dados.rg, mLimpo.dados.cpf, mLimpo.dados.data_batismo],
  [null, null, null],
  "CART-04 rota sem documento leva NULL, nao string vazia"
);
assert.deepStrictEqual(baseDados, { nome: "Miguel", nascimento: "2004-12-28", whatsapp: "84999766852" }, "comporDadosDocumento nao muta o payload da rota");
assert.deepStrictEqual(baseErros, { nome: "Informe seu nome completo." }, "comporDadosDocumento nao muta o mapa de erros da rota");

// ── CART-08/09/11: o que o cartao EXIBE, com hoje injetado
const base = {
  matricula: "IVC-0001", nome: "Miguel Ernandes", nascimento: "2004-12-28", whatsapp: "84999766852",
  rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10",
  criado_em: "2026-09-13T02:01:52.560567+00:00", foto_url: null,
};
const c1 = C.camposCartao(base, d(2026,10,1));
assert.strictEqual(c1.rg, "12.345.678-9", "CART-08 rg lido do row");
assert.strictEqual(c1.cpf, "12345678909", "CART-08 cpf lido do row");
assert.strictEqual(c1.baptismDate, "10/05/2020", "CART-08 batismo formatado pt-BR");
// criado_em 02:01Z do IVC-0001 equivale a 12/09 23:01 no Brasil: o dia civil
// do registro e 12/09, e o cartao tem de mostrar 12/09/2027. Asseverar 13/09
// aqui provaria que o dia esta sendo lido em UTC.
assert.strictEqual(c1.validity, "12/09/2027", "CART-09 ciclo corrente no calendario civil");
assert.strictEqual(
  C.camposCartao({ ...base, criado_em: "2026-09-13T12:00:00-03:00" }, d(2026,10,1)).validity,
  "13/09/2027",
  "CART-09 mesmo dia civil em UTC e -03:00"
);
assert.strictEqual(c1.id, "IVC-0001", "matricula");
assert.strictEqual(c1.name, "Miguel Ernandes", "nome");
assert.strictEqual(c1.photo, undefined, "foto ausente -> undefined");

// NULL em qualquer um dos tres -> "—" (CART-08) e a validade continua calculada
const c2 = C.camposCartao({ ...base, rg: null, cpf: null, data_batismo: null }, d(2026,10,1));
assert.strictEqual(c2.rg, "—", "CART-08 rg NULL -> —");
assert.strictEqual(c2.cpf, "—", "CART-08 cpf NULL -> —");
assert.strictEqual(c2.baptismDate, "—", "CART-08 batismo NULL -> —");
assert.strictEqual(c2.validity, "12/09/2027", "validade independe dos campos de documento");

// a validade EXIBIDA e o ciclo corrente, nao a coluna do banco
// ciclo-base do fixture: 12/09/2027 — o dia seguinte ja renovou
const c3 = C.camposCartao(base, d(2027,9,13));
assert.strictEqual(c3.validity, "12/09/2028", "CART-09 rollover no cartao (1 dia apos)");
const c4 = C.camposCartao(base, d(2027,9,12));
assert.strictEqual(c4.validity, "12/09/2027", "CART-10 limite inclusivo no cartao");
assert.strictEqual(C.camposCartao(base, d(2027,9,11)).validity, "12/09/2027", "CART-10 vespera ainda e o ciclo atual");

// criado_em inutilizavel -> "—" sem crash (CART-12 / P2 AC-7)
const c5 = C.camposCartao({ ...base, criado_em: "" }, d(2026,10,1));
assert.strictEqual(c5.validity, "—", "CART-12 criado_em vazio -> —");
const c6 = C.camposCartao({ ...base, criado_em: "lixo" }, d(2026,10,1));
assert.strictEqual(c6.validity, "—", "CART-12 criado_em invalido -> —");
// "AUSENTE" e não só "ilegível": a coluna é nullable no schema, então `null` e
// `undefined` são estados reais do row, não valores que o tipo proíbe.
const c7 = C.camposCartao({ ...base, criado_em: null }, d(2026,10,1));
assert.strictEqual(c7.validity, "—", "CART-15 criado_em null -> —");
const c8 = C.camposCartao({ ...base, criado_em: undefined }, d(2026,10,1));
assert.strictEqual(c8.validity, "—", "CART-15 criado_em undefined -> —");
assert.strictEqual(c8.name, base.nome, "CART-15 criado_em ausente nao derruba os outros campos");

// fmtData: formato pt-BR e hoje invalido
assert.strictEqual(C.fmtData("2026-09-13"), "13/09/2026", "fmtData pt-BR");
assert.strictEqual(C.fmtData(null), "—", "fmtData null");
assert.strictEqual(C.fmtData("13/09/2026"), "—", "fmtData formato errado -> —");
assert.strictEqual(C.fmtData("2026-02-30"), "—", "fmtData data inexistente -> —");
// Ano de 5 digitos no cartao: o trigger deriva `10000-12-31` (AD-025) e o
// cartao mostrava `—` para a data que a coluna tem. Medido na R6. Agora o
// round-trip em UTC e a unica coisa que pode recusar.
assert.strictEqual(
  C.fmtData("10000-12-31"), "31/12/10000",
  "fmtData mostra o ano de 5 digitos que a coluna tem"
);
assert.strictEqual(
  C.fmtData("275760-09-14"), "—",
  "fmtData acima do teto do Date continua recusando"
);

// determinismo
assert.strictEqual(
  C.camposCartao(base, d(2026,10,1)).validity,
  C.camposCartao(base, d(2026,10,1)).validity,
  "determinismo"
);
console.log("ok");
'; then
    ok "CART-04..07/09..12 runtime node: normalização, rejeições e validade rolante"
  else
    ko "CART-04..07/09..12 runtime node falhou (detalhes acima)"
  fi
fi

# --- CART-13/14/16: a migration, executada de verdade --------------------
# Fora do `--domain` porque precisa de container. `set -e` está ativo: o exit 2
# de um SKIP (sem Docker/imagem) é proposital, para que a camada que decide se o
# gate é suficiente veja que a tier não rodou.
if [ "$SOMENTE_DOMINIO" -eq 0 ] && [ "$COM_DB" -eq 1 ]; then
  if bash "$ROOT/scripts/probe-cartao-db.sh"; then
    ok "CART-13/14/16 runtime postgres: trigger, backfill e fuso"
  else
    status=$?
    ko "CART-13/14/16 tier postgres nao passou (exit $status)"
  fi
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
