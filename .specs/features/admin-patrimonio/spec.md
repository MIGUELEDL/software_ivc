# Patrimônio (RF-025) Specification

## Problem Statement

O painel administrativo não tem inventário de bens da igreja. A RF-025 entrega o
módulo `patrimonio` da matriz de permissões (RF-032 — seed já presente em 0008:
`PATRIMONIAL` escreve, `SECRETARIA`/`FINANCEIRO`/`LIDER` leem, `ADMIN`/
`SUPER_ADMIN` administram): tabela `assets` (prevista em `DATABASE.md:61`) com RLS
enraizado em `can_access('patrimonio', ...)`, CRUD administrativo em
`/admin/patrimonio`, ciclo de vida por soft-delete (`status` INATIVO = baixa), e
navegação no dashboard admin. Patrimônio é **admin-only** (inventário interno; sem
exposição no portal público), e o dashboard admin ganha os cards de "Eventos" e
"Patrimônio" (Eventos ficou sem card na RF-024 — lacuna corrigida aqui).

## Goals

- [ ] Tabela `assets` (nome, categoria, nº tombo, localização, valor/data de aquisição, responsável, status, observações) com RLS por `can_access('patrimonio', ...)` **sem SELECT público** (``anon`` não vê; inventário interno)
- [ ] CRUD admin em `/admin/patrimonio` com guards da matriz (ler/escrever)
- [ ] Baixa por soft-delete (`status='INATIVO'`), sem hard-delete (histórico preservado)
- [ ] Categoria por **enum fixo** (`AUDIO`, `VIDEO`, `INSTRUMENTO`, `MOBILIA`, `EQUIPAMENTO`, `RELIGIOSO`, `OUTRO`) validado no app e no SQL
- [ ] Dashboard admin com cards "Eventos" e "Patrimônio" (regressão RF-024 + nova navegação)
- [ ] Probes discriminativos por papel (L-006..L-008) + seed de usuário `patrimonial.teste`

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Exposição de patrimônio no portal público | Decisão do usuário: inventário interno (admin-only) |
| Foto/imagem do bem | Campos mínimos (decisão do usuário) |
| Tabela de categorias com CRUD | Decisão do usuário: enum fixo no app |
| Responsável com FK para `members` | Decisão do usuário: texto livre |
| Depreciação / valor contábil | RF-025 é inventário; valor é apenas registro de aquisição |
| Hard-delete de bem | Decisão do usuário: só soft-delete (baixa) |
| Auditoria persistida de negativas | RF-030; log do servidor (matriz atual) |
| Web/publicação de bens em relatórios | RF-027; fora deste módulo |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Campos do bem | Inventário completo: `name`, `category`, `numero_patrimonio`, `location`, `acquisition_value`, `acquisition_date`, `responsible`, `status`, `observations` (valor/data/responsável/observações opcionais) | Decisão do usuário | y |
| Ciclo de vida | Soft-delete por `status` `ATIVO`/`INATIVO` (INATIVO = baixa); sem hard-delete | Decisão do usuário; padrão líderes/eventos | y |
| Acesso | Admin-only: RLS SELECT **sem** `anon`; escrita por `can_access('patrimonio','escrever')` | Decisão do usuário (inventário interno) | y |
| Categoria | Enum fixo `AUDIO`/`VIDEO`/`INSTRUMENTO`/`MOBILIA`/`EQUIPAMENTO`/`RELIGIOSO`/`OUTRO` com CHECK no SQL e validação no app | Decisão do usuário | y |
| Responsável / valor | `responsible` text livre; `acquisition_value` numeric + `acquisition_date` date, ambos opcionais | Decisão do usuário | y |
| Radar | Dashboard admin ganha cards "Eventos" + "Patrimônio" (lacuna RF-024 corrigida) | Decisão do usuário | y |
| Ordenação da lista | `name` asc (inventário alfabético) | Listagem administrativa por nome | y |
| `numero_patrimonio` (tombo) | Obrigatório não-vazio? → **opcional** mas único quando preenchido (índice único parsial) | Igrejas/sedes têm numeração própria; evita churn de integração | y |
| DELETE | Sem policy de DELETE; `PATCH status INATIVO` registra baixa | Mesmo padrão de `leaders`/`events` | y |
| Seed | 1 bem exemplo (Kit de Som, `AUDIO`) + usuário `patrimonial.teste@ivc.local` (`PATRIMONIAL`) | Discrimina o ramo `escrever` do can() nos probes e dá conteúdo à lista | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P0: Gestão de patrimônio (`assets`) ⭐ MVP

**User Story**: Como o responsável pelo patrimônio (papel `PATRIMONIAL`), quero
cadastrar, editar e dar baixa nos bens da igreja, para manter o inventário
atualizado; como papel leitor (SECRETARIA/FINANCEIRO/LIDER), quero consultá-los.

**Why P0**: Inventário é a fonte do módulo; leitura restrita ao painel preserva o
caráter interno do patrimônio.

**Acceptance Criteria** (EARS):

