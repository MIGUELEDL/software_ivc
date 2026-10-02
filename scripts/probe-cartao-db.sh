#!/usr/bin/env bash
# Probes cartao-valididade-anual — camada de BANCO (CART-13, CART-14, CART-16).
#
# Por que um Postgres efêmero e não grep no arquivo .sql: o guard textual do
# probe principal aceitava `+ 0` anos, `at time zone 'UTC'`, backfill com data
# arbitrária e o clamp de 29/02 removido. Todos os quatro passavam o gate e
# quebram requisito. Aqui a migration roda de verdade e as asserções rodam
# sobre o resultado, então mutar o arquivo passa a falhar.
#
# A migração roda sobre uma tabela `members` mínima (só as duas colunas que o
# trigger toca) num container descartável. Nada remoto é tocado.
#
# Sem Docker, esta tier é SKIP com motivo explícito: quem roda sem container
# perde CART-13/14/16, e o relatório de gate precisa dizer isso em voz alta em
# vez de mostrar um verde silencioso.

set -uo pipefail

# `PROBE_ROOT` existe para o sensor de mutação rodar contra uma cópia do repo:
# mutar a migration em place e testar aqui seria mexer no working tree.
ROOT="${PROBE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MIGRACAO="$ROOT/supabase/migrations/0024_validade_cartao.sql"
IMAGEM="pgvector/pgvector:pg16"

PASS=0
FAIL=0

ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

# Mesmos instantes usados pela tier TypeScript, stressing a fronteira do
# calendário civil (23:30/00:30, meia-noite UTC, 29/02).
FIXTURES='2026-09-13T02:01:52+00:00
2026-09-12T21:53:00+00:00
2024-02-29T12:00:00+00:00
2024-02-29T00:30:00+00:00
2026-01-01T00:30:00+00:00
2028-02-29T12:00:00-03:00
2026-03-01T02:00:00+00:00
2024-03-01T02:30:00+00:00
2025-12-31T23:30:00-02:00
9999-12-31T23:59:59+00:00
1800-06-01T12:00:00-03:00'

# O nono instante existe para um fuso do clamp: 2024-03-01T02:30Z é 29/02 em
# São Paulo e 01/03 em UTC, então só ele exercita o `least(...)` de 29 contra
# os 28 dias de fevereiro do ano-alvo. Sem ele, trocar o fuso DESSA ocorrência
# continuava passando — `least(28, 31)` dá 28 de qualquer jeito.
#
# O décimo existe para o ano de 5 dígitos (AD-025). O trigger grava
# `make_date(9999 + 1, ...)` = `10000-12-31`, e o TS usava comparar datas como
# string: `"10000-12-31" >= "2026-01-01"` é falso, porque "1" ordena antes de "2".
# Medido: SQL devolvia `10000-12-31` e o TS devolvia `—` para o mesmo registro.
# Sem este fixture o cross-check não enxerga a divergência, porque nenhum dos
# outros nove instantes passa de 4 dígitos.
#
# O décimo primeiro (ano 1800) fecha a janela BAIXA, que é fechável: um
# `criado_em` de 1800-06-01 tem ciclo-base `1801-06-01` no trigger, e o TS
# devolvia `—` porque o laço de candidatos tinha teto fixo de 200 anos.
printf '== Probes cartao-valididade-anual [postgres efemero] ==\n'

if [ ! -f "$MIGRACAO" ]; then
  printf '  SKIP migration ausente: %s\n' "$MIGRACAO"
  exit 2
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf '  SKIP Docker indisponivel — CART-13/14/16 sem verificacao nesta maquina\n'
  printf '       (instale Docker ou rode a probe num host com container; o gate\n'
  printf '        fica incompleto sem isso, e isso e intencionalmente visivel)\n'
  exit 2
fi

# A imagem precisa estar na maquina: `docker pull` depende de rede e o CI pode
# nao ter. Sem ela a probe SKIP em vez de baixar 150MB por conta propria.
if ! docker image inspect "$IMAGEM" >/dev/null 2>&1; then
  printf '  SKIP imagem %s ausente localmente — rode `docker pull %s` uma vez\n' "$IMAGEM" "$IMAGEM"
  printf '       (CART-13/14/16 ficam sem verificacao nesta maquina)\n'
  exit 2
fi

# `--tmpfs` no PGDATA é obrigatório, não cosmetic. A imagem declara VOLUME
# nesse caminho, então cada `docker run` criava um volume anônimo que
# `--rm` não remove (o --rm limpa o container, não volumes). Medido na R7:
# 1 volume por execução, 11 acumulados de R1..R6. A sonda de banco é
# efêmera por definição; deixar volume para trás é lixo no host de quem roda.
CONT="$(docker run --rm -d \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=256m \
  -e POSTGRES_PASSWORD=probe \
  -e POSTGRES_DB=probe \
  "$IMAGEM" 2>/dev/null)"

