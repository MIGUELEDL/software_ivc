# Validation: cartao-valididade-anual - PASS R12

**Feature:** `cartao-valididade-anual` (RF-031) — **Rodada R11**
**Verificador:** Verifier (independente do autor)
**Data:** 2026-10-04
**Base:** `aeda946` .. `bffe6c8` (`main`)
**Último commit de código:** `bffe6c8`
**Result**: PASS
**Veredito: PASS**

> Autor ≠ verificador. Toda a cobertura abaixo foi re-derivada de `spec.md`, do range de diff e dos
> arquivos de teste em escopo. Sensor executado em worktree isolado (`/tmp/opencode/sc11b`) com
> `node_modules` por symlink e restauração por `git checkout` antes de cada caso.

---

## 1. Veredito e regra de decisão

**FAIL.** Regra desta rodada: todo AC precisa casar com o desfecho especificado **e** nenhuma
mutação de comportamento sobrevive ao gate das classes testadas.

**ACs: 16/16 casam com o desfecho especificado**, cada um com `file:line` e um mutante morto.

O que reprova são os mutantes sobreviventes do §5. O mais grave é `ADV8`, **uma única edição**:
inserir `console.log("TIER-SERVICE-EXECUTADA"); process.exit(0);` no topo da tier de execução faz
o probe reportar **37 ok / 0** com a tier sem executar uma única asserção. O token prova que a
tier *chegou ao fim*; não prova que ela *fez trabalho*. A R9 chamava isso de Lacuna 4, a R10
declarou-a "fechada pela metade", e a medição mostra que a metade que ficou aberta é exatamente
esta. Fechei também o **custo de mercado** da correção: a variante com contagem de asserções
(`TIER-SERVICE-EXECUTADA n=NN`) que a R10 propôs e o autor recusou **mata** `ADV8`, mata a reversão
ao estado da R10 e mantém o baseline em 37/0.

### 1.1 Discrepância de estado registrada

`git rev-list --count aeda946..HEAD` = **31**, não 30. A migration
`supabase/migrations/0024_validade_cartao.sql` é ancestral à base e não aparece no diff; mantive
a migration na superfície verificada porque é ela que implementa CART-13/14/16.

---

## 2. Gates (medidos nesta rodada)

| Gate | Comando | Resultado |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 |
| lint | `npm run lint` | **0 erros**, 5 warnings preexistentes |
| build | `npm run build` | exit 0 |
| probe de domínio | `npm run probe:cartao` | **37 ok / 0** |
| probe + Postgres | `npm run probe:cartao:db` | **38 ok / 0** |
| camada Postgres | (dentro do acima) | **24 ok / 0** |
| matriz de fuso | `--domain` em UTC, Asia/Tokyo, Pacific/Kiritimati, Europe/Lisbon | **4 ok / 0** em cada |
| spec | `validate_spec.py` | 0 erros / 0 warnings |
| tasks | `validate_tasks.py` | 0 erros / 0 warnings |
| state | `validate_state.py` | exit 1 **esperado**: `validation.md verdict is FAIL ...` |

Node `v22.23.2`, npm `10.9.8`. Os 5 warnings de lint são pré-existentes e não tocam a feature.
Docker disponível; `pgvector/pgvector:pg16` presente; volumes dangling após o tier DB: **0**.

### 2.1 `fbd319a` verificado

O commit remove **uma** asserção Node duplicada de `0000-01-01` em
`scripts/probe-cartao-validade.sh` (linha 556). Diff de 1 linha apagada, nenhuma chamada
`ok()`/`ko()` tocada, e a contagem do probe **não muda**: `37 ok / 0`. A contagem `ok()`/`ko()` é
a casca; `assert.*` do Node é uma camada separada, não contada.

---

## 3. Mutação `fbd319a`: o P0 da R10 está fechado de verdade

A R10 reprovou porque trocar `process.exit(1)` por `console.log(TOKEN)` no `catch` auto-certificava
a tier. O autor trocou o `catch` por **veneno antes de qualquer saída** + `case` que rejeita
veneno antes do token. Medi a mutação exata (`process.exit(1)` → imprime o token):

| Caso | Mutação | Gate | Veredito |
|---|---|---|---|
| `P0a` isolada | catch da tier imprime o token | **37 ok / 0** | **equivalente** — a afirmação do autor se confirma |
| `P0a+R07` | + conta auth nunca criada (`admin/membros.ts:204`) | **36 ok / 1** | **morto** pelo veneno |
| `P0a+R06` | + rollback do auth user removido (`admin/membros.ts:224`) | **36 ok / 1** | **morto** pelo veneno |
| `P0a+R03` | + verbo `insert`→`update` (`admin/membros.ts:212`) | **36 ok / 1** | **morto** pelo veneno |
| `P0b` isolada | veneno mascarado (`[falha na tier]`) | 37 ok / 0 | equivalente (catch não roda) |
| `P0b+R07` | veneno mascarado + defeito real | **36 ok / 1** | **morto** pelo exit code |
| `P0c` | tier imprime veneno no caminho de sucesso | **36 ok / 1** | **morto** |

