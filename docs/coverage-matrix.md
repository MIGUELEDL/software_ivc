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
| RNF-001, RNF-002, RNF-012 | responsividade mobile-first, identidade IVC, WCAG 2.1 AA | — | — | 🔲 pending |
| RNF-003..RNF-010 | disponibilidade, segurança, LGPD, backup, custo, observabilidade, CI, deploy | — | — | 🔲 pending |
| RN-001.1, RN-002, RN-004, RN-005 | regras de negócio (webhook PIX+cartão financeiro, 1º acesso, auditoria, 1 templo) | — | — | 🔲 pending |

> RF-016 (histórico de doações do membro) foi **removido** por decisão do administrador (2026-09-08).

## Próximos passos

1. Consolidar o inventário RF-001..0NN / RNF-001..0NN aprovado (a Construção acima reflete a revisão de 2026-09-08).
2. Associar o inventário aos IDs desta matriz (preencher coluna Requisito(s) das próximas features com referências reais, sem fabricar IDs).
3. Preencher linhas conforme cada feature da Fase 9 (MVP) for spec'd e verificada.
| RF-031 (validade anual do cartão: ciclo-base 1 ano a partir de batismo/nascimento conforme regra, recalculo por trigger, visual corrente no cartão) | `cartao-valididade-anual` | CART-01..16 | unit+integration+probes (probes 37/0, --domain 4/0, --com-db 38/0, 6 fusos) + gates | ✅ verified |
