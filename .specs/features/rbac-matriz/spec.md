# Matriz de Permissões (RBAC) Specification

## Problem Statement

O controle de acesso do portal está duplicado em literais de papel na aplicação
(`src/lib/auth/rbac.ts`), nas policies RLS (`0006_admin_membros.sql`) e no proxy.
Mudar quem acessa um módulo exige alterar código TS e SQL em sincronia — frágil
(uma regressão de role-list foi pega só pelo sensor de mutação da RF-022). A
RF-032 estabelece uma **fonte única** da matriz de permissões no banco
(`permissions`), editável sem deploy, e enraíza a mesma decisão no RLS e nos
guardas da aplicação, com piloto no módulo membros.

## Goals

- [ ] Matriz de permissões (papel × módulo × nível) vive em tabela `permissions` no banco
- [ ] Níveis hierárquicos ler < escrever < administrar, fonte única no banco
- [ ] Decisão igual no banco (`can_access`) e na aplicação (`can`) — piloto no módulo membros
- [ ] Nenhuma regressão de acesso nos papéis seed ao trocar role-lists pela matriz
- [ ] Framework pronto para os módulos RF-023..030 (nascendo já com a matriz)

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| UI de gestão da matriz (editar níveis no painel) | RF-028 (Usuários/Permissões) |
| Aplicação da matriz aos módulos ainda não implementados (igrejas, eventos, etc.) | Enforcement nasce com cada feature; hoje só membros existe |
| Permissão por registro/membro individual (ex.: por igreja) | AD-013: papel global no `app_metadata`; multi-igreja fora do escopo |
| Alteração de papel de usuário / lista de papéis | RF-028; aqui a matriz é definida e seedada |
| Auditoria persistida de negações | RF-030; aqui log do servidor (RN-004) |
| Papéis compostos / herança de papel | Sem requisito; papel único por usuário |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Fonte da matriz | Tabela `permissions` no Postgres, seedada por migração | Decisão do usuário (flexibilidade sem deploy); RF-028 cria a UI | y |
| Níveis hierárquicos | `ler` < `escrever` < `administrar` | Decisão da discussão; um nível maior concede os menores | y |
| Enforcement em duas camadas | RLS via `can_access()` (SECURITY DEFINER) + guardas de app via `can()` | Backstop no banco obrigatório (lição L-006/L-007); app não confia só em RLS | y |
| Hierarquia de leitura da matriz | Qualquer sessão autenticada lê `permissions` (SELECT liberado); escrita só `SUPER_ADMIN` | Dado não sensível (modelo de RBAC); app lê via session/RLS sem service-role | y |
| Seed: módulos internos admin-only | `usuarios`, `configuracoes` e `auditoria` só `ADMIN`/`SUPER_ADMIN`; demais papéis sem linha (sem acesso) | Refinamento da matriz-default confirmada; evita expor gestão/auditoria a papel operacional | y |
| Seed paridade membros | `SECRETARIA` escreve membros; `FINANCEIRO`/`PATRIMONIAL`/`LIDER` leem; `ADMIN`/`SUPER_ADMIN` administram | Reproduz exatamente os role-lists atuais de `0006` (zero regressão no piloto) | y |
| Papel `MEMBRO` | Nenhuma linha na matriz → sem acesso admin; policies de 0001 (`members_*_own`) e `/painel` seguem intactos | Matriz rege o admin; o autocadastro próprio é out of scope aqui | y |
| Fail-closed | Leitura da matriz indisponível → nega acesso | Segurança por padrão: erro não vira permissão | y |
| Substituição das policies 0006 | Migração 0008 recria `members_*_admin` e `docs_*_admin` usando `can_access('membros', ...)` | Fonte única real; role-lists saem do SQL | y |
| Observabilidade | Negativas registradas no log do servidor (sem tabela) | RN-004; RF-030 persiste depois | y |
| Escrita da matriz antes da RF-028 | Via migração/seed e (opcional) autorização SUPER_ADMIN em `permissions` | Sem UI nesta feature | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Fonte única da matriz no banco ⭐ MVP

**User Story**: Como administrador do sistema, quero que a matriz de permissões
viva numa tabela do banco com seed completo, para alterar acessos sem deploy e
ter um modelo consultável.

**Why P1**: É o alicerce do RF-032 — sem fonte única, nada muda.

**Acceptance Criteria** (EARS):