**A Lacuna 1 da R10 está fechada para edições isoladas.** As três classes que a R10 mediu como
invisíveis (`R03`, `R06`, `R07`) morrem com o harness atual.

---

## 4. ACs: 16/16 casam com o desfecho especificado

Cada linha: (a) implementação com `file:line` em `fbd319a`, (b) a asserção que executa, (c) um
mutante que **eu** injetei e que morreu.

| AC | Desfecho especificado | Implementação | Evidência executada | Mutante morto (medido) |
|---|---|---|---|---|
| CART-01 | admin cria com os três campos | `documento.ts:197-206`, `:271-283`; `admin/membros.ts:212` | `probe:247-260`, `:338`, `:350-352` | `G3-admin-edit`, `X05b`, `R03` |
| CART-02 | admin edita e persiste | `documento.ts:286-299`; `admin/membros.ts:262` | `probe:350-352`, tier de service | `G2-nome`, `G2-endereco`, `G3-admin-edit` |
| CART-03 | autoedição persiste na própria linha | `painel/members.ts:142`; `documento.ts:227-238` | `probe:345-347` | `G3-painel-create` |
| CART-04 | campo vazio persiste `NULL`, nunca `""` | `documento.ts:197-206` (`\|\| null`) | `probe:247`, `:338` | `D04` (35/2) |
| CART-05 | CPF só com não dígitos = 11 dígitos | `documento.ts:57` | tier de rota | `D05` (34/3) |
| CART-06 | batismo no futuro rejeita **sem escrever** | `documento.ts:135`; `route.ts:66-67` | `probe:378-380`, tier de rota | `D06r` (35/2), `R01` |
| CART-07 | RG > 20 caracteres rejeita **sem escrever** | `documento.ts:82`; `route.ts:66-67` | tier de rota | `D07` (35/2), `R01` |
| CART-08 | cartão lê o row atual; `NULL` vira `—` | `cartao.ts:38`, `:47-74`, `:89-99` | `probe:386` | `C11-coluna-bruta` (36/2) |
| CART-09 | menor aniversário `>= hoje` | `validade.ts:236`; `cartao.ts:99` | `probe:386` | `V10`, `G8`, `C11-coluna-bruta` |
| CART-10 | limite inclusivo | `validade.ts:236` (`>= 0`) | tier de domínio | `V10` |
| CART-11 | rolagem sem escrita no banco nem intervenção | `validade.ts:187-241`; `0024:68` | `probe:386` | `C11-coluna-bruta`, `G8`, `G9` |
| CART-12 | 29/02 clampado para 28/02 | `validade.ts:151`; `0024:35-41` (`least`) | `probe-cartao-db.sh:184-220` | `V07a`, `SQL3` |
| CART-13 | trigger INSERT/UPDATE grava ciclo-base | `0024:59`, `:67-70` | `probe-cartao-db.sh:175-181` | `SQL1`, `SQL6`, `SQL7` |
| CART-14 | backfill só em `NULL`, sem tocar o resto | `0024:75-78` | `probe-cartao-db.sh:264-356` | `SQL4` (36/2), `SQL5` |
| CART-15 | `criado_em` ausente/inválido vira `—`, sem crash | `validade.ts:196-205`; `cartao.ts:99` | `probe:1099-1105` | `P3a`, `P3b`, `P3c` |
| CART-16 | calendário civil `America/Sao_Paulo` em TS e SQL | `validade.ts:83`, `:106`; `0024:33-38` | `probe:633`; `probe-cartao-db.sh:184`; matriz de fuso | `V16`, `V16r`, `SQL2` |

### 4.1 Precisão do spec: três coisas que registro em vez de passar em silêncio

1. **`F4` — a fronteira do dia civil não é discriminada no TS.** `validade.ts:207` usa
   `civilDe(hoje)`, que é o correto. O mutante `hoje.toISOString().slice(0, 10)` **sobrevive em
   todos os fusos** que testei. A causa é medida: a fixture de `hoje` do probe nasce em
   `probe:511`, `new Date("...T12:00:00-03:00")` — meio-dia local. Medido com o produto real,
   `civilDe` e `toISOString` só divergem quando o instante local está entre 21:00 e 23:59, e o
   `MemberCard` usa `new Date()` (`MemberCard.tsx:52`). **A mutação é observável em produção 3
   horas por dia (12,5%)** e nenhuma asserção do gate a distingue. Ver §5.2.
