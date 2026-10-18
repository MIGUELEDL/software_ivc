# ajustes-lote4 — Relatório do Verifier

## Validation: ajustes-lote4 - PASS

**Spec-anchored check**: 15/15 ACs matched spec outcome | 0 blocking gaps; 3 non-blocking findings (ver Descobertas)

**Gate**: `scripts/probe-ajustes-lote4.sh` 17 ok / 0; `test:ci` 309/309 (30 files; base 273 + 36 novos em 10 arquivos); lint 0 erros / 5 warnings baseline; typecheck limpo; build sucesso; `validate_spec` 0/0; `validate_tasks` 0 erros (2 WARNs de granularidade aceitos em T4/T5).

**Sensor**: 13 mutações injetadas, 13 mortas, 0 sobreviventes. Worktree temporário removido; porcelain real idêntico ao baseline (` M tsconfig.tsbuildinfo`).

**Diff range**: `c137fa2..HEAD` (`ff52f1c`) — commits `462b955` (style base), `d194f8e` (T1), `e9e4010` (T2), `8d71a8a` (T3), `94cedc7` (T4), `151a274` (T5), `9dff0a2` (T6), `ff52f1c` (T7).

**Evidence (file:line)**:

- **AUTH-20** `src/app/trocar-senha/page.tsx:19-46` + `page.test.ts:39-45` (caixa, botão, sem form)
- **AUTH-21** `page.tsx:20-22` (`isAdminRole ? "/admin" : "/painel"`) + `page.test.ts:41,52-53` (destino por papel)
- **AUTH-22** `src/app/api/auth/trocar-senha/route.ts:75-79,82-84` + `route.test.ts:143-146` (`refreshSession` 1× e após `updateUserById` via `invocationCallOrder`; location `success=1` sem bounce)
- **AUTH-23** `route.ts:10-18` + `route.test.ts:67-81` (307 + `error=weak_password`, sem tocar no client) + `page.test.ts:69-70`
- **AUTH-24** `route.ts:28-32` + `route.test.ts:95-98` (307 + `error=auth_required`) + `page.test.ts:76-77`
- **AUTH-25** preservação: `src/proxy.ts:30-32` inalterado no range; saída do estado testada em `route.test.ts:138-146`
- **TAB-01** `src/components/admin/total-bloco.tsx:20-33`; páginas: eventos `page.tsx:74`, patrimonio `:83`, lideranca `:82`, relatorios `:202`, fechamento `:129`, financeiro `:306`, auditoria `:105`, usuarios `:112`, membros `:168`; probe 9/9 (`probe-ajustes-lote4.sh:22-25`); `total-bloco.test.tsx:17-18`
- **TAB-02** `membros.ts:86-98`, `financeiro.ts:118`, `auditoria.ts:152`, `relatorios.ts:481`, `usuarios.ts:107-109,125` (`totalGeral` antes do filtro de papel); `contar.test.ts:35-36` (head+exact sem filtros), `usuarios.test.ts:40-41` (3 vs 2), `membros/page.test.tsx:39-42` (total 7 com lista 1)
- **TAB-03** `total-bloco.test.tsx:21-26` (0→"0"); `eventos/page.test.tsx:64-66`; `contar.test.ts:72-76`
- **TAB-04** `membros/page.test.tsx:45-54`, `eventos/page.test.tsx:50-57`, `patrimonio/page.test.tsx:50-57`; guards `falha*` nas 9 páginas; `contar.test.ts:66-70` (erro propaga → página omita)
- **ADMINMEM-36** `src/app/admin/membros/[id]/page.tsx:52-66,161-170` + `page.test.tsx:78-79`
- **ADMINMEM-37** `page.tsx:168` (`email ?? "—"`) + `page.test.tsx:91,102`
- **CART-17** `src/components/MemberCard.tsx:219-223` (`min-w-0 truncate text-[2.5cqw]`) + `MemberCard.test.tsx:48-51`
- **CART-18** `MemberCard.test.tsx:57-59` (nome integral + ID visível)
- **CART-19** `MemberCard.tsx:175` + `MemberCard.test.tsx:65-66`

**Payload/conjunção** (discriminadores fortes, verificados pelo sensor):

- `route.test.ts:131-135`: location contém `success=1` **E** não `/painel` **E** não `/admin` — mata redirect-to-portal que satisfaria "há redirect".
- `route.test.ts:143-146`: `refreshSession` **após** `updateUserById` (ordem = bug real do proxy).
- `membros/page.test.tsx:39-42`: total=7 **E** lista filtrada=1 — mata total-queSegue-filtro que satisfaria "bloco existe".
- `usuarios.test.ts:40-41`: `totalGeral` ≠ `total` filtrado.
- `contar.test.ts:35-36`: args exatos de `select("id",{count:"exact",head:true})` — mata filtros embutidos.
- `page.test.ts:44`: caixa sem form — mata "mostrar ambos".

**Descobertas** (nenhuma bloqueante):

1. **AUTH-25 sem asserção direta**: o bloqueio WHILE (`proxy.ts:30-32`) é pré-existente e sem suite própria no repo; no diff a evidência é preservação (proxy intocado) + teste da transição de saída. Risco aceitável por ser AC de preservação fora da superfície do diff.
2. **CART-17 fixture tem 64 chars**, não 80+ como no título do teste/spec; a asserção é sobre classe incondicional (`truncate`), logo o outcome é equivalente — precisão de nomenclatura apenas.
3. **usuarios/page.tsx sem branch `falhaConsulta`**: falha de `listarUsuarios` derruba a página inteira (bloco omitido implicitamente) — satisfaz TAB-04 por mecanismo diferente das demais 8; sem teste RSC da página de usuários (coberto por probe + `usuarios.test.ts`).

**Result**: PASS
