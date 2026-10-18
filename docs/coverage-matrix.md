# Matriz de Cobertura — RF/RNF → Spec → Teste → Status

Rastreabilidade entre requisitos (Fase 1: RF-001..044, RNF-001..012) e as features
spec-driven. **Regra**: nenhuma feature é declarada pronta sem linha nesta matriz com
status `verified`, respaldada por `validation.md` no respectivo `.specs/features/`.

## Formato

| Requisito(s) | Feature (`.specs/features/`) | Spec ACs | Teste / Gate | Status |
| ------------ | ----------------------------- | -------- | ------------ | ------ |
| `RF-NNN`     | `nome-da-feature`             | `DADOS-01..09` | probes estáticos + lint/typecheck/build | ✅ verified |

## Legenda de status

- 🔲 `pending` — requisito ainda não possui spec
- 🔧 `in progress` — spec aprovada, implementação em curso
- ✅ `verified` — `validation.md` PASS no gate determinístico (`validate_state.py`)

## Registro atual

### Fase 8 (verificado)

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RNF-011 (conteúdo institucional fidedigno, fonte única) — inclui WhatsApp D4 (ADR-010), CNPJ e fundação (ADR-011) | `sobre-dados-institucionais` | DADOS-01..11 | probes por AC + `npm run lint && npm run typecheck && npm run build` | ✅ verified |