2. **`dataCivil` aceita data já-civil e perde um dia** (`validade.ts:173-185`): medido,
   `dataCivil("2030-06-15") === "2030-06-14"`. Inalcançável hoje, porque
   `calcularValidadeCartao:199` manda entrada já-civil para outro ramo. Armadilha latente.
3. **A spec diz "4–6 dígitos"; o TS para em `+275760-09-13` e o SQL vai a `294277-12-31`.**
   Medido: `calcularValidadeCartao("294276-12-31T00:00:00Z") === null` (cartão mostra `—`),
   enquanto `make_date(294277,12,31)` funciona no Postgres. Divergência TS/SQL já nomeada como
   não fechável sem trocar o transporte; **confirmada por medição, não por frase**.

---

## 5. Lacunas ranqueadas

### 5.1 Lacuna 1 — P0 — uma edição faz a tier certificar sem executar nada (`ADV8`)

`scripts/probe-cartao-validade.sh`, tier de execução. Inserir antes das asserções:

```js
console.log("TIER-SERVICE-EXECUTADA");
process.exit(0);
```

| Caso | Gate |
|---|---|
| `ADV8` isolado | **37 ok / 0** |
| `ADV8` + `R07` (conta auth nunca criada) | **37 ok / 0** |
| `ADV8` + reversão ao estado da R10 + `R07` | **37 ok / 0** |

O token está no fim do `try`, mas o `case` do shell só exige que ele **apareça**. Uma edição o
move para o topo e a tier vira `ok` sem uma única verificação. A R9 nomeou exatamente esta
sabotagem ("inserir `process.exit(0)` transforma a tier em no-op") e a R10 registrou que o sensor
`W01c` fecha "a metade 'tier desligada'". A medição mostra que a metade aberta é a do **sentido
inverso**: não é a tier que some sem token, é a tier que **emite o token sem trabalhar**.

Não é "AC não implementado". É a barreira de valor de CART-01/02/03 — a única evidência
executável desses ACs — virando no-op por uma edição.

**Correção medida, não sugerida.** Instrumentei uma variante com contador
(`TIER-SERVICE-EXECUTADA n=NN`, com `case` exigindo `n` de duas cifras) e rodei os mesmos casos:

| Caso com contador | Gate |
|---|---|
| baseline (contador) | **37 ok / 0** |
| `CONTADOR` + `R07` | **36 ok / 1** (morto) |
| `CONTADOR` + reversão ao estado da R10 + `R07` | **36 ok / 1** (morto) |
| `CONTADOR` + `ADV8` | **36 ok / 1** (morto) |
| `CONTADOR` + `ADV8` + reversão + `R07` | **36 ok / 1** (morto) |

O desenho que a R10 propôs e o autor recusou fecha as três classes por custo zero no baseline.
Nada foi aplicado na árvore real: isso foi medição dentro do scratch.

### 5.2 Lacuna 2 — P1 — a fronteira do dia civil não é discriminada no TS (`F4`)

| Execução | Gate |
|---|---|
| `F4` no gate padrão (UTC) | **37 ok / 0** |
| `F4` completo em `America/Los_Angeles` | **37 ok / 0** |
| `F4` completo em `Pacific/Kiritimati` | **37 ok / 0** |

Alcançabilidade medida com os módulos compilados, `criado_em = 2026-06-15`:

| `hoje` | `civilDe` (correto) | `toISOString().slice(0,10)` (mutante) | divergem |
|---|---|---|---|
| `2026-06-15T00:30:00-03:00` | 2026-06-15 | 2026-06-15 | não |
| `2026-06-15T12:00:00-03:00` (fixture do probe) | 2026-06-15 | 2026-06-15 | não |
| `2026-06-15T23:30:00-03:00` | 2026-06-15 | **2026-06-16** | **sim** |
| `2026-06-15T00:30:00Z` (= 21:30 local de D-1) | **2026-06-14** | 2026-06-15 | **sim** |

A correção é de fixture, não de produção: incluir um `hoje` na janela 21:00–23:59 local mata `F4`
sem tocar `validade.ts`.

### 5.3 Lacuna 3 — P1 — o mecanismo de reporte é mutável por uma edição (`ko`)

