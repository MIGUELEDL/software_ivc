## Fix mais recente na pipeline

- **Commit `bb3a62f`** — `PIX.key` agora deriva de `CHURCH.cnpj` com `replace(/\D/g, "")` (→ `68683917000171`), conforme Manual de Padrões para Iniciação do PIX/BCB: CNPJ deve ser codificado **sem máscara** no BR Code. Payload final verificado: `00020126360014BR.GOV.BCB.PIX0114686839170001715204000053039865802BR5921IGREJA VIRTUDE CRISTA6011SANTA LUZIA62070503***630420BF` — chave limpa, sem campo 54, CRC OK. *Falha inicial (chave mascarada) detectada em teste real de app bancário pelo administrador.*

---

# Doação PIX Validation

**Date**: 2026-09-08
**Spec**: `.specs/features/doacao-pix/spec.md` (10 ACs, DOACAO-01..10)
**Diff range**: `bc3e769..HEAD` (commits `177e0f4` brcode builder, `6d4c5c3` widget client, `931643c` rota /doacao)
**Verifier**: independent sub-agent (author ≠ verifier, read-only)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| 177e0f4 (PIX lib + chave) | ✅ Done | `src/lib/pix.ts` com `buildBrCode`/`PIX_PAYLOAD`; `PIX.key` em constants (aponta `CHURCH.cnpj`) |
| 6d4c5c3 (widget + dependência) | ✅ Done | `qrcode.react@4.2.0`; `PixDonation.tsx` client (QR + copia-e-cola + botão copiar) |
| 931643c (rota /doacao) | ✅ Done | `src/app/doacao/page.tsx` (Navbar + seção + PixDonation + Footer); `NAV_ITEMS` com `/doacao` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` evidência | Result |
| --------- | -------------------- | --------------------- | ------ |
| DOACAO-01: `/doacao` renderiza QR PIX gerado no app | QR em modo estático | `src/app/doacao/page.tsx:22` (`<PixDonation payload={PIX_PAYLOAD}/>`); live: GET 200 + QR SVG no SSG HTML | ✅ PASS |
| DOACAO-02: BR Code da `PIX.key` CNPJ, decodificável, CRC válido | payload `000201…6304XXXX` com chave exata | `src/lib/pix.ts:36-57`; `src/lib/constants.ts:82` (`CHURCH.cnpj = "68.683.917/0001-71"`); live: `00020126400014BR.GOV.BCB.PIX011868.683.917/0001-71…63046B3D`; CRC `6B3D` verificado por 2 implementações independentes (Node+Python, corpo incl. `6304`) | ✅ PASS |
| DOACAO-03: copia-e-cola renderizado como texto | payload visível + botão | `src/components/PixDonation.tsx:55-58` (`break-all font-mono`) | ✅ PASS |
| DOACAO-04: copiar → clipboard + confirmação | copia e mostra feedback | `PixDonation.tsx:16-25` (try/catch writeText), `:71` "Código copiado!", `:61` `role="alert"` fallback | ✅ PASS |
| DOACAO-05: sem valor fixo (sem campo 54) | QR estático | `pix.ts:44-54` (base sem `54`); probe: ausência de 54; M2 killed | ✅ PASS |
| DOACAO-06: `PIX.key` fonte única | sem literais institucionais nos componentes | `constants.ts:81-82` (`PIX.key = CHURCH.cnpj`); `page.tsx:18`/`PixDonation.tsx:42` usam `CHURCH.name`; M6 killed | ✅ PASS |
| DOACAO-07: item "Doação"→`/doacao` no navbar+footer | navegação | `constants.ts:66`; `Navbar.tsx:78,110`; `Footer.tsx:64`; anchors `/doacao` presentes 2× no HTML servido | ✅ PASS |
| DOACAO-08: acessível por teclado com nome acessível | WCAG 2.1 AA | `PixDonation.tsx:65-72` (`<button type="button">`+focus-visible), `:42-43` (`aria-label`+`role="img"` no QR), `:55` (`aria-live`), `:61` (`role="alert"`) | ✅ PASS |
| DOACAO-09: responsivo mobile-first | classes `sm:/md:/lg:` | `page.tsx:11-14`; `PixDonation.tsx:28` (`grid md:grid-cols-2`), `:33,49` (`p-8 sm:p-10`) | ✅ PASS |
| DOACAO-10: gates verdes | lint+typecheck+build | worktree `931643c`: lint 0 err (2 warnings pré-existentes SocialLinks), typecheck clean, build green (`○ /doacao` SSG) | ✅ PASS |

**Status**: ✅ 10/10 ACs — 0 spec-precision gaps.

---

## Discrimination Sensor

Roda em git worktree isolado descartado ao final (para `payment` a profundidade foi P0-full). Baseline do tree real preservado (`git status --porcelain` == `?? .specs/features/doacao-pix/`; `git diff HEAD -- src/` vazio).

| Mutation | Local | Probe que mata | Result |
| -------- | ----- | -------------- | ------ |
| M1 | chave PIX com dígito errado (`…72`) | parse TLV payload: MAI key ≠ `…71` | ✅ Killed |
| M2 | adicionar campo 54 (`540510.00`) | probe: "field 54 present but MUST be absent" | ✅ Killed |
| M3 | CRC constante `0000` | CRC calculado `6B3D` ≠ declarado `0000` | ✅ Killed |
| M4 | clipboard fora do try/catch | denegação escapa como unhandled rejection (crash); sem `role="alert"` | ✅ Killed |
| M5 | remover `/doacao` do NAV_ITEMS | rebuild+curl: 0 `href="/doacao"` no HTML servido | ✅ Killed |
| M6 | literal institucional hardcoded no componente | probe fonte-única: literal presente, sem import/interpolação `CHURCH` | ✅ Killed |

**Result**: 6/6 killed — ✅ PASS (0 sobreviventes)

---

## Dynamic Behavior Check (rotas reais)

- `GET /doacao` → **200**; HTML contém QR SVG (`role="img"`, `aria-label="QR Code PIX de Igreja Virtude Cristã"`), payload copia-e-cola (`break-all font-mono`), `aria-live="polite"`, botão "Copiar código PIX" (`type="button"`), nav+footer `href="/doacao"` (2×)
- Payload servido: `00020126400014BR.GOV.BCB.PIX011868.683.917/0001-715204000053039865802BR5921IGREJA VIRTUDE CRISTA6011SANTA LUZIA62070503***63046B3D`

---

## Interactive UAT Results

Não aplicável (página estática sem formulário/estado complexo); comportamento validado por rotas reais (curl) + probe interativo (jsdom) do botão copiar.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (lib pura PIX + 1 componente client + 1 página fina; sem abstrações desnecessárias) |
| Surgical changes | ✅ (commits atômicos: lib / widget+dependência / rota) |
| No scope creep | ✅ (sem formulário de valor, sem QR dinâmico, sem integração MP) |
| Matches patterns | ✅ (mesmo look-and-feel e tokens das demais páginas) |
| Spec-anchored outcome check | ✅ (10/10 com evidência de linha + comportamento dinâmico) |
| Fonte única preservada | ✅ (`PIX.key` aponta `CHURCH.cnpj`; nome/cidade de `CHURCH`) |
| Documented guidelines seguidos | `tlc-spec-driven` + AGENTS.md | ✅ |

---

## Edge Cases

- [x] Chave PIX com máscara CNPJ (`68.683.917/0001-71`) — usada exata no MAI 01
- [x] Acentos/espaços no nome/cidade → projeção `project()` (remove acentos, uppercase, truncar 25/15)
- [x] Falha no clipboard → `role="alert"` com fallback, sem throw
- [x] Sem campo valor (54) — QR estático (RN-001)

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build` (Node v22.23.2 via nvm, worktree `931643c`)
- **Result**: 3 passed, 0 failed; adicionalmente curl `/doacao` → 200 e probe TLV/CRC
- **Test count**: 0 unit (repo sem test runner até a F10); verificação = probes estáticos (10 ACs) + sensor (6) + rotas dinâmicas (2: server + HTML content)
- **Skipped**: nenhum