if [ -z "$CONT" ]; then
  printf '  FAIL docker run nao devolveu container para %s\n' "$IMAGEM"
  exit 1
fi

# Compila o módulo puro para o cross-check TS x SQL no fim da probe.
TMP_JS="$(mktemp -d)"

cleanup() {
  [ -n "${CONT:-}" ] && docker stop "$CONT" >/dev/null 2>&1
  rm -rf "$TMP_JS"
  return 0
}
trap cleanup EXIT

if ! npx tsc "$ROOT/src/lib/painel/validade.ts" \
    --outDir "$TMP_JS" --module commonjs --target es2020 \
    --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1; then
  printf '  FAIL nao compila src/lib/painel/validade.ts para o cross-check\n'
  exit 1
fi
VALIDADE_JS="$TMP_JS/validade.js"

# Espera o servidor real. O entrypoint do Postgres sobe um servidor temporário
# durante o `initdb`, e nele o `pg_isready` já responde: casar a primeira vez é
# falar com um servidor que vai morrer em seguida. Por isso exigimos 3 respostas
# seguidas com 1s de intervalo — só assim o container está estável.
PRONTO=0
consecutivos=0
for _ in $(seq 1 45); do
  if docker exec "$CONT" pg_isready -U postgres -d probe >/dev/null 2>&1; then
    consecutivos=$((consecutivos + 1))
    if [ "$consecutivos" -ge 3 ]; then
      PRONTO=1
      break
    fi
  else
    consecutivos=0
  fi
  sleep 1
done

if [ "$PRONTO" -ne 1 ]; then
  printf '  FAIL container nao ficou pronto para conexao\n'
  exit 1
fi

# `-q` é obrigatório: sem ele o psql emite a command tag ("SET", "INSERT 0 1")
# junto do valor e toda comparação de string quebra.
sql() { docker exec -i "$CONT" psql -U postgres -d probe -v ON_ERROR_STOP=1 -q -tAX "$@"; }
# Sem `-i`: com stdin ligado, o psql consome o resto do stdin do chamador — o que
# destrói qualquer `while read` que esteja alimentando a query.
sqlp() { docker exec "$CONT" psql -U postgres -d probe -v ON_ERROR_STOP=1 -q -tAX "$@"; }
# Valor escalar de uma query; erro do Postgres sai como string de erro.
valor() { sqlp -c "$1" 2>&1; }

# --- schema mínimo -------------------------------------------------------
# Só o que o trigger toca. `matricula` e `nome` existem para as asserções de
# "o trigger não mexe em mais nada".
sql >/dev/null <<'SQL'
create table public.members (
  id               bigserial primary key,
  matricula        text not null unique,
  nome             text not null,
  nascimento       text,
  cpf              text,
  rg               text,
  data_batismo     date,
  criado_em        timestamptz,
  atualizado_em    timestamptz,
  validade_cartao  date
);
SQL

# --- roda a migration DE VERDADE, do arquivo do repo --------------------
if ! docker exec -i "$CONT" psql -U postgres -d probe -v ON_ERROR_STOP=1 \
    <"$MIGRACAO" >/dev/null 2>&1; then
  ko "CART-13 migration 0024 aplica sem erro em postgres limpo"
  exit 1
fi
ok "CART-13 migration 0024 aplica sem erro em postgres limpo"

# --- CART-13: o trigger grava criado_em + 1 ano --------------------------
# `+ 0` anos devolveria a própria data de registro, então este assert mata B13.
r=$(valor "select public.members_ciclo_base('2026-09-12 23:01:52-03')::text")
if [ "$r" = "2027-09-12" ]; then
  ok "CART-13 ciclo-base = criado_em civil + 1 ano"
else
  ko "CART-13 ciclo-base esperado 2027-09-12, veio $r"
fi

# --- CART-16: o dia vem do calendário civil, não de UTC -----------------
# O mesmo instante é 13/09 em UTC e 12/09 em São Paulo. Trocar a zona no SQL
# para 'UTC' devolveria 2027-09-13 e este assert mataria B14.
r=$(valor "select public.members_ciclo_base('2026-09-13 02:01:52+00')::text")
if [ "$r" = "2027-09-12" ]; then
  ok "CART-16 SQL le o dia no calendario America/Sao_Paulo, nao em UTC"
else
  ko "CART-16 esperado 2027-09-12 (dia civil BR), veio $r"
