# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Probes de listagem devem afirmar a semantica do conteudo (ordenacao, filtro, estado vazio), nao apenas o status HTTP 200 da pagina.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `probes/routes` · harmful: 0
- features: painel-membro
- evidence: src/lib/painel/avisos.ts:21-25 / M2 / M5 (probes/routes)
- last seen: 2026-09-11T22:12:20Z

### L-002 - Redirects de fluxo com sessao devem ter o alvo completo afirmado em probe (incluindo query params de orientacao), nao apenas o status.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `probes/routes` · harmful: 0
- features: painel-membro
- evidence: src/app/painel/dizimo/page.tsx:33-35 / M3b (probes/routes)
- last seen: 2026-09-11T22:12:20Z

### L-003 - Validacao de formulario exige probe de 400 com erro por campo para cada requisito obrigatorio; remover uma checagem nao pode passar despercebido.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `probes/api` · harmful: 0
- features: painel-membro
- evidence: src/app/api/painel/perfil/route.ts:33-50 / M4 (probes/api)
- last seen: 2026-09-11T22:12:20Z

### L-004 - Recursos Supabase criados via MCP (bucket storage + policies) devem ser versionados em supabase/migrations/ junto com tabelas RLS, ou ambientes novos perdem o comportamento.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `repo-layer/migrations` · harmful: 0
- features: painel-membro
- evidence: supabase/migrations/ (ausencia) / foto/route.ts:55-57 / AD-014 (repo-layer/migrations)
- last seen: 2026-09-11T22:12:20Z

### L-005 - Grep de validacao por campo em probe deve mirar o token especifico de erro (campos.<campo>), nao a substring do nome do campo (ex. 'nascimento'); e o POST runtime de 400 deve isolar cada campo invalido com os demais validos.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `probes/api` · harmful: 0
- features: painel-membro
- evidence: M7 / src/app/api/painel/perfil/route.ts:42-44 / probes-painel.sh:97-100,218-219 (probes/api) (probes/api)
- last seen: 2026-09-12T01:07:31Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
