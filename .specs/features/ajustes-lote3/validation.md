# ajustes-lote3 — Relatório do Verifier

## Validation: ajustes-lote3 - PASS

**Spec-anchored check**: 18/19 ACs matched spec outcome | 1 spec-precision gap (ANI-05 — tema/360px sem valor assertável; só literal estático)

**Gate**: `scripts/probe-ajustes-lote3.sh` 8 ok / 0; `test:ci` 273/0 (base 243 + 30 novos); typecheck/lint/build verdes (scratch).

**Sensor**: 10 mutations injected, 10 killed, 0 survived. Worktree temporário removido; porcelain real == baseline (` M tsconfig.tsbuildinfo`).

**Diff range**: `9ee3a78..HEAD` (`730c2a4`)

**Evidence (file:line)**: CART-01 `membros-lista-client.test.tsx:43,47-50,78-81`; CART-02 `membros-lista-client.test.tsx:81` + `probe-ajustes-lote3.sh:42,46-47`; CART-03 `src/lib/admin/impressao.test.ts:14-15` + `probe:41`; CART-04 `probe:43-44` (86.7×55mm vs base 85.6mm); CART-05 `imprimir/page.test.ts:30-32,41-42` + `impressao.test.ts:14`; EVT-01 `tasks.md:84` (POST prod → 201) + `probe:21`; EVT-02 `probe:20` + `0027:10-11`; ANI-01 `src/app/page.test.ts:48-49`; ANI-02 `BirthdayBanner.test.tsx:34-37`; ANI-03 `BirthdayBanner.test.tsx:15-18` + `page.test.ts:59`; ANI-04 `BirthdayBanner.test.tsx:46-50`; ANI-06 `probe:62-63` + `0028:10,13`; SEN-01 `alterar-senha/page.test.tsx:45,47-49`; SEN-02 `atualizar-senha/route.test.ts:93-101` + `atualizar-senha-form.test.tsx:55-58`; SEN-03 `atualizar-senha-form.test.tsx:44-47`; SEN-04 `redefinir-senha/route.test.ts:92,101-103,117-127` + `membro-detalhe-acoes.test.tsx:59,67-69,72`; SEN-05 `redefinir-senha/route.test.ts:62-65`; SEN-06 `PasswordInput.test.tsx:27,36-38,44-45`.

**Payload/conjunção**: senha corpo==update (`route.test.ts:101`); force `true`+role (`:102-103`); force `false` exato (atualizar `route.test.ts:96-101`); 403 com zero efeitos colaterais (`redefinir route.test.ts:62-65`); clipboard por valor (`acoes.test.ts:67`); auditoria sem a senha (`route.test.ts:127`).

**Descobertas de raiz (rodadas R1–R3)**: débito de 0 testes comportamentais no lote inicial (R1 FAIL 1/12); probes presence-mirroring com literais satisfeitos por comentários (SECURITY DEFINER, CHECK, fuso, escala); GoTrue de dev rejeita domínio `.local` no `/recover` e faz merge raso de `app_metadata` (flag `force_password_change` sobrevive a PUT sem a chave); `userEvent.setup()` substitui o stub de clipboard do jsdom.

**Result**: PASS