1. O sistema SHALL manter a matriz de permissões na tabela pública `permissions` com colunas `role`, `module` e `nivel` e com chave primária `(role, module)`. <!-- ubiquitous -->
2. O sistema SHALL aceitar somente os valores `ler`, `escrever` ou `administrar` na coluna `nivel` (check constraint). <!-- ubiquitous -->
3. O sistema SHALL restringir a escrita (INSERT/UPDATE/DELETE) em `permissions` a sessões com papel `SUPER_ADMIN`. <!-- ubiquitous -->
4. O sistema SHALL permitir que qualquer sessão autenticada leia a tabela `permissions` (SELECT via RLS). <!-- ubiquitous -->
5. WHEN uma migração aplica o seed da matriz THEN o sistema SHALL gravar os 48 pares `(papel, module, nivel)` decididos (tabela em anexo) idempotentemente, sem duplicar linhas em re-aplicação. <!-- event-driven -->

**Independent Test**: Consultar `permissions` via MCP list_tables/SQL — schema correto, 48 linhas seed, check de `nivel`; sessão `MEMBRO` lê mas não escreve; re-aplicar o seed não duplica.

---

### P1: Decisão única e hierárquica (can_access + can) ⭐ MVP

**User Story**: Como desenvolvedor, quero que banco e aplicação decidam o mesmo
acesso a partir da mesma tabela, para eliminar as role-lists duplicadas.

**Why P1**: Sem isso a matriz é só mais uma camada, não a fonte única.

**Acceptance Criteria**:

1. O sistema SHALL tratar os níveis como hierárquicos — `ler` < `escrever` < `administrar` — concedendo qualquer nível solicitado igual ou inferior ao nível do papel no módulo. <!-- ubiquitous -->
2. O sistema SHALL negar acesso quando não existir linha de permissão para o par `(papel, módulo)` consultado. <!-- ubiquitous -->
3. O sistema SHALL usar a função `can_access(module, nivel)` (SECURITY DEFINER, papel do JWT via `auth_role()`, leitura de `permissions`) como decisão nas policies RLS dos módulos. <!-- ubiquitous -->
4. O sistema SHALL usar um helper `can(papel, module, nivel)` no código do servidor que avalia a mesma tabela `permissions`. <!-- ubiquitous -->
5. IF a consulta a `permissions` falhar (erro de banco, indisponibilidade) THEN o sistema SHALL negar o acesso (fail-closed), sem conceder por padrão. <!-- unwanted-behavior -->
6. O sistema SHALL não manter listas de papéis hard-coded nos dois lados da decisão — apenas a tabela `permissions` define o acesso nos guardas de app e nas policies RLS. <!-- ubiquitous -->

**Independent Test**: `psql`/MCP: `can_access('membros','ler')` com os papéis seed retorna conforme a matriz; linha removida → false; nível `escrever` concede `ler` mas não `administrar`.

---

### P1: Piloto no módulo membros ⭐ MVP

**User Story**: Como liderança, quero que o acesso de membros continue idêntico
hoje, mas agora decidido pela matriz, para validar a matriz sem quebra de uso.

**Why P1**: Prova real na única camada existente; regressão explícita dos papéis seed.

**Acceptance Criteria**:

1. O sistema SHALL adotar nas policies RLS de `members` as decisões `can_access('membros','ler')` (select), `can_access('membros','escrever')` (insert/update) e `can_access('membros','administrar')` (delete). <!-- ubiquitous -->
2. O sistema SHALL adotar nas policies RLS de `member_documents` as decisões `can_access('membros','ler')` (select) e `can_access('membros','escrever')` (insert/delete). <!-- ubiquitous -->
3. O sistema SHALL avaliar nos guardas dos route handlers `/api/admin/membros` a escrita via `can('membros','escrever')` e o hard-delete via `can('membros','administrar')`. <!-- ubiquitous -->
4. WHEN uma sessão `SECRETARIA` (escrever em membros) envia `POST /api/admin/membros` com dados válidos THEN o sistema SHALL responder `201` com a senha-ID (regressão explícita). <!-- event-driven -->
5. WHEN uma sessão `FINANCEIRO` (ler em membros) envia uma ação de escrita de membros THEN o sistema SHALL responder `403`. <!-- event-driven -->
6. WHEN uma sessão `ADMIN` (administrar em membros) executa o hard-delete THEN o sistema SHALL seguir as regras vigentes (`204` sem documentos; `404` inexistente; `409` com documentos). <!-- event-driven -->
7. WHEN uma sessão `MEMBRO` tenta uma leitura do admin de membros THEN o sistema SHALL negar (RLS false no banco; `403`/redirect na app). <!-- event-driven -->
8. O sistema SHALL manter as policies de `0001` (`members_*_own`), o `/painel` próprio e o autocadastro do papel `MEMBRO` inalterados (a matriz não afeta dados próprios do membro). <!-- ubiquitous -->