---

## Fix Plans

Nenhum — 0 gaps na iteração inicial.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RF-007 (doação/oferta QR PIX público) | 🔲 pending | ✅ verified (DOACAO-01..05) |
| RN-001 (portal: QR PIX apenas, sem cartão) | 🔲 pending | ✅ verified (DOACAO-02, DOACAO-05) |
| RNF-011 (fonte única) | already verified | ✅ verified (DOACAO-06) |
| RNF-012 (WCAG 2.1 AA) | 🙈 pending | ✅ verified (DOACAO-08) |
| RNF-001 (mobile-first) | 🙈 pending | ✅ verified (DOACAO-09) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 6/6 mutations killed (P0-full for payment)
**Gate**: 3/3 passed + rota dinâmica `GET /doacao` → 200 com QR/payload/nav corretos

**What works**: rota pública `/doacao` com QR PIX gerado no app a partir da chave oficial (CNPJ `68.683.917/0001-71`); payload BR Code validado estruturalmente e por CRC independente; copia-e-cola com botão "Copiar" + fallback acessível; item "Doação" no navbar e footer; fonte única mantida.

**Issues found**: nenhum (observações não-bloqueantes do verifier: spec/context ainda não commitados; nuance de a11y na notificação de copiar — plateada para pass futuro).

**Next steps**: commitar `validation.md` + matriz (`RF-007/RN-001` → `verified`) + Handoff, commit final (incluindo spec/context), push; avançar para F3+ (próxima feature do roadmap F9).