### Fase 9 (MVP) — inventário aprovado, aguardando spec de cada feature

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RF-001, RF-002, RF-003, RF-004, RF-005 (portal público: sobre/MVV; liderança; localização; cultos; redes), RNF-001, RNF-012 | `portal-home` | HOME-01..12 | probes por AC + `npm run lint && npm run typecheck && npm run build` | ✅ verified |
| RF-006, RN-003 (eventos: listagem + detalhe → WhatsApp pré-preenchido) | `eventos` | EVENTOS-01..10 | probes por AC + gates + rotas dinâmicas (200/404/estado vazio) | ✅ verified |
| RF-007, RN-001 (doação: QR PIX público estático, sem cartão) | `doacao-pix` | DOACAO-01..10 | probes por AC + gates + rota dinâmica (200/QR/payload/nav) | ✅ verified |
| RF-008, RF-011, RF-031, RN-002 (1º acesso senha-ID), AD-013 | `auth` | AUTH-01..19 | probes por AC (`scripts/probes-auth.sh`, 19 checks) + `npm run lint && npm run typecheck && npm run build` | ✅ verified |
| RF-012, RF-013, RF-014, RF-015 | painel membro (avisos, QR dízimo, cartão, minhas informações) | PAINEL-01..19 | probes por AC (`scripts/probes-painel.sh`, 27 ok/0 falhas) + gates | ✅ verified |
| RF-022 (membros CRUD: cadastro com conta auth e senha-ID, edição, ciclo de vida ATIVO/INATIVO/TRANSFERIDO, hard-delete restrito, documentos, RBAC escritor/leitor), AD-013 | `admin-membros` | ADMINMEM-01..39 | probes por AC (`scripts/probes-admin-membros.sh`, 139 ok/0 falhas; suite ampliada p/ RF-032) + gates | ✅ verified |
| RF-023 | igrejas/liderança: Full CRUD de igrejas (delete só SUPER_ADMIN), líderes soft-delete, foto 2MB, portal DB-driven | IGR-01..25 | probes por AC (`scripts/probes-admin-lideranca.sh`, 102 ok/0 falhas) + regressões membros 139/0, painel 27/0, auth 19/0 + gates | ✅ verified |
| RF-024, RN-003 (eventos: CRUD admin com visibilidade + soft-delete, portal DB-driven → WhatsApp pré-preenchido) | `admin-eventos` | EVT-01..16 | probes por AC (`scripts/probes-admin-eventos.sh`, 71 ok/0 falhas) + regressões liderança 102/0, membros 139/0, painel 27/0, auth 19/0 + gates + rotas dinâmicas | ✅ verified |
| RF-025 (patrimônio: inventário admin-only com soft-delete, RLS sem anon, cards Eventos+Patrimônio no dashboard) | `admin-patrimonio` | PAT-01..12 | probes por AC (`scripts/probes-admin-patrimonio.sh`, 67 ok/0 falhas) + regressões eventos 71/0, liderança 102/0, membros 139/0, painel 27/0, auth 19/0 + gates | ✅ verified |
| RF-026 (financeiro: lançamentos CRUD com validação por campo, webhook MP stub idempotente, fechamento de caixa snapshot imutável, RLS can_access sem anon) | `admin-financeiro` | FIN-01..12 | probes por AC (`scripts/probes-admin-financeiro.sh`, 99 ok/0 falhas, Bloco verifier: asserts exatos AC-22/23, e2e AC-8, negativo AC-17, filtros AC-26, empty AC-29, preview server-side AC-21) + regressões eventos 71/0, liderança 102/0, membros 139/0, patrimônio 67/0, painel 27/0, auth 19/0 + gates + card Financeiro/RF-021 no dashboard | ✅ verified |
| RF-021 (dashboard: metric cards com contagens, feed de atividade recente, resumo financeiro expandido com top 3 categorias, layout grid responsivo max-w-6xl) | `admin-dashboard` | DASH-01..20 | probes por AC (`scripts/probes-admin-dashboard.sh`, 19 ok/0 falhas) + regressões auth 19/0 + gates | ✅ verified |
| RF-028 (usuários/permissoes RBAC: listagem auth users, criar/editar papel/resetar senha, matriz permissões editável SUPER_ADMIN, guards administrar por módulo) | `admin-usuarios` | USR-01..32 | probes por AC (`scripts/probes-admin-usuarios.sh`, 51 ok/0 falhas) + regressões auth 19/0 + gates | ✅ verified |
| RF-028, AD-026 (exclusão de usuários admin: hard delete só de contas criadas pelo painel via marcador `app_metadata.criado_por_admin`; 403 auto/SUPER/sistema; 409 vínculos; 204 + auditoria append-only) | `admin-usuarios-exclusao` | USREX-01..17 | probes por AC (`scripts/probes-admin-usuarios.sh`, 51 ok/0 falhas; 404/SUPER/auditoria/deletable/render/409/contrato do botão) + regressões admin-usuarios 51/0, auth 19/0 + gates | ✅ verified |
| RF-028, AD-027 (matriz de permissões: revogar acesso via `nivel: ""` → DELETE da linha; resposta `{ok,updated,removed}`; sem guarda anti-lockout) | `admin-usuarios-matriz-revogar` | USRREV-01..06 | probes por AC (`scripts/probes-admin-usuarios.sh`, 51 ok/0 falhas; revogar→GET ausente→403→restaurar→200, + nível inválido 400) + sensor 4/4 mutantes mortos + gates | ✅ verified |
| RF-027 (relatórios/documentos: exportação CSV por módulo + período, upload/download/delete documentos categorizados, bucket privado signed URL 60s, RBAC can_access relatorios) | `admin-relatorios` | REL-01..23 | probes por AC (`scripts/probes-admin-relatorios.sh`, 89 ok/0 falhas) + regressões auth 19/0 + gates | ✅ verified |
| RF-032, AD-015 | matriz de permissões por papel (ler/escrever/administrar), fonte única `permissions` + `can_access()`/`can()` | MATRIZ-01..20 | probes por AC (`scripts/probes-admin-membros.sh`, 139 ok/0 falhas + regressões painel 27/0 e auth 19/0) + gates + sensor 5/5 | ✅ verified |
| RF-029 (configurações: settings table key-value JSONB, admin page 5 seções com view/edit, RBAC configuracoes:administrar, fallback constants.ts, seed 18 configs) | `admin-configuracoes` | CFG-01..25 | probes por AC (`scripts/probes-admin-configuracoes.sh`, 29 ok/0 falhas) + regressões auth 19/0 + gates | ✅ verified |
| RF-012 (cartão do membro: barcode Code 128 real da matrícula em vez do gradiente decorativo fixo; print ID-1) | `barcode-membro` | BRC-01..05 | probes por AC (`scripts/probe-barcode.sh`, 7 ok/0 falhas; tier SSR atesta degradação por RangeError/matrícula ausente) + sensor 5/5 mutantes mortos + gates + CI (`npm run probe:barcode`) | ✅ verified |
| RF-030 (auditoria: trilha append-only `audit_logs`, registrarAuditoria/listarAuditoria com filtros e paginação, página read-only, RBAC auditoria:ler, instrumentação dos handlers admin) | `admin-auditoria` | AUD-01..18 | probes por AC (`scripts/probes-admin-auditoria.sh`, 74 ok/0 falhas; harness executa service com stub de @/lib/supabase/server e route GET/POST com stubs) + sensor 17/17 mutantes mortos + gates + validate_tasks 0 erros + CI (`npm run probe:admin-auditoria`) | ✅ verified |
| RF-031 (validade anual do cartão: ciclo-base 1 ano a partir de batismo/nascimento conforme regra, recalculo por trigger, visual corrente no cartão) | `cartao-valididade-anual` | CART-01..16 | unit+integration+probes (probes 37/0, --domain 4/0, --com-db 38/0, 6 fusos) + gates | ✅ verified |
| RNF-001, RNF-002, RNF-012 | responsividade mobile-first, identidade IVC, WCAG 2.1 AA | — | — | 🔲 pending (slice landing ✅ em `responsivo-mobile-landing` abaixo; admin em slice futura) |
| RNF-003..RNF-010 | disponibilidade, segurança, LGPD, backup, custo, observabilidade, CI, deploy | — | — | 🔲 pending |
| RN-001.1, RN-002, RN-004, RN-005 | regras de negócio (webhook PIX+cartão financeiro, 1º acesso, auditoria, 1 templo) | — | — | 🔲 pending |

