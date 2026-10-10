# RF-030 — Auditoria (Trilha de Auditoria)

## Problem Statement

A igreja precisa de uma trilha de auditoria para rastrear ações administrativas realizadas no painel. Quando um administrador cria, edita ou exclui dados (membros, eventos, patrimônio, financeiro, etc.), essas ações devem ser registradas para fins de transparência, segurança e conformidade. A solução permite que SUPER_ADMIN e ADMIN consultem o histórico de ações com filtros.

## Goals

- [ ] Criar tabela `audit_logs` para armazenar ações administrativas
- [ ] Criar service `registrarAuditoria()` para escrita de logs
- [ ] Criar service `listarAuditoria()` com filtros por data/ação/entidade
- [ ] Criar página `/admin/auditoria` (read-only) com tabela, filtros e paginação
- [ ] Instrumentar route handlers existentes para gravar logs
- [ ] RBAC: `auditoria:ler` apenas para SUPER_ADMIN/ADMIN

## Out of Scope

| Feature | Reason |
|---------|--------|
| Logs de auditoria do portal público | Apenas ações administrativas |
| Exportação de logs | Pode ser feita em iteração futura |
| Alertas em tempo real | Fora do escopo do MVP |
| Logs de autenticação (login/logout) | Pode ser adicionado futuramente |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Apenas ações de route handlers são auditadas | Escopo definido pelo usuário | Foco em ações administrativas que modificam dados | yes |
| Logs ficam imutáveis (sem UPDATE/DELETE) | Append-only | Auditoria perde valor se puder ser alterada | yes |
| IP e user_agent extraídos do request | Padrão HTTP | Informações úteis para rastreabilidade | yes |
| Paginação simples (offset/limit) | Padrão MVP | Volume esperado baixo (~30 ações/mês) | yes |
| Campos autor/entidade_id nullable | Permite ações sem autor identificado | Edge cases de sistema | yes |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Registro de Ações Administrativas ⭐ MVP

**User Story**: As a admin, I want cada ação administrativa ser registrada automaticamente so that there is a complete audit trail.

**Why P1**: Essencial para transparência e segurança do sistema.

**Acceptance Criteria**:

1. WHEN uma ação administrativa é executada via route handler THEN system SHALL registrar um log com autor, ação, entidade, entidade_id, timestamp, IP e user_agent
2. WHEN o campo IP não está disponível THEN system SHALL registrar NULL no campo ip
3. WHEN o campo user_agent não está disponível THEN system SHALL registrar NULL no campo user_agent
4. WHEN um log é inserido THEN system SHALL torná-lo imutável (sem UPDATE/DELETE)
5. WHEN a tabela audit_logs é criada THEN system SHALL habilitar RLS com policy de SELECT para authenticated
6. WHEN a política RLS é definida THEN system SHALL exigir `can_access('auditoria', 'ler')` para SELECT

**Independent Test**: Criar um membro via POST /api/admin/membros e verificar que um log foi inserido em audit_logs com os campos corretos.

---

### P2: Consulta de Logs com Filtros

**User Story**: As a admin, I want consultar logs de auditoria com filtros so that I can quickly find specific actions.

**Why P2**: Essencial para usabilidade da página de auditoria.

**Acceptance Criteria**:

1. WHEN a página /admin/auditoria é acessada THEN system SHALL exibir uma tabela com todos os logs
2. WHEN o filtro de data é aplicado THEN system SHALL filtrar logs entre data_inicio e data_fim
3. WHEN o filtro de ação é aplicado THEN system SHALL filtrar logs por tipo de ação (criar, editar, excluir, etc.)
4. WHEN o filtro de entidade é aplicado THEN system SHALL filtrar logs por entidade (membros, eventos, patrimonio, etc.)
5. WHEN há mais de 20 logs THEN system SHALL paginar com limite de 20 por página
6. WHEN não há logs THEN system SHALL exibir mensagem "Nenhum log de auditoria encontrado"

**Independent Test**: Inserir 25 logs e verificar que a paginação mostra 2 páginas com 20 e 5 logs respectivamente.

---

### P3: Página de Auditoria

**User Story**: As a admin, I want uma página dedicada para visualizar logs so that I can monitor ações administrativas.

**Why P3**: Interface visual para consulta dos logs.

**Acceptance Criteria**:

1. WHEN a página é carregada THEN system SHALL exibir uma tabela com colunas: Data/Hora, Autor, Ação, Entidade, ID, IP
2. WHEN o usuário clica em "Filtros" THEN system SHALL exibir formulário com campos: período (data_inicio/fim), ação (select), entidade (select)
3. WHEN os filtros são aplicados THEN system SHALL atualizar a tabela com os resultados filtrados
4. WHEN a paginação é necessária THEN system SHALL exibir botões "Anterior" e "Próximo"
5. WHEN o guard RBAC é verificado THEN system SHALL exigir `can(papel, 'auditoria', 'ler')` para acessar a página

**Independent Test**: Acessar /admin/auditoria como ADMIN e verificar que a página carrega corretamente com tabela e filtros.

---

## Edge Cases

- IF o registro de auditoria falha THEN system SHALL continuar a execução da ação original (não bloquear)
- IF o payload excede 10KB THEN system SHALL truncar o campo payload para 10KB
- IF o filtro de data tem data_inicio > data_fim THEN system SHALL retornar 400 com erro `datas_invalidas`
- IF não há parâmetros de paginação THEN system SHALL usar offset=0 e limit=20

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| AUD-01 | P1: Registro | Execute | Verified |
| AUD-02 | P1: Registro | Execute | Verified |
| AUD-03 | P1: Registro | Execute | Verified |
| AUD-04 | P1: Registro | Execute | Verified |
| AUD-05 | P1: Registro | Execute | Verified |
| AUD-06 | P1: Registro | Execute | Verified |
| AUD-07 | P2: Filtros | Execute | Verified |
| AUD-08 | P2: Filtros | Execute | Verified |
| AUD-09 | P2: Filtros | Execute | Verified |
| AUD-10 | P2: Filtros | Execute | Verified |
| AUD-11 | P2: Filtros | Execute | Verified |
| AUD-12 | P2: Filtros | Execute | Verified |
| AUD-13 | P3: Página | Execute | Verified |
| AUD-14 | P3: Página | Execute | Verified |
| AUD-15 | P3: Página | Execute | Verified |
| AUD-16 | P3: Página | Execute | Verified |
| AUD-17 | P3: Página | Execute | Verified |
| AUD-18 | P1: Instrumentação | Execute | Verified |

---

## Success Criteria

- [ ] Tabela audit_logs criada com RLS funcionando
- [ ] Service registrarAuditoria() gravando logs corretamente
- [ ] Service listarAuditoria() retornando dados com filtros
- [ ] Página /admin/auditoria exibindo logs com filtros e paginação
- [ ] Route handlers instrumentados (membros, eventos, patrimonio, financeiro, relatorios, usuarios, configuracoes)
- [ ] RBAC: apenas SUPER_ADMIN/ADMIN podem acessar /admin/auditoria
- [ ] Probes scripts/probes-admin-auditoria.sh passando
