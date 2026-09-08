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
| RF-001, RF-002, RF-003, RF-004, RF-005 | portal público (sobre/história/MVV, liderança, localização, cultos, redes) | — | — | 🔲 pending |
| RF-006, RF-007 | portal público (eventos→WhatsApp, doação QR PIX) | — | — | 🔲 pending |
| RF-008, RF-011, RF-031 | autenticação e RBAC (login admin/membro, 1º acesso senha-ID) | — | — | 🔲 pending |
| RF-012, RF-013, RF-014, RF-015 | painel membro (avisos, QR dízimo, cartão, minhas informações) | — | — | 🔲 pending |
| RF-021..RF-030 | painel administrativo (dashboard, membros, igrejas, eventos, patrimônio, financeiro, relatórios, usuários, configurações, auditoria) | — | — | 🔲 pending |
| RF-032 | matriz de permissões por papel (ler/escrever/administrar) | — | — | 🔲 pending |
| RNF-001, RNF-002, RNF-012 | responsividade mobile-first, identidade IVC, WCAG 2.1 AA | — | — | 🔲 pending |
| RNF-003..RNF-010 | disponibilidade, segurança, LGPD, backup, custo, observabilidade, CI, deploy | — | — | 🔲 pending |
| RN-001, RN-001.1, RN-002..RN-005 | regras de negócio (PIX apenas no MVP, 1º acesso, evento→WhatsApp, auditoria, 1 templo) | — | — | 🔲 pending |

> RF-016 (histórico de doações do membro) foi **removido** por decisão do administrador (2026-09-08).

## Próximos passos

1. Consolidar o inventário RF-001..0NN / RNF-001..0NN aprovado (a Construção acima reflete a revisão de 2026-09-08).
2. Associar o inventário aos IDs desta matriz (preencher coluna Requisito(s) das próximas features com referências reais, sem fabricar IDs).
3. Preencher linhas conforme cada feature da Fase 9 (MVP) for spec'd e verificada.