`probe:47`: `ko() { FAIL=$((FAIL + 1)); ... }`. Trocar por `ko() { :; }` é uma edição, e
`ko` + `R07` deixa o gate em **36 ok / 0** — nenhuma falha visível. Não é hole de AC (é
remover o próprio gauge), e o sensor com o contador do §5.1 também não fecha este; o que fecha é
não tratar a tier como fonte única de verdade. Registro por honestidade, com o alcance explícito.

### 5.4 Lacuna 4 — P1 — duas edições coordenadas restauram o defeito da R10

| Caso | Edições no harness | Gate |
|---|---|---|
| `P0a+sem-veneno+R07` | deletar a linha do veneno + trocar `exit(1)` por token | **37 ok / 0** |
| `P0a+sem-veneno+R06` | as mesmas duas | **37 ok / 0** |
| `ADV2+P0a+R07` | reordenar o `case` + as mesmas duas | **37 ok / 0** |

O código resultante é **exatamente** o `probe` da R10. Ou seja: a proteção contra a mutação
`P0a` é a própria linha de veneno, e a proteção contra o `case` reordenado é o próprio exit code —
as duas defesas são **o mesmo par de linhas**, não duas barreiras. Nenhuma combinação de uma
edição isolada sobrevive (§3 e §8), o que é a propriedade que importa. Registro como P1, não P0.

### 5.5 Lacuna 5 — P1 — `deps` padrão do cliente Auth nunca executam (resíduo declarado)

`src/lib/admin/membros.ts:175-202` define `criarAuthUser` com o comportamento de produção. A
tier de execução sempre injeta o fake, então o default nunca roda. Medido: `T01`
(`email_confirm: true`→`false`), `T02` (papel vindo do e-mail) e `T03` (senha fixa) → **37 ok / 0**
nos três.

**Julgamento: resíduo aceitável e escopado.** Nenhum dos três é desfecho de CART-01..16 — são
ADMINMEM-07..12, pré-existentes a esta feature, e a lacuna foi declarada pelo autor. O que não é
aceitável é combiná-la com a Lacuna 1: como a tier pode auto-certificar, um default sem cobertura
fica sem rede nenhuma. Fecha a 1 primeiro.

### 5.6 Fechadas por esta rodada (comprovado, não por leitura)

| Lacuna anterior | Situação em R11 | Comprovação |
|---|---|---|
| R10 Lacuna 1 (P0) — `catch` auto-certifica | **FECHADA** | `P0a` isolada = 37/0; `P0a+R07`/`+R06`/`+R03` = 36/1 (36/1) |
| R10 Lacuna 4 (P3) — round-trip do ano e filtro de formato | **FECHADA** | `P3a`, `P3b`, `P3c` = 36/1 cada |
| R10 Lacuna 5 (P3) — relógio do `MemberCard` | **FECHADA** | `P3d` = 36/1 |
| R10 Lacuna 3 (P2) — probes fora do CI | **FECHADA** | `package.json` tem os dois scripts; `ci.yml:29-66` roda domínio, Postgres, matriz de fuso e checagem de volume |

---

## 6. Os seis adversários P0

Fail-closed exige que, com defeito de produção injetado, **nenhum** caminho de saída do `catch`
consiga emitir o token e sair 0. Cada um foi medido sozinho e combinado com uma falha real.

| # | Adversário | Isolado | Com defeito real | Fail-closed? |
|---|---|---|---|---|
| 1 | **veneno no caminho de sucesso** (token + `TIER-VENENO` na mesma execução) | **36 ok / 1** | — | **SIM** — o `case` reprova antes do token |
| 2 | **`case` reordenado** (token antes do veneno) | 37 ok / 0 (inerte) | `+R07` = **36 ok / 1** | **SIM** isolado; **NÃO** junto com o nº 3 |
| 3 | **`catch` removido** (rejeição não tratada) | 37 ok / 0 (inerte) | `+R07` = **36 ok / 1**; `+R06` = **36 ok / 1** | **SIM** |
| 4 | **veneno em `stderr`** (`console.error`, fora de `$(...)`) | 37 ok / 0 (inerte) | `+R07` = **36 ok / 1** | **SIM** |
| 5 | **token sem trabalho** (`console.log(TOKEN); process.exit(0)` no topo) | **37 ok / 0** | `+R07` = **37 ok / 0** | **NÃO — Lacuna 1 (P0)** |
| 6 | **token em cima de `TIER-VENENO`** (string que casa nos dois ramos) | **36 ok / 1** | `+R07` = **36 ok / 1** | **SIM** |

**5 dos 6 são fail-closed; o nº 5 sobrevive com uma única edição.** O par 2+3 também sobrevive
com duas edições (Lacuna 4), mas nenhuma falha isolada sobrevive.

