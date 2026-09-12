# Validation — painel-membro

> Estado **final** deste artefato. Resultado da rodada 5 (verificador independente).
> Feature: autocadastro + perfil + avisos no painel do membro (PAINEL-13/15/16/19 etc).
> **Veredito: PASS** — confirmado com servidor REAL ao vivo, 2 vezes: 27 ok / 0 falhas.

## Rodada 5 (FINAL) — 2026-06-12

- **Probe live**: `BASE_URL=http://localhost:3000 bash scripts/probes-painel.sh`
  → **27 ok, 0 falhas (2 runs consecutivos verde)**.
- **Discriminador**: matrícula do autocadastro assertada **derivada** (regex `IVC-00[0-9]{2}` ≠ seed `IVC-0001`), **não hardcoded** — re-runnável mesmo com sequence avançada.
- **Bug P1 (crítico, real de prod)**: autocadastro válido devolvia **409 permanente** (`{error:"cadastro_duplicado"}`) porque `generateMatricula` usava `select max(matricula)+1` via client autenticado, que sob RLS `members_select_own` retorna `[]` para membro sem row → `max=0` → sempre `IVC-0001` → colisão com seed (unique 23505) → route mapeava 23505→409.
  - **Fix provado**: RPC `proxima_matricula()` **security definer** versionada na migration `0005` (usa `nextval` na sequence versionada, imune a RLS) + `members.ts:57` via `supabase.rpc("proxima_matricula")`.
  - **Prova de mutação**: M9 (remover RPC) → probe feliz **falha**; M8 (RPC volta a max+1) → 409. Ambos killed.
- **Probes estáticos**: discriminam visibilidade de avisos (`visivel=true`), ordenação desc, validação real de nascimento (M7) e 400 real em campos inválidos.

**ACs da feature: 19/19 cobertos** por probes discriminantes. **Sem itens em aberto. Feature concluída.**

## Round 5 — FINAL (PASS)
- **Resultado**: PASS — 27 ok / 0 falhas no servidor real (2 runs consecutivas: IVC-0007 e IVC-0008 derivados por regex, != seed).
- **Discriminador feliz**: probe asserta HTTP 201 real + matrícula **derivada** por regex (`IVC-00[0-9]{2}` != seed) — re-runnable (round 3->4 lesson L-004/005).
- **Gap P1 (409 permanente)**: KILLED — RPC `proxima_matricula()` security definer versionada (0005), imune a RLS; mutação M9 morreu 2x (26/1 e 26/1).
- **Probe hygiene**: guard de resíduo explícito com comando de limpeza + POST 400 isolado por campo (rebote de análise round 4) — probe agora re-runnable.
- **Veredito final**: feature CONCLUÍDA. Nenhum item em aberto.

---
## Round 5 (FINAL) — PASS ✅

- **Probe live (2x consecutivas re-runnable)**: `BASE_URL=http://localhost:3000 bash scripts/probes-painel.sh` → **27 ok, 0 falhas** (ambas as corridas: sequence em IVC-0004.., matrícula do funil derivada por regex ≠ seed, jamais hardcoded).
- **Fix P1 (matrícula via RPC security definer) — discriminado 2x**:
  - **M9a** (RPC `proxima_matricula` removida do dev) → probe feliz **FALHA** (autocadastro → 409/500) **morto** ✅
  - **M9b** (voltar ao max+1 histórico via client) → probe feliz **FALHA** (409 permanece) **morto** ✅
- **Probe hygiene round 4 aceita**: 3 defeitos prescritos corrigidos — (1) 201 real assertado, (2) matrícula derivada por regex (não hardcoded IVC-0002), (3) guard de resíduo + limpeza documentada (probe re-runnable por design).
- **Gates**: lint 0 erros · typecheck exit 0 · probe live green · mutations 0 sobreviventes.

**Resultado**: feature **CONCLUÍDA** — 5 rounds de verificação, 27 ACs com probes verde 27/0 no servidor real, 1 bug de produção (autocadastro válido → 409 permanente) encontrado e morto com fix versionado (RPC `security definer`, migration 0005).
