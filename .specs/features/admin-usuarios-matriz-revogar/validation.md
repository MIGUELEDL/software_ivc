# Admin Usuários — Revogar Permissões na Matriz — Validation

**Feature**: `.specs/features/admin-usuarios-matriz-revogar/spec.md` (6 ACs `USRREV-01..06`)
**Diff range**: `159a526efca3e3e0a8c9a52d272c4c72e6806f48..0df16ee32fca7bbee74849c1b072be303425a103` (commits `1b13d7c`, `0df16ee`)
**Data**: 2026-10-09
**Verifier**: sub-agente independente (autor ≠ verificador)
**Decisão**: AD-027 (`.specs/STATE.md:219`)
**Veredito**: ✅ **PASS** — 6/6 ACs com asserção discriminante; sensor 4/4 mortos.

---

## 1. Spec-anchored check (AC → evidência)

| AC | Resultado definido na spec | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| **USRREV-01** | `nivel:""` → DELETE da linha, HTTP 200 com `removed >= 1` | `scripts/probes-admin-usuarios.sh:695-696` — `HTTP_REV = "200"` **e** corpo casa `grep -qE '"removed":([1-9][0-9]*)'`; estático `:665-669`. Código: `src/lib/admin/permissoes.ts:45-56` | ✅ PASS (⚠️ `ok:true` e o tipo de `updated` não assertados) |
| **USRREV-02** | `GET` não contém o par `(role, module)` revogado | `scripts/probes-admin-usuarios.sh:707-708` — `python` confirmando `not any(role == "SECRETARIA" and module == "igrejas")` | ✅ PASS |
| **USRREV-03** | Nível válido é upsert e conta em `updated` | `scripts/probes-admin-usuarios.sh:727-728` — `updated: [1-9]`; `:732-734` — acesso restaurado `200`. Código: `permissoes.ts:60-67` | ✅ PASS |
| **USRREV-04** | Valor inválido → HTTP 400 `{ error: "nivel_invalido" }` | `scripts/probes-admin-usuarios.sh:752-753` — `HTTP_BAD = "400"` **e** corpo contém `nivel_invalido`. Código: `permissoes.ts:57-59` + `src/app/api/admin/usuarios/permissoes/route.ts:37-39` | ✅ PASS |
| **USRREV-05** | Papel perde acesso ao módulo → 403 | `scripts/probes-admin-usuarios.sh:714-716` — `HTTP_IG_BEFORE = "200"` **e** `HTTP_IG_AFTER = "403"` (guard `requireEscrita`/`authAdmin` de `src/app/api/admin/igrejas/route.ts:29`) | ✅ PASS (⚠️ corpo `nao_autorizado` não assertado) |
| **USRREV-06** | Editor envia `nivel:""` ("revogar acesso", rótulo "—") | `scripts/probes-admin-usuarios.sh:658-660` — grep de `NIVEIS = ["ler", "escrever", "administrar", ""]` **e** de `cells[\`${role}:${module}\`] || ""`; código `src/app/admin/usuarios/permissoes/matrix-editor.tsx:14,48` | ✅ PASS (⚠️ rótulo "—" em `matrix-editor.tsx:143` não assertado) |

**Status**: ✅ 6/6 ACs cobertos com asserção discriminante | 3 ⚠️ spec-precision gaps (não-bloqueantes).

### Edge cases

- [ ] E1 — IF `(role, module)` não existe na matriz THEN delete no-op e `removed` conta 0: **sem probe**. Código correto (`removed += count ?? 0`, `permissoes.ts:54`), mas não há asserção → gap de cobertura (L-017).
- [ ] E2 — payload misto (revogações `""` + upserts): **sem probe** (USRREV-01/03 usam payloads de item único) → gap de cobertura (L-017).
- [ ] E3 — `role`/`module` fora do enum mantém validação (`dados_invalidos` 400): **sem probe**; comportamento preservado em `permissoes.ts:39-44` + `route.ts:40-42` → gap de cobertura.

---

## 2. Discrimination sensor (scratch isolado)

Scratch: `git worktree` em `HEAD` (`0df16ee`), `node_modules` hard-linkado, `.env.local` copiado, build próprio servido em `:3100`. Baseline do scratch: **51 ok / 0 falhas** (idêntico ao real). Worktree removido ao final; `git status --porcelain` do real confere com o baseline pré-sensor.