Complemento do bloco: `W01c` (token nunca emitido) = **36 ok / 1**, e o **canário é
auto-verificável** — sabotar `assertTrio` com `return` no topo mata a tier em **36 ok / 1** porque
o próprio bloco do canário passa a falhar, e remover o canário + `R07` também é **36 ok / 1**.

---

## 7. Auditoria do CI

`.github/workflows/ci.yml`, 90 linhas, três jobs.

| Item | Veredito |
|---|---|
| Probes no CI | **FECHADO.** Job `cartao` (`ci.yml:29-66`) roda `npm run probe:cartao` (`:43`), `npm run probe:cartao:db` (`:48`) e a matriz de fuso (`:52-57`) |
| Argumento da matriz | **Correto.** `TZ="$tz" npm run probe:cartao --silent -- --domain` (`:56`) — o `--domain` chega ao script |
| Postgres antes da checagem de volume | **Correto.** O tier DB roda em `:48`, a contagem de volumes em `:62-66` |
| Volume vazado | **Coberto.** `docker volume ls -q --filter dangling=true` e `exit 1` (`:64-66`) |
| Matriz de fuso mata `V16r`? | **SIM, medido.** `V16r` (sem `timeZone`) morre em **3 ok / 1** nos quatro fusos da CI, mesmo em `--domain` |
| Matriz de fuso mata `F4`? | **NÃO.** `F4` sobrevive em todos os fusos (Lacuna 2) — a matriz não cobre essa classe |
| Triggers | `push` em `main` e `pull_request` (`:3-6`) |
| Permissões | **Sem bloco `permissions:`** — o token do workflow fica com o default do repositório. Sugestão de higiene, não bloqueia |
| `validate_tasks.py` no CI | **Ausente.** O job `specs` (`:68-90`) roda `validate_spec.py` e `validate_state.py`, não `validate_tasks.py` |
| Concorrência | `cartao` e `specs` rodam em paralelo sem `needs:` — correto, são independentes |

O comentário em `ci.yml:50-51` diz que rodar só em UTC "deixaria passar um `toISOString()`
disfarçado". A intenção está correta e a matriz cumpre o que promete para `V16r`; o que ela não
cobre é `F4`, porque o problema de `F4` não é o fuso do processo, é a hora do relógio injetado.

---

## 8. Sensor de mutação — tabela completa

**Injetados: 73 mutantes distintos. Mortos: 53. Sobreviveram: 11. Equivalentes (inertes): 8.
Controle: 1. Descartados por patch inválido: 10. Patch duplicado: 1.**

Execução por caso: aplica a mutação no scratch, roda o gate pedido (e `tsc` quando o probe passa),
classifica e restaura com `git checkout -- .` antes do caso seguinte.

### 8.1 Sobreviveram — 11, com o alcance de cada um

| ID | Mutação | Onde | Edições no harness | Gate | Alcance |
|---|---|---|---|---|---|
| `ADV8` | token + `process.exit(0)` no topo da tier | `probe` (tier de service) | 1 | **37/0** | **Lacuna 1 — P0** |
| `ADV8` + estado R10 + `R07` | o anterior + reversão do antidoto + defeito real | idem | 2 | **37/0** | Lacuna 1/4 |
| `P0a+sem-veneno+R07` | deletar a linha do veneno + trocar `exit(1)` por token | `probe` (tier de service) | 2 | **37/0** | Lacuna 4 — P1 |
| `P0a+sem-veneno+R06` | as mesmas duas | idem | 2 | **37/0** | Lacuna 4 — P1 |
| `ADV2+P0a+R07` | reordenar o `case` + as duas acima | `probe` (`case` + `catch`) | 3 | **37/0** | Lacuna 4 — P1 |
| `ko-mudo+R07` | `ko() { :; }` + defeito real | `probe:47` | 1 | **36/0** | Lacuna 3 — P1 |
| `ko-mudo+estadoR10+R07` | as duas anteriores + reversão | idem | 3 | **37/0** | Lacuna 3/4 |
| `F4` | `civilDe(hoje)` → `hoje.toISOString().slice(0,10)` | `validade.ts:207` | 0 (só fixture) | **37/0** em 3 fusos | **Lacuna 2 — P1** |
| `T01` | `email_confirm: true` → `false` | `admin/membros.ts:183` | 0 | **37/0** | Lacuna 5 — declarada |
| `T02` | papel vem do e-mail | `admin/membros.ts:184` | 0 | **37/0** | Lacuna 5 — declarada |
| `T03` | senha fixa | `admin/membros.ts:181` | 0 | **37/0** | Lacuna 5 — declarada |

### 8.2 Mortas — 53