> RF-016 (histórico de doações do membro) foi **removido** por decisão do administrador (2026-09-08).

### Fase 10 (framework de testes)

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| QA-001 (framework de testes automatizados, runner no CI, PIT contínuo) | `framework-testes` | FWT-01..12 | Vitest 5 suítes de domínio (`code128`/`validade`/`cartao`/`documento`/`pix` + smoke de alias; `npm run test:ci`, 220 ok/0) + StrykerJS `break:100` 100.00% 0 sobreviventes (`npm run test:mutate`) + step `test:ci` no job `tests` do CI + probes intactos (AD-031); Verifier PASS, sensor 5/5 | ✅ verified |

### Fase 11 (observabilidade)

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RNF-008 (Sentry plano free), RNF-003 (health/uptime) | `observabilidade` | OBS-01..13 | Vitest suítes `observability` (release/logger/sentry-init, `npm run test:ci`, 23 ok/0) + `scripts/probe-observabilidade.sh` (13 ok/0: boundary SSR, health runtime exato/405/sem-DSN, adoção webhook) + regressão FIN AC-13..19 verde + throw→500 com DSN real e issue confirmada no dashboard; Verifier R2 PASS, sensor 2/2 | ✅ verified |

### Fase 12 (deploy)

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RNF-009 (CI verde), RNF-010 (deploy c/ aprovação), RC-003 (`*.vercel.app`), RNF-007 (custo ≈ R$ 0) | `deploy-producao` | DEP-01..15 | Push preservado + CI verde; Supabase prod seletivo (zero demo, counts); `scripts/smoke-prod.sh` (9 ok/0 em `[REDACTED_DEPLOYMENT_URL]`: health SHA==HEAD, login admin, zero eventos, Analytics, empty state) + `test:ci` 243/0; Verifier PASS 15/15, sensor 4/4 | ✅ verified |

### Responsividade (slices)

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RNF-001 (parcial: landing) | `responsivo-mobile-landing` | RSP-01..12 | `test:ci` 243/0 + build + probe lideranca (101 ok/1 pré-existente fora do diff) + aceite visual do operador 360px/320px; Verifier PASS, sensor operator-covered | ✅ verified |
| RF-026/RF-022/RF-028/RF-029/RNF-001 (lote painel 13/out) | `painel-ajustes-lote2` | AJ-01..10 | `scripts/probe-painel-ajustes.sh` 6/0 + `test:ci` 243/0 + prova E2E (filtro mês, landing-settings, login/PATCH); Verifier R3 PASS, sensor 6/6 | ✅ verified |
| RF-026/RF-028 (lote ajustes 3 17/out: impressão, eventos, aniversário, senhas) | `ajustes-lote3` | CART-01..05, EVT-01..02, ANI-01..06, SEN-01..06 | `scripts/probe-ajustes-lote3.sh` 8/0 + `test:ci` 273/0 (+30 novos) + prova E2E localhost (banner RPC, impressão 6→4, 403, fpc True→False, POST eventos 201 dev+prod); Verifier R4 PASS, sensor 10/10 | ✅ verified |
| RF-026/RF-028 (lote ajustes 4 18/out: cartão barra, TOTAL 9 tabelas, e-mail detalhe, trocar-senha) | `ajustes-lote4` | AUTH-20..25, TAB-01..04, ADMINMEM-36..37, CART-17..19 | `scripts/probe-ajustes-lote4.sh` 17/0 + `test:ci` 309/0 (+36 novos) + build; Verifier PASS 15/15, sensor 13/13 | ✅ verified |
| RF-026/RF-028 (follow-up 18/out: TOTAL = filtro ativo, faixa padrão usuários nas 9 tabelas; AD-034 reverte decisão B do lote4) | `ajustes-total-filtrado` | TAB-05..07 | `scripts/probe-ajustes-total-filtrado.sh` 19/0 + `test:ci` 309/0 (delta 0) + build; Verifier PASS 7/7, sensor 4/4 | ✅ verified |

## Próximos passos

1. Consolidar o inventário RF-001..0NN / RNF-001..0NN aprovado (a Construção acima reflete a revisão de 2026-09-08).
2. Associar o inventário aos IDs desta matriz (preencher coluna Requisito(s) das próximas features com referências reais, sem fabricar IDs).
3. Preencher linhas conforme cada feature da Fase 9 (MVP) for spec'd e verificada.