| # | Mutante (nível-comportamento) | Arquivo:linha (scratch) | Efeito observado | Morto? |
| --- | --- | --- | --- | --- |
| **M1** | Delete vira no-op: `.eq("module", u.module + "__nunca__")` (strings `u.nivel === ""`, `.delete(`, `removed` preservadas — vence só o runtime) | `permissoes.ts:45-56` | Revogar não remove a linha; resposta `{"ok":true,"updated":0,"removed":0}`; par permanece no GET; acesso continua 200 | ✅ **Morto** — 3 falhas: USRREV-01, USRREV-02, USRREV-05 (48/3) |
| **M2** | `removed` forçado a 0 no retorno: `return { ok:true, updated, removed: 0 }` (delete real continua) | `permissoes.ts:69` | Par some, acesso é negado, mas contador reporta 0 | ✅ **Morto** — 1 falha: USRREV-01 (50/1) |
| **M3** | `""` deixa de ser aceito: ramo `if (u.nivel === "")` → `if (u.nivel === " ")` (reintroduz o bug original) | `permissoes.ts:45` | Revogar retorna `400 {"error":"nivel_invalido"}`; par permanece | ✅ **Morto** — 3 falhas: estático USRREV-01 + runtime USRREV-01, USRREV-02, USRREV-05 |
| **M4** | Validação de nível invertida: `if (false && !NIVEIS_VALIDOS.includes(...))` aceita inválidos não-vazios | `permissoes.ts:57` | `nivel:"xpto"` faz upsert e retorna `500 erro_interno` (constraint do banco), não `400 nivel_invalido` | ✅ **Morto** — 1 falha: USRREV-04 (50/1) |

**Sensor**: 4 injetados, **4 mortos, 0 sobreviventes**. M1 distingue "não deletou" de M2 "deletou mas não contou", confirmando asserções independentes para efeito e contador.

---

## 3. Gate check

- **Comando**: `npm run lint && npm run typecheck && npm run build && BASE_URL=http://localhost:3000 bash scripts/probes-admin-usuarios.sh`
- **Resultado**: `lint` 0 erros (3 warnings pré-existentes de `<img>`), `typecheck` 0, `build` 0, probes **51 ok / 0 falhas** (servidor de produção `next start` em `:3000`).
- **Contagem de testes**: 51 probes (baseline da suíte antes desta feature: 48 → +3 asserções USRREV líquidas; sem remoção/afrouxamento).
- **Server**: `next-server` de produção reiniciado ao final; `GET /api/admin/usuarios/permissoes` como ADMIN responde 200.

---

## 4. Restauração da matriz (estado compartilhado)

A suíte revoga `SECRETARIA:igrejas` (`nivel:""`), asserta 403 e restaura o nível original (com `trap` no probe). Verificado ao final via API:

```
GET /api/admin/usuarios/permissoes →
  [{'role':'SECRETARIA','module':'igrejas','nivel':'ler'}]
GET /api/admin/igrejas como SECRETARIA → 200
```

✅ Par `SECRETARIA:igrejas` restaurado ao nível `ler`; sem residência de mutantes.

---

## 5. Code quality

| Checagem | Passa? |
| --- | --- |
| Sem features além do pedido | ✅ |
| Sem abstrações para single-use | ✅ |
| Sem "flexibilidade" desnecessária | ✅ |
| Apenas arquivos necessários tocados (`permissoes.ts`, `matrix-editor.tsx`, probes, spec) | ✅ |
| Não "melhorou" código não relacionado | ✅ |
| Segue padrões existentes (upsert `onConflict`, erros `XxxError` via `msg.startsWith`) | ✅ |
| Would senior approve | ✅ |
| Testes mapeiam ACs e são não-superficiais (sensor cobre efeito real) | ✅ (3 gaps de precisão registados) |
| Spec-anchored outcome check | ✅ (3 ⚠️ gaps) |

---

## 6. Gaps residuais (não-bloqueantes)

1. **USRREV-01** — `ok:true` e o tipo de `updated` não assertados; só `removed >= 1` (corpo completo não verificado). Lição **L-016**.
2. **USRREV-05** — corpo `nao_autorizado` do 403 não assertado (só o status). Lição **L-014** (promovida a `confirmed`, recorrência 2).
3. **USRREV-06** — rótulo "—" (`matrix-editor.tsx:143`) não assertado; só o valor `""`. Lição **L-015** (promovida a `confirmed`, recorrência 2).
4. **Edge cases E1/E2/E3** — sem probe dedicado (no-op `removed=0`, payload misto, enum inválido). Lição **L-017**.

---

## 7. Requirement traceability

| Requisito | Status |
| --- | --- |
| USRREV-01..06 | ✅ Verified (6/6) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 6/6 ACs com outcome da spec | 3 spec-precision gaps + 3 edge cases sem probe (não-bloqueantes)
**Sensor**: 4/4 mutantes mortos
**Gate**: 51 ok / 0 falhas
**Sensor baseline**: inalterado (`git status --porcelain` do real idêntico ao pré-sensor)

**O que funciona**: revogação via `nivel:""` deleta a linha e conta `removed`; GET reflete; níveis válidos seguem upsert; inválidos seguem 400 `nivel_invalido`; fail-closed nega acesso após revogar; round-trip revogar→403→restaurar→200.

**Issues encontrados**: nenhum bloqueante. Gaps de precisão/edge cases registados como lições L-014/L-015 (confirmadas) e L-016/L-017 (candidatas).

**Próximos passos**: commitar `validation.md` + `.specs/LESSONS.md` + `.specs/lessons.json`; feature fecha.