**Independent Test**: Probes do admin (106 ok) com papéis seed — mesmo comportamento; novos checks: escrita FINANCEIRO → 403; `SECRETARIA` cria OK; `ADMIN` hard-delete OK/404/409.

---

### P2: Observabilidade de negação

**User Story**: Como administrador, quero saber quando o acesso foi negado pela
matriz, para auditar configurações erradas.

**Why P2**: Sem visibilidade, falha de configuração vira suporte às cegas.

**Acceptance Criteria**:

1. WHEN o sistema nega acesso por falta de permissão na matriz (guard de app) THEN o sistema SHALL registrar no log do servidor a negativa com papel, módulo e nível solicitados. <!-- event-driven -->

**Independent Test**: Leitura de autorização negada (`FINANCEIRO` tentando escrita) → linha de log com os três campos.

---

## Edge Cases

- IF a tabela `permissions` estiver vazia (falha de seed) THEN o sistema SHALL negar todos os acessos admin (fail-closed). <!-- unwanted-behavior -->
- WHEN uma role com `administrar` solicita nível `ler` em um módulo THEN o sistema SHALL conceder (hierarquia). <!-- event-driven -->
- IF um papel sem linha na matriz (ex.: `MEMBRO` em `usuario`) acessa o módulo THEN o sistema SHALL negar sem exceção. <!-- unwanted-behavior -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MATRIZ-01 | P1: Fonte única | - | Pending |
| MATRIZ-02 | P1: Fonte única | - | Pending |
| MATRIZ-03 | P1: Fonte única | - | Pending |
| MATRIZ-04 | P1: Fonte única | - | Pending |
| MATRIZ-05 | P1: Fonte única | - | Pending |
| MATRIZ-06 | P1: Decisão única | - | Pending |
| MATRIZ-07 | P1: Decisão única | - | Pending |
| MATRIZ-08 | P1: Decisão única | - | Pending |
| MATRIZ-09 | P1: Decisão única | - | Pending |
| MATRIZ-10 | P1: Decisão única | - | Pending |
| MATRIZ-11 | P1: Decisão única | - | Pending |
| MATRIZ-12 | P1: Piloto membros | - | Pending |
| MATRIZ-13 | P1: Piloto membros | - | Pending |
| MATRIZ-14 | P1: Piloto membros | - | Pending |
| MATRIZ-15 | P1: Piloto membros | - | Pending |
| MATRIZ-16 | P1: Piloto membros | - | Pending |
| MATRIZ-17 | P1: Piloto membros | - | Pending |
| MATRIZ-18 | P1: Piloto membros | - | Pending |
| MATRIZ-19 | P1: Piloto membros | - | Pending |
| MATRIZ-20 | P2: Observabilidade | - | Pending |

**Coverage:** 20 total, 0 mapped to tasks, 20 unmapped ⚠️

---

## Success Criteria

- [ ] Matriz completa (48 pares) consultável em `permissions` e editável sem deploy
- [ ] Mesmo acesso observável nos papéis seed do admin (zero regressão nas probes)
- [ ] RLS de `members`/`member_documents` decidem exclusivamente via `can_access`
- [ ] Guardas de app decidem via `can()`; negação por falha de leitura → fail-closed
- [ ] Módulos futuros nascem usando `can()`/`can_access()` sem retrabalho

---

## Anexo A — Matriz-default (48 pares)

Papéis: SUPER_ADMIN (SA), ADMIN (A), SECRETARIA (S), FINANCEIRO (F), PATRIMONIAL (P), LIDER (L). Módulos: dashboard, membros, igrejas, eventos, patrimonio, financeiro, relatorios, usuarios, configuracoes, auditoria.

| Papel | dashboard | membros | igrejas | eventos | patrimonio | financeiro | relatorios | usuarios | configuracoes | auditoria |
| ----- | --------- | ------- | ------- | ------- | ---------- | ---------- | ---------- | -------- | ------------- | --------- |
| SUPER_ADMIN | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar |
| ADMIN | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar | administrar |
| SECRETARIA | ler | escrever | ler | escrever | ler | ler | ler | (sem) | (sem) | (sem) |
| FINANCEIRO | ler | ler | ler | ler | ler | escrever | escrever | (sem) | (sem) | (sem) |
| PATRIMONIAL | ler | ler | ler | ler | escrever | ler | ler | (sem) | (sem) | (sem) |
| LIDER | ler | ler | ler | ler | ler | ler | ler | (sem) | (sem) | (sem) |

Legenda `(sem)` = sem linha na matriz → sem acesso ao módulo (fail-closed). 48 linhas = 10 (SA) + 10 (A) + 7 (S) + 7 (F) + 7 (P) + 7 (L).