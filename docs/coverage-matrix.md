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

| Requisito(s) | Feature | Spec ACs | Teste / Gate | Status |
| ------------ | ------- | -------- | ------------ | ------ |
| RNF-011 (conteúdo institucional fidedigno, fonte única) | `sobre-dados-institucionais` | DADOS-01..09 | probes por AC + `npm run lint && npm run typecheck && npm run build` | ✅ verified |

## Próximos passos

1. Consolidar o inventário RF-001..044 / RNF-001..012 de volta do checkpoints da F1 em `docs/REQUIREMENTS.md` (Fase 8).
2. Associar o inventário aos IDs desta matriz (preencher coluna Requisito(s) das próximas features com referências reais, sem fabricar IDs).
3. Preencher linhas conforme cada feature da Fase 9 (MVP) for spec'd e verificada.