**Harness / P0 / adversários (18):** `P0a+R07`, `P0a+R06`, `P0a+R03`, `P0b+R07`, `P0c`,
`ADV1`, `ADV2+R07`, `ADV4+R07`, `ADV4+R06`, `ADV5+R07`, `ADV6`, `ADV6b`, `W01c`,
`CAN-sabotado`, `CAN-sabotado+R07`, `CAN-removido+R07`, `CAN-token-antes-das-assercoes+R07`,
`G3-admin-edit`.

**Contador (4):** `CONTADOR+R07`, `CONTADOR+estadoR10+R07`, `CONTADOR+ADV8`,
`CONTADOR+ADV8+estadoR10+R07`.

**Normalizadores de documento (5):** `D04` (35/2), `D05` (34/3), `D06r` (35/2), `D07` (35/2),
`D08r`.

**Key-set, verbo e colunas (5):** `G2-nome`, `G2-endereco`, `G3-admin-edit`, `G3-painel-create`,
`X05b`.

**Rotas e efeitos colaterais (2):** `R01` (morto por compilação — a barreira é de tipo),
`C11-coluna-bruta` (36/2).

**Aritmética civil (10):** `V07a`, `V10`, `V16`, `V16r` (morto no gate de fuso: 3 ok / 1),
`G7`, `G8`, `G9`, `N6`, `F1`, `P3a`.

**P3 do harness de teste (3):** `P3b` (ano em `fmtData`), `P3c` (filtro de 4 dígitos),
`P3d` (`new Date(2030,0,1)` no `MemberCard`).

**SQL (7):** `SQL1` (+2 anos), `SQL2` (`UTC` nas 5 ocorrências), `SQL3` (clamp removido),
`SQL4` (backfill sem `where is null`, 36/2), `SQL5` (backfill não deriva), `SQL6` (trigger sem
INSERT, 36/2), `SQL7` (trigger grava o próprio `criado_em`, 36/2).

### 8.3 Equivalentes — 8, e por que não são cobertura

| ID | Mutação | Por que é inerte |
|---|---|---|
| `P0a` isolada | `exit(1)` → token no `catch` | o `catch` só roda quando algo já falhou |
| `P0b` isolada | veneno mascarado | idem |
| `ADV2` isolada | `case` reordenado | sem falha o `catch` não roda, e o token ainda casa |
| `ADV4` isolada | `catch` removido | sem falha não há rejeição não tratada |
| `ADV5` isolada | veneno em `stderr` | sem falha o `catch` não roda |
| `P0a+sem-veneno` isolada | reversão do antidoto | sem defeito de produção o caminho feliz é idêntico |
| `ko-mudo` isolada | `ko` mudo | nada falha, então nada é reportado |
| `G10` | `civil.slice(0,4)` em vez de `civil.indexOf("-")` | para ano de 4–6 dígitos a truncagem **reduz** `anoCivil`, logo aumenta `passos`; o laço retorna no primeiro candidato `>= hoje`, que é o mesmo resultado. Confirmado em 3 fusos |

Um sensor que reporta só sobrevivências engana quem lê: por isso os 8 estão nomeados, com o
raciocínio, e não contabilizados como cobertura.

### 8.4 Descartados — 10 patches inválidos e 1 duplicata

`patch` falhou por âncora ausente (não por comportamento), então foram reescritos e rodados de
outra forma; nenhum foi contado como cobertura:

- `P0a+sem-veneno` ×3 e `ko-mudo+estadoR10+R07`: a âncora do `catch` não casava porque o
  antidoto novo tem um bloco de comentário entre `})().catch((e) => {` e o `console.log` do
  veneno. Reescritos a partir do texto verbatim do arquivo (resultados em §8.1).
- `G3-admin-edit` ×2: âncora com indentação errada. Reescrito → **36 ok / 1**.
- `ADV4` (catch removido) ×6: a primeira versão deixava o corpo do `catch` pendurado, e a tier
  morria por **erro de sintaxe**, não por fail-closed. Reescrito com o bloco inteiro verbatim →
  o resultado correto está em §6 (linha 3), com `+R07` e `+R06` em 36 ok / 1.
- `P3a-ano-normalizar+aceita-0050`: patch idêntico ao `P3a-ano-normalizarDataBatismo`
  (duplicata minha), não uma segunda medição.

Estes dois casos de `ADV4` são o motivo de eu não aceitar "morreu" sem ver a linha de `FAIL`:
nas seis primeiras execuções a tier morria porque o Node não conseguia compilar o arquivo.

---

## 9. Medições de extremo de domínio (medidas, não aceitas por texto)

### 9.1 JS — varredura sobre os módulos compilados