1. O sistema SHALL manter uma tabela pública `assets` com colunas `id`, `name`, `category` (CHECK em `AUDIO`, `VIDEO`, `INSTRUMENTO`, `MOBILIA`, `EQUIPAMENTO`, `RELIGIOSO`, `OUTRO`), `numero_patrimonio` (nullable, único quando preenchido), `location`, `acquisition_value` (nullable), `acquisition_date` (nullable), `responsible`, `status` (`ATIVO`/`INATIVO`), `observations`, `created_at` e `updated_at`. <!-- ubiquitous -->
2. O sistema SHALL restringir leitura (SELECT) de `assets` a sessões `authenticated` com `can_access('patrimonio','ler')` — sem role `anon` (inventário interno). <!-- ubiquitous -->
3. O sistema SHALL restringir escrita (INSERT/UPDATE) em `assets` a sessões `authenticated` com `can_access('patrimonio','escrever')`, e SHALL não conceder DELETE direto (baixa por `status`). <!-- ubiquitous -->
4. WHEN `POST /api/admin/assets` recebe dados válidos de uma sessão com `can('patrimonio','escrever')` THEN o sistema SHALL criar o bem com `status='ATIVO'` e responder `201`. <!-- event-driven -->
5. WHEN `POST /api/admin/assets` recebe dados inválidos (nome vazio, categoria fora do enum, valor inválido, data inválida, status inválido) THEN o sistema SHALL responder `400` com `{error:"dados_invalidos", campos}`, discriminando cada campo. <!-- event-driven -->
6. WHEN `POST /api/admin/assets` é chamado sem sessão ou por papel sem escrita em `patrimonio` (ex.: `SECRETARIA`, `FINANCEIRO`, `LIDER`, `MEMBRO`) THEN o sistema SHALL responder `401`/`403` e registrar a negativa no log. <!-- event-driven -->
7. WHILE uma sessão com `can('patrimonio','ler')` acessa `GET /api/admin/assets` THEN o sistema SHALL listar bens ordenados por `name` asc (incluindo `status='INATIVO'`) e responder `200`. <!-- ubiquitous -->
8. WHEN `PATCH /api/admin/assets/[id]` recebe dados válidos de uma sessão com `can('patrimonio','escrever')` THEN o sistema SHALL atualizar apenas os campos enviados (incluindo `status`) e responder `200`. <!-- event-driven -->
9. WHEN `PATCH /api/admin/assets/[id]` referencia id inexistente THEN o sistema SHALL responder `404` com `{error:"nao_encontrado"}`. <!-- event-driven -->
10. WHEN `PATCH /api/admin/assets/[id]` define `status='INATIVO'` THEN o sistema SHALL marcar o bem como baixado (soft-delete) e SHALL não removê-lo fisicamente. <!-- event-driven -->
11. WHEN uma sessão `anon` ou sem `can('patrimonio','ler')` tenta ler `assets` (SQL direto ou API admin) THEN o sistema SHALL devolver vazio/`403` sem expor dados do inventário. <!-- event-driven -->
12. WHEN um ADMIN/SUPER_ADMIN acessa `/admin` THEN o sistema SHALL exibir cards de navegação para "Eventos" (`/admin/eventos`) e "Patrimônio" (`/admin/patrimonio`). <!-- event-driven -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PAT-01 | P0: Assets (schema + enum) | - | Done (T1 — migration 0013) |
| PAT-02 | P0: Assets (SELECT admin-only) | - | Done (T1 — RLS sem anon, MCP) |
| PAT-03 | P0: Assets (write, sem DELETE) | - | Done (T1 — policies INSERT/UPDATE, sem DELETE) |
| PAT-04 | P0: Assets (POST 201) | - | Pending |
| PAT-05 | P0: Assets (POST 400 por campo) | - | Pending |
| PAT-06 | P0: Assets (POST 401/403) | - | Pending |
| PAT-07 | P0: Assets (GET list name asc) | - | Pending |
| PAT-08 | P0: Assets (PATCH 200 parcial) | - | Pending |
| PAT-09 | P0: Assets (PATCH 404) | - | Pending |
| PAT-10 | P0: Assets (PATCH INATIVO baixa) | - | Done (T1 — DB: CHECK status inclui INATIVO, sem DELETE; rota PATCH em T4) |
| PAT-11 | P0: Assets (anon/leitor não lê) | - | Done (T1 — DB: anon_count=0, sem policy anon; API em T3) |
| PAT-12 | P0: Dashboard (cards Eventos+Patrimônio) | - | Pending |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️

## External Interfaces

- **Admin**: `/admin/patrimonio` (lista), `/admin/patrimonio/nova`, `/admin/patrimonio/[id]` (detalhe/edição/baixa).
- **API**: `POST`/`GET` `/api/admin/assets`; `PATCH` `/api/admin/assets/[id]`.
- **DB**: tabela `assets` (migration 0013); sem storage (sem fotos).
- **Dashboard**: `/admin` lista cards `Eventos` → `/admin/eventos` e `Patrimônio` → `/admin/patrimonio`.

## Non-Functional Acceptance Criteria

- **Nível de segurança**: negativas de RBAC registradas no log do servidor (`negarPermissao`); inventário nunca exposto a `anon`.
- **Gates determinísticos**: `validate_spec.py`, `validate_tasks.py`, `validate_state.py`, `check_commit.py`, lint/typecheck/build.
- **Verificação**: probes `scripts/probes-admin-patrimonio.sh` discriminando por papel (escritor `patrimonio` — PATRIMONIAL — vs leitor vs `MEMBRO`; `anon` não lê), regressões `probes-admin-eventos.sh`, `probes-admin-lideranca.sh`, `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh`; sensor de mutação (máx. 3 iterações).