fi

# O fuso é explícito no arquivo, não herdado da sessão: a mesma função sob
# `TZ=UTC` e `TZ=Asia/Tokyo` tem de devolver o mesmo dia.
saida="$(docker exec "$CONT" psql -U postgres -d probe -q -tAX \
  -c "set timezone='UTC'; select public.members_ciclo_base('2026-09-13 02:01:52+00')::text;" \
  -c "set timezone='Asia/Tokyo'; select public.members_ciclo_base('2026-09-13 02:01:52+00')::text;" \
  | tr -d '[:space:]')"
if [ "$saida" = "2027-09-122027-09-12" ]; then
  ok "CART-16 ciclo-base nao depende do fuso da sessao"
else
  ko "CART-16 fuso da sessao vazou no calculo: $saida"
fi

# --- CART-12 no SQL: 29/02 clampado para 28/02 --------------------------
# Sem `least(...)`, `make_date(2025, 2, 29)` estoura e o INSERT inteiro falha.
r=$(valor "insert into public.members (matricula, nome, criado_em)
  values ('IVC-LEAP', 'Salto', '2024-02-29 12:00:00+00') returning validade_cartao::text;")
if [ "$r" = "2025-02-28" ]; then
  ok "CART-12 29/02 clampado para 28/02 no trigger"
else
  ko "CART-12 clamp 29/02 esperado 2025-02-28, veio $r"
fi

# 2028 é bissexto, então o clamp não pode arrasta-lo para 28/02.
r=$(valor "insert into public.members (matricula, nome, criado_em)
  values ('IVC-LEAP2', 'Bissexto', '2028-02-29 12:00:00-03') returning validade_cartao::text;")
if [ "$r" = "2029-02-28" ]; then
  ok "CART-12 ano bissexto alvo tambem clampa (2029-02-29 -> 28/02)"
else
  ko "CART-12 esperado 2029-02-28, veio $r"
fi

# --- CART-13: trigger de verdade, não só a função -----------------------
r=$(valor "insert into public.members (matricula, nome, criado_em)
  values ('IVC-T1', 'Trigger', '2026-01-01 00:30:00+00') returning validade_cartao::text;")
# 2026-01-01 00:30Z é 2025-12-31 21:30 no Brasil.
if [ "$r" = "2026-12-31" ]; then
  ok "CART-13 BEFORE INSERT grava o ciclo-base"
else
  ko "CART-13 INSERT esperado 2026-12-31 (dia civil BR), veio $r"
fi

# Cliente não escolhe o próprio ciclo-base: um UPDATE forjado é revertido
# pelo trigger. Esta é a barreira que segura AD-019 no lado do banco.
valor "update public.members set validade_cartao = '1999-01-01' where matricula = 'IVC-T1';" >/dev/null
r=$(valor "select validade_cartao::text from public.members where matricula = 'IVC-T1';")
if [ "$r" = "2026-12-31" ]; then
  ok "CART-13 UPDATE com validade forjada e revertido pelo trigger"
else
  ko "CART-13 trigger aceitou validade forjada: $r"
fi

# Alterar `criado_em` recalcula junto.
valor "update public.members set criado_em = '2020-06-15 12:00:00-03'
  where matricula = 'IVC-T1';" >/dev/null
r=$(valor "select validade_cartao::text from public.members where matricula = 'IVC-T1';")
if [ "$r" = "2021-06-15" ]; then
  ok "CART-13 UPDATE de criado_em recalcula a validade"
else
  ko "CART-13 recalculo ao mover criado_em esperado 2021-06-15, veio $r"
fi

# `criado_em` nulo deixa a coluna nula, sem `make_date(NULL,...)` estourando.
r=$(valor "insert into public.members (matricula, nome, criado_em)
  values ('IVC-NULL', 'Sem data', null) returning coalesce(validade_cartao::text, 'NULL');")
if [ "$r" = "NULL" ]; then
  ok "CART-13 criado_em nulo deixa validade nula"
else
  ko "CART-13 criado_em nulo esperado NULL, veio $r"
fi

# --- CART-14: backfill --------------------------------------------------
# Antes da migration: duas linhas com validade NULL e uma já preenchida (com
# valor errado, para provar que só NULL é tocado).
# O trigger precisa estar fora antes de semear: ele reescreve a validade em TODO
# insert, então semear a linha "já preenchida" com o trigger ativo gravaria o
# valor certo e a asserção de preservação viraria verde sem provar nada.
sql >/dev/null <<'SQL'
drop trigger members_validade_cartao on public.members;
insert into public.members (matricula, nome, nascimento, cpf, rg, data_batismo, criado_em, atualizado_em, validade_cartao) values
  ('IVC-B1', 'Backfill A', '2004-12-28', '12345678909', '12.345.678-9', '2010-01-03', '2026-02-28 02:00:00+00', '2026-02-01 00:00:00+00', null),
  ('IVC-B2', 'Backfill B', '1999-05-05', '98765432100', '98.765.432-1', '2015-06-06', '2024-02-29 12:00:00+00', '2024-01-01 00:00:00+00', null),
  ('IVC-B3', 'Preservada',  '1980-03-03', '11122233344', '11.222.333-4', '2001-07-07', '2020-01-01 12:00:00-03', '2020-01-01 00:00:00+00', '2019-01-01');
SQL

# Snapshot de TUDO que não é `validade_cartao`, para o backfill ser obrigado a
# ser um update de uma coluna só. Sem isso, um backfill que também gravasse
# `nome` ou `atualizado_em` passava o gate inteiro: contagem e a coluna de
# interesse continuavam iguais.
# O `order by` vai DENTRO do agregado: um `order by matricula` no nível de
# consulta não garante a ordem do `string_agg`, e a comparação de snapshot
# precisa ser determinística.
SNAP_SQL="select coalesce(string_agg(matricula || '|' || nome || '|' || coalesce(nascimento,'~') || '|' || coalesce(cpf,'~') || '|' || coalesce(rg,'~') || '|' || coalesce(data_batismo::text,'~') || '|' || coalesce(criado_em::text,'~') || '|' || coalesce(atualizado_em::text,'~'), '\\n' order by matricula), '') from public.members;"
antesSnapshot="$(valor "$SNAP_SQL")"

# A query de snapshot precisa ter rodado. Sem esta checagem, uma coluna
# inexistente faria `valor()` devolver o texto do erro — e o gate compararia o
# erro com ele mesmo, dando verde para qualquer backfill. Foi exatamente o que
# aconteceu na 3a rodada: o snapshot citava colunas que a tabela do probe não
# tinha, e um backfill que também escrevia `nome` e `atualizado_em` passava.
case "$antesSnapshot" in
  ""|*"ERROR"*|*"error:"*) ko "CART-14 snapshot das colunas nao pode ser lido: $antesSnapshot" ;;
  *) ok "CART-14 snapshot das colunas legivel antes do backfill" ;;
esac

if ! docker exec -i "$CONT" psql -U postgres -d probe -v ON_ERROR_STOP=1 \
    <"$MIGRACAO" >/dev/null 2>&1; then
  ko "CART-14 backfill da migration roda sem erro"
else
  ok "CART-14 backfill da migration roda sem erro"
fi

depoisSnapshot="$(valor "$SNAP_SQL")"
if [ "$antesSnapshot" = "$depoisSnapshot" ]; then
  ok "CART-14 backfill nao altera nenhuma outra coluna"
else
  ko "CART-14 backfill mexeu fora de validade_cartao: [$antesSnapshot] -> [$depoisSnapshot]"
fi

r=$(valor "select validade_cartao::text from public.members where matricula = 'IVC-B1';")
# 2026-02-28 02:00Z é 2026-02-27 23:00 no Brasil.
if [ "$r" = "2027-02-27" ]; then
  ok "CART-14 backfill deriva o valor de criado_em"
else
  ko "CART-14 backfill esperado 2027-02-27, veio $r"
fi

# Este é o assert que mata B12: um `set validade_cartao = date '2000-01-01'`
# também satisfaz `where validade_cartao is null`, mas grava a data errada.
r=$(valor "select validade_cartao::text from public.members where matricula = 'IVC-B2';")
if [ "$r" = "2025-02-28" ]; then
  ok "CART-14 backfill de 29/02 grava o clamp, nao data arbitraria"
else
  ko "CART-14 backfill de 29/02 esperado 2025-02-28, veio $r"
fi

r=$(valor "select validade_cartao::text from public.members where matricula = 'IVC-B3';")
if [ "$r" = "2019-01-01" ]; then
  ok "CART-14 backfill nao toca linha ja preenchida"
else
  ko "CART-14 coluna preenchida foi sobrescrita: $r"
fi

# Idempotência: rodar de novo não muda nada nem a contagem.
#
# O exit code da reexecução é conferido, não só o resultado. Sem isso, uma
# migration que NÃO é idempotente — sem `drop trigger if exists`, por exemplo —
# falhava no meio e mesmo assim a tier reportava verde, porque o bloco só
# comparava a contagem e o valor de IVC-B3, que a falha não alcançava.
antes="$(valor 'select count(*)::text from public.members;')"
if docker exec -i "$CONT" psql -U postgres -d probe -v ON_ERROR_STOP=1 \
    <"$MIGRACAO" >/dev/null 2>&1; then
  reexecOk=1
  ok "CART-14 reexecutar a migration nao falha"
else
  reexecOk=0
  ko "CART-14 reexecutar a migration falhou — a migration nao e idempotente"
fi
depois="$(valor 'select count(*)::text from public.members;')"
r="$(valor "select validade_cartao::text from public.members where matricula = 'IVC-B3';")"
if [ "$reexecOk" -eq 1 ] && [ "$antes" = "$depois" ] && [ "$r" = "2019-01-01" ]; then
  ok "CART-14 reexecutar a migration e idempotente ($depois linhas)"
else
  ko "CART-14 reexecucao mudou dados: $antes -> $depois, B3=$r"
fi

# --- CART-14: a EXPRESSÃO do backfill, com o trigger fora ---------------
# O teste acima não prova a expressão do SET: como o trigger é BEFORE UPDATE,
# ele reescreve a coluna durante o próprio backfill e mascara qualquer valor que
# a migration escrevesse ali. Um `set validade_cartao = date '2000-01-01'`
# passava o gate inteiro. Aqui a mesma instrução da migration roda sozinha, sem
# trigger, sobre uma linha zerada — é o cenário legado que o backfill atende.
# A instrução é extraída do arquivo, não reescrita aqui.
BACKFILL_SQL="$(sed -n '/^update public.members/,$p' "$MIGRACAO" | sed -e 's|;[[:space:]]*$||')"

if [ -z "$BACKFILL_SQL" ]; then
  ko "CART-14 nao encontrei a instrucao de backfill na migration"
else
  sql >/dev/null <<SQL
drop trigger members_validade_cartao on public.members;
update public.members set validade_cartao = null where matricula = 'IVC-B2';
SQL
  if ! printf '%s;\n' "$BACKFILL_SQL" | sql >/dev/null 2>&1; then
    ko "CART-14 backfill isolado executa"
  else
    ok "CART-14 backfill isolado executa"
  fi

  # 2024-02-29 em São Paulo -> ciclo-base 2025-02-28 (clamp), nunca 2000-01-01
  # nem 2024-02-29. Este e o assert que mata B12.
  r="$(valor "select coalesce(validade_cartao::text, 'NULL') from public.members where matricula = 'IVC-B2';")"
  if [ "$r" = "2025-02-28" ]; then
    ok "CART-14 expressao do backfill deriva o clamp de criado_em, sem o trigger"
  else
    ko "CART-14 expressao do backfill esperado 2025-02-28, veio $r"
  fi
fi

# --- TS x SQL: os dois lados tem de concordar -----------------------------
# A concordação entre `validade.ts` e o trigger era observacao do Verifier,
# nao gate. Aqui os dois sao executados sobre os mesmos instantes.
saida_sql="$(printf '%s\n' "$FIXTURES" | while read -r iso; do
  [ -z "$iso" ] && continue
  printf '%s\t%s\n' "$iso" "$(valor "select public.members_ciclo_base('$iso'::timestamptz)::text;")"
done)"

saida_ts="$(PROBE_FIXTURES="$FIXTURES" PROBE_VALIDADE_JS="$VALIDADE_JS" node -e '
const V = require(process.env.PROBE_VALIDADE_JS);
for (const iso of process.env.PROBE_FIXTURES.split("\n").filter(Boolean)) {
  const base = V.dataCivil(iso);
  process.stdout.write(`${iso}\t${V.aniversario(base, 1)}\n`);
}
')"

# A contagem vem da lista, nao de um literal: um "8" escrito a mao ja ficou
# desatualizado quando o nono instante foi adicionado e a mensagem continuava
# verde, mentindo sobre o proprio gate.
n_instantes="$(printf '%s\n' "$FIXTURES" | grep -c .)"

if [ -n "$saida_ts" ] && [ "$saida_sql" = "$saida_ts" ]; then
  ok "CART-16 TS e SQL concordam nos $n_instantes instantes de fronteira"
else
  ko "CART-16 divergencia TS x SQL:"
  printf '%s\n' "$saida_ts" >/tmp/probe-ts.$$ 2>/dev/null
  printf '%s\n' "$saida_sql" >/tmp/probe-sql.$$ 2>/dev/null
  diff /tmp/probe-ts.$$ /tmp/probe-sql.$$ 2>/dev/null | sed 's/^/       /'
  rm -f /tmp/probe-ts.$$ /tmp/probe-sql.$$
fi

printf '== Resumo postgres: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
