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
| RF-012, RF-013, RF-014, RF-015 | painel membro (avisos, QR dízimo, cartão, minhas informações) | — | — | 🔲 pending |
| RF-021..RF-030 | painel administrativo (dashboard, membros, igrejas, eventos, patrimônio, financeiro, relatórios, usuários, configurações, auditoria) | — | — | 🔲 pending |
| RF-032 | matriz de permissões por papel (ler/escrever/administrar) | — | — | 🔲 pending |
| RNF-001, RNF-002, RNF-012 | responsividade mobile-first, identidade IVC, WCAG 2.1 AA | — | — | 🔲 pending |
| RNF-003..RNF-010 | disponibilidade, segurança, LGPD, backup, custo, observabilidade, CI, deploy | — | — | 🔲 pending |
| RN-001.1, RN-002, RN-004, RN-005 | regras de negócio (webhook PIX+cartão financeiro, 1º acesso, auditoria, 1 templo) | — | — | 🔲 pending |

> RF-016 (histórico de doações do membro) foi **removido** por decisão do administrador (2026-09-08).

## Próximos passos

1. Consolidar o inventário RF-001..0NN / RNF-001..0NN aprovado (a Construção acima reflete a revisão de 2026-09-08).
2. Associar o inventário aos IDs desta matriz (preencher coluna Requisito(s) das próximas features com referências reais, sem fabricar IDs).
3. Preencher linhas conforme cada feature da Fase 9 (MVP) for spec'd e verificada.