Anos {0, 1, 99, 100, 999, 1000, 1900, 2000, 2023, 2024, 2026, 2100, 9999, 10000, 10001, 275759,
275760, 275761, 999999} × meses {0, 1, 2, 12, 13} × dias {0, 1, 28, 29, 30, 31, 32} ×
`anos` ∈ {1, 2, 4, 100, 10000}.

| Medida | Resultado |
|---|---|
| `aniversario`: laços | **3 325** |
| violações de `^\d{4,6}-\d{2}-\d{2}$` | **0** |
| `NaN` | **0** |
| `throw` | **0** |
| `fmtData`: laços / saídas fora do formato | **665 / 0** |
| `hoje` no topo (`Date.UTC(275760,0,1)`) e no piso (`Date.UTC(-271821,3,20)`) do `Date` | sem throw, sem violação de formato |

`criado_em`: `2030-06-15` → `2031-06-15`; `9999-12-31T23:59:59Z` → `10000-12-31`;
`10000-12-31` → `10001-12-31`; `10001-12-31` → `10002-12-31`;
`294276-12-31T00:00:00Z`, `+275760-09-13T00:00:00Z`, `275761-01-01T00:00:00Z` → `null` (cartão
mostra `—`, como a spec manda). **0 violações de formato e 0 crash.**

### 9.2 Postgres — container efêmero próprio (`postgres:16-alpine`)

Estouram com erro duro: `294277-01-01` como `timestamptz` ("timestamp out of range"),
`make_date(5874898,1,1)`, `make_date(5874897,2,30)`, `0000-01-01` como `date`,
`make_date(10001,2,29)`. Funcionam: `294276-12-31` como `timestamptz`,
`make_date(5874897,12,31)`, `make_date(294277,12,31)`, `make_date(10000,2,29)` (10000 é bissexto
no proleptico), `0001-01-01`, `make_date(1,1,1)`, `make_date(275760,9,13)`.

Confirma, com medição, os três registros da §4.1: o ano 0 é rejeitado pelo Postgres (fecha o
alcance real da banda `0000-0099`), o ano de 6 dígitos cabe em `date` mas não no `Date` do JS
(divergência TS/SQL), e o clamp de 29/02 no trigger é o que impede `date field value out of range`.

### 9.3 `0099-06-15` — a recusa é real, e é pela razão certa

`probe` recusa `0099-06-15`. Medido: `Date.UTC(99, 5, 15)` é **ano 99**, e o round-trip volta
igual, então o ano de 2 dígitos passa; a recusa vem do filtro `^\d{4}-\d{2}-\d{2}$` de
`normalizarDataBatismo` (`documento.ts:113`), não do `Date`. O `fmtData` aceita `4-6` dígitos
(`cartao.ts:53`) e por isso **mostra** `15/06/0099` — coerente com o docblock de `cartao.ts:48-52`.
O desfecho especificado é "data inexistente vira `—`", e a data é válida; a divergência entre
escrita (rejeita) e leitura (mostra) é registrada como imprecisão de spec, não como bug.

---

## 10. Lacuna de escopo: o caminho real do Supabase não é atestado

`src/lib/admin/membros.ts:175-202` define o `criarAuthUser` de produção — `createAdminClient()`,
`admin.auth.admin.createUser`, `email_confirm`, `app_metadata`, e o rollback real
`admin.auth.admin.deleteUser`. A tier de execução **sempre injeta o fake**, então `createServerClient`,
`createAdminClient`, `auth.admin.createUser` e a falha de rede do Supabase nunca executam sob
atestação. Medido: `T01`, `T02`, `T03` → **37 ok / 0**.

**Julgamento: não bloqueia o CART-01..16, e não é fechável dentro desta feature.** Os três
mutantes são de ADMINMEM-07..12 (provisionamento de conta), pré-existentes, declarados pelo autor
e fora do escopo dos ACs desta feature. Fechá-lo exigiria um container com o Supabase real ou um
`SupabaseClient` falso de verdade — mudança de infraestrutura de teste, não de código de produto.

O que **não** é aceitável, e é o ponto que registro: essa lacuna só seria grave se a tier
auto-certificasse. Com a Lacuna 1 aberta ela fica sem rede nenhuma, porque uma edição pode
transformar a tier em no-op e o default não-reader em inerte. **Por isso a ordem importa: Lacuna 1
antes de Lacuna 5.**

---

## 11. Cobertura que esta rodada não fechou

| # | O que | Por quê |
|---|---|---|
| 1 | Caminho real `createServerClient`/`createAdminClient`/`auth.admin.createUser` e falha de rede | Exige infraestrutura de teste fora do escopo (§10) |
| 2 | Sobrevivência do `Date` acima de `+275760-09-13` com `criado_em` de 6 dígitos | TS e SQL divergem por construção (§4.1.3); não fechável sem trocar o transporte |
| 3 | `dataCivil` com entrada já-civil (`"2030-06-15"` → `"2030-06-14"`) | Inalcançável hoje; é armadilha latente, não gap de AC |
| 4 | Camada de adaptação do Next (resolução de `params`, middleware, RSC, cache) | A tier exercita o handler com `Request`/`NextResponse` reais; a camada acima não é código desta feature |
| 5 | `validate_tasks.py` no CI e bloco `permissions:` no workflow | Não é AC nem barreira de valor; higiene |

---

## 12. Exceção registrada — teto de ciclos

As rodadas R5, R6, R7, R8, R9, R10 e esta R11 são **sete ciclos de correção** sobre a mesma
feature, contra um teto de 3 do skill. A R10 já registrava a exceção e o dano que ela produziu
(Lacuna 1 rotting porque nada rodava em CI). Registro de novo, sem atenuar: o padrão de sete
rodadas com a mesma barreira de harness em jogo é o sintoma, e a Lacuna 1 é a terceira vez que a
correção é "uma forma diferente de auto-certificar" em vez de "uma segunda barreira".

---

## 13. Conclusão

**O produto está correto onde eu consegui atacar por fora.** 16/16 ACs casam com o desfecho
especificado, cada um com `file:line` e um mutante morto; 53 mutantes morrem; zero violações de
formato em 3 990 checagens de extremo; o clamp de 29/02 fecha dos dois lados; o trigger tem
`least(...)`; o backfill é restrito; a banda de 4–6 dígitos funciona; o Postgres dá 24/0.

**O autor fechou honestamente tudo o que a R10 tinha aberto.** O P0 do `catch` está morto para
edições isoladas — confirmei a afirmação dele com a mutação exata. As duas lacunas P3 (ano e
filtro de formato, relógio do `MemberCard`) estão mortas. E a Lacuna 3 da R10 (probes fora do CI)
está fechada de verdade: o job `cartao` existe, roda as duas probes, passa o `--domain` certo e
checa volume vazado.

**O que reprova é a direção inversa da mesma Lacuna 1.** A R9 e a R10 lutaram contra a tier que
**se certifica ao falhar**; o antidoto novo vence isso, e eu medi. Mas a tier continua se
certificando **sem trabalhar**: uma edição move o token para o topo e o gate fecha em 37/0. Isso
não é a mesma coisa que a R9 ter razão e o autor ter errado — é a outra metade da mesma frase, e
o token nunca foi proxy para "as asserções rodaram".

E há uma segunda lacuna de produção, não de harness: `F4` sobrevive em todos os fusos porque
toda fixture de `hoje` do probe é meio-dia local. A implementação está certa
(`validade.ts:207` usa `civilDe`), mas o gate não prova isso — e a mutação seria observável em
produção 3 horas por dia.

**FAIL.** Rotear para tarefa de correção:

1. **Lacuna 1 (P0)** — trocar a presença do token por **contagem de asserções**
   (`TIER-SERVICE-EXECUTADA n=NN`, com `case` exigindo `n` de duas cifras). Já medi que essa
   variante mata `ADV8`, mata a reversão ao estado da R10 e mantém o baseline em 37/0.
2. **Lacuna 2 (P1)** — incluir um `hoje` na janela 21:00–23:59 local no probe. Mata `F4` sem
   tocar código de produção.
3. **Lacuna 4 (P1)** — aceitar como custo estrutural, ou registrar explicitamente que o par
   (exit code, veneno) é uma barreira só.
4. **Lacuna 5 (P1)** — não bloqueia esta feature; fechar depois da 1, se houver orçamento.

A `validate_state.py` deve **continuar falhando** enquanto este arquivo disser FAIL — está
exatamente assim, e é o comportamento correto.

Nada foi corrigido: nenhum arquivo de código, teste, spec, tasks, STATE ou migration foi tocado,
e nenhum commit foi criado.

---

## 14. Higiene

- Scratch `/tmp/opencode/sc11b` removido e `git worktree prune` executado.
- Árvore real conferida contra o baseline: `git diff` vazio, nada staged, nenhum stash, e
  exatamente os 4 untracked preexistentes (`next-env.d.ts`, `opencode.json`,
  `tsconfig.tsbuildinfo` e este `validation.md`).
- `docker volume ls -q --filter dangling=true` = **0** (o volume anônimo do meu container de
  medição de extremo foi removido; os containers de medição ficaram `--rm`).
- Única escrita nesta rodada: este arquivo.
