# Painel Membro Specification

## Problem Statement

A área autenticada do membro (`/painel`) hoje é uma landing mínima que apenas mostra e-mail e papel. O membro logado não tem utilidade prática no painel: faltam avisos de eventos (RF-012), QR de dízimo pessoal (RF-013), cartão de membro (RF-014) e gestão de informações pessoais com foto (RF-015).

## Goals

- [ ] Membro autenticado vê os avisos de eventos no `/painel`
- [ ] Membro gera QR de dízimo pessoal identificado no `/painel/dizimo`
- [ ] Membro visualiza e imprime o cartão de membro no `/painel/cartao`
- [ ] Membro autocadastra e edita suas informações + foto no `/painel/perfil`

## Out of Scope

| Feature     | Reason         |
| ----------- | -------------- |
| Cadastro/gestão de membros pelo admin | Painel admin RF-022 (feature separada) |
| Gestão de avisos/eventos (CRUD) | Painel admin RF-024 (feature separada) |
| Extrato/histórico de doações do membro | RF-016 removido por decisão do admin (2026-09-08) |
| Integração Mercado Pago / webhook | Financeiro RF-026 (feature separada) |
| Troca de senha (fluxo) | Já entregue na feature `auth` (AUTH-12) |
| Sessão única/multi-dispositivo | Auth.js/GoTrue cuida; fora do escopo |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Fonte de dados do membro para RF-014/RF-015 | Tabela `members` no Postgres (Supabase) | Decisão A na discussão: registro oficial que RF-022 lerá depois; RLS por propriedade via `auth.uid()` | y |
| Fonte dos avisos RF-012 | Tabela `event_notices` no Postgres | Decisão B: avisos no banco; EVENTS estático público continua como fonte pública (AD-008) | y |
| Identificação do dízimo "pessoal" | Campo de referência (TXID `***` → matrícula) no payload PIX pessoal | Decisão C: conciliação manual sem extrato; chave continua a institucional (CNPJ) — RN-001/AD-012 | y |
| Formato do cartão RF-014 | Digital na tela + botão imprimir | Decisão D: nome, foto, matrícula, igreja; sem QR embutido | y |
| Primeiro acesso sem registro de membro | Autocadastro no `/painel/perfil` cria `members` ligado ao auth_user_id | Decisão E: destrava demo/teste sem depender de admin RF-022 nem de service-role seed | y |
| Campos editáveis RF-015 | Nome completo, nascimento, WhatsApp, foto 4x4 | Decisão F: endereço/documento ficam para RF-022 (menos sensível no autocadastro, LGPD) | y |
| Matrícula do membro | Gerada automaticamente na criação (`IVC-####` sequencial) | Necessária p/ cartão + QR; sem admin para emitir manual; sequência simples por volume baixo | y |
| Foto 4x4 (storage) | Supabase Storage bucket `fotos-membros`, path `members/{memberId}/...`; upload via Rota API | AD-003 storage; RLS leitura própria + admin; documentos DATABASE.md | y |
| Validação da foto | jpeg/png/webp ≤ 2MB, renderizada 1:1 (sem crop forçado) | Limite razoável p/ foto 4x4; evitar lib de processamento de imagem no MVP | y |
| Nascimento inválido | Data futura ou > 120 anos → erro de validação | Bounds mínimos sem exigir idade mínima (decisão do admin não definida) | y |
| WhatsApp obrigatório | Sim, formato livre (sem máscara) | Contato necessário (RN-003); máscara fica p/ iteração futura | y |
| Criação duplicada (autocadastro) | Chave única `auth_user_id` em `members`; upsert/erro único 409 | Evita duplicatas no autocadastro; concorrência no primeiro acesso | y |
| Estado vazio de avisos | Mensagem amigável "Nenhum aviso disponível" | Padrão já usado nos eventos (`EVENTS`) | y |
| Falha de storage/banco | Erro amigável + log no servidor; não quebra a página | Observabilidade pós-F10 (Sentry, RNF-008) | y |
| Rate-limit nos POSTs do perfil | N/A (rota autenticada por sessão, volume ~50 membros) | Throttle de login já é do GoTrue; painel não expõe endpoint público | y |
| Lifecycle dos avisos | Campo `visivel` (bool) controla exibição; sem expiração automática/agendamento | TTL/agendamento não requisitado; retirada manual via admin RF-024 | y |
| Estratégia de migrações | Supabase Migrations em SQL puro (`supabase/migrations/*.sql`) versionadas, aplicadas via Supabase CLI/MCP no projeto dev | Decisão do usuário (opção A): sem tooling novo (Drizzle adia); AD-003 mantém Drizzle como evolução futura | y |
| Seed de dados de teste | Seed SQL versionado com 1 membro + 2 avisos de exemplo, aplicado no projeto dev via MCP admin | Decisão do usuário (opção A): valida probes sem depender da `SUPABASE_SERVICE_ROLE_KEY` bloqueada | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Avisos de eventos no painel ⭐ MVP

**User Story**: Como membro autenticado, quero ver os avisos da igreja ao entrar no painel, para não perder nenhum evento/campanha.

**Why P1**: É a landing do painel — sem avisos, a área não tem conteúdo de valor inicial.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN um membro autenticado acessa `/painel` THEN o sistema SHALL listar os avisos visíveis de `event_notices` ordenados por data mais recente primeiro. <!-- event-driven -->
2. WHILE não houver avisos visíveis em `event_notices` THEN o sistema SHALL mostrar o estado vazio amigável "Nenhum aviso disponível". <!-- state-driven -->
3. IF o membro não estiver autenticado THEN o proxy SHALL redirecionar para `/login`. <!-- unwanted-behavior -->
4. IF o papel do session não for membro e tentar `/painel` THEN o proxy SHALL redirecionar para a área correta (admin→`/admin`, outro→`/login`). <!-- unwanted-behavior -->

**Independent Test**: Login como membro com avisos semeados em `event_notices` → lista ordenada; com tabela vazia → estado vazio; sem sessão → redirect `/login`.

---

### P1: QR de dízimo pessoal ⭐ MVP

**User Story**: Como membro, quero gerar meu QR de dízimo identificado, para que minha contribuição seja reconhecida no financeiro sem preencher nada na hora.

**Why P1**: RF-013 é exclusiva do painel membro e dá sentido prático ao login.

**Acceptance Criteria**:

5. WHEN o membro autenticado e com registro em `members` acessa `/painel/dizimo` THEN o sistema SHALL exibir QR renderizado a partir de payload PIX cujo campo de referência identifica a matrícula do membro. <!-- event-driven -->
6. WHEN o payload pessoal é gerado THEN o sistema SHALL usar a mesma chave PIX institucional (CNPJ) de `PIX.key`. <!-- event-driven -->
7. IF o membro autenticado ainda não tem registro em `members` THEN o sistema SHALL redirecionar para `/painel/perfil` e mostrar orientação de autocadastro. <!-- unwanted-behavior -->
8. WHEN exibido o QR THEN o sistema SHALL também oferecer o payload copiável ("código copia-e-cola") com botão copiar. <!-- event-driven -->

**Independent Test**: Membro com cadastro vê QR + código copiável; payload difere do público por ter ID/matrícula; membro sem cadastro → redirect `/painel/perfil`.

---

### P1: Cartão de membro ⭐ MVP

**User Story**: Como membro, quero ver e imprimir um cartão de membro com meu nome, foto e matrícula, para identificação nos cultos.

**Why P1**: RF-014 entrega um artefato tangível ao membro; dependente do dado da tabela `members`.

**Acceptance Criteria**:

9. WHEN o membro autenticado e com registro em `members` acessa `/painel/cartao` THEN o sistema SHALL exibir cartão com nome, matrícula, nome da igreja e foto (se houver). <!-- event-driven -->
10. IF o membro não tem foto THEN o sistema SHALL mostrar placeholder de foto 4x4. <!-- unwanted-behavior -->
11. WHEN o usuário aciona imprimir THEN o navegador SHALL imprimir apenas o cartão (CSS print). <!-- event-driven -->
12. IF o membro ainda não tem registro em `members` THEN o sistema SHALL redirecionar para `/painel/perfil`. <!-- unwanted-behavior -->

**Independent Test**: Membro com cadastro + foto vê cartão completo; sem foto → placeholder; imprimir → print do cartão; sem cadastro → redirect perfil.

---

### P1: Minhas informações (autocadastro + edição + foto) ⭐ MVP

**User Story**: Como membro, quero completar e manter minhas informações (nome, nascimento, WhatsApp, foto), para que a igreja tenha meus dados corretos e eu receba meu cartão/QR.

**Why P1**: RF-015 é pré-requisito de dados para RF-013/RF-014 e o ponto de entrada do autocadastro.

**Acceptance Criteria**:

13. WHEN o membro autenticado acessa `/painel/perfil` sem registro em `members` THEN o sistema SHALL exibir formulário de autocadastro (nome, nascimento, WhatsApp, foto) e persistir criando o registro ligado ao `auth.uid()`. <!-- event-driven -->
14. WHEN o membro autenticado acessa `/painel/perfil` com registro existente THEN o sistema SHALL exibir os dados atuais preenchidos para edição. <!-- event-driven -->
15. WHEN o membro salva dados válidos THEN o sistema SHALL persistir as alterações e mostrar mensagem de sucesso. <!-- event-driven -->
16. IF o formulário contém nome vazio, nascimento inválido (futuro/>120 anos) ou WhatsApp vazio THEN o sistema SHALL exibir erro de validação inline e não persistir. <!-- unwanted-behavior -->
17. IF o upload de foto for de tipo/size não permitido THEN o sistema SHALL rejeitar com mensagem (limite: jpeg/png/webp, ≤2MB). <!-- unwanted-behavior -->
18. IF o upload da foto falhar no storage THEN o sistema SHALL informar erro sem perder os demais dados do formulário. <!-- unwanted-behavior -->
19. WHEN salvo com sucesso THEN o sistema SHALL confirmar e, se foi autocadastro, gerar a matrícula `IVC-####`. <!-- event-driven -->

**Independent Test**: Usuário sem `members` completa formulário → registro criado + mensagem de sucesso; dados inválidos → erros inline; foto >2MB → rejeitada; foto válida → mostrada no perfil e no cartão.

---

## Edge Cases

- IF `event_notices` falhar ao consultar (banco indisponível) THEN o sistema SHALL mostrar estado vazio sem quebrar a página.
- IF dois acessos simultâneos tentarem autocadastro do mesmo `auth.uid()` THEN uma das tentativas SHALL falhar com 409 (unique `auth_user_id`) e a outra ter sucesso.
- IF payload PIX pessoal falhar ao montar (ex.: matrícula ausente) THEN o sistema SHALL exibir erro amigável na página de dízimo.

---

## Requirement Traceability

| Requisito | ID       | Story       | Status  |
| --------- | -------- | ----------- | ------- |
| RF-012 | PAINEL-01..04 | P1: Avisos | Pending |
| RF-013 | PAINEL-05..08 | P1: QR dízimo | Pending |
| RF-014 | PAINEL-09..12 | P1: Cartão | Pending |
| RF-015 | PAINEL-13..19 | P1: Perfil | Pending |

**Coverage:** 4 RF cobertos × PAINEL-01..19 (P1); 0 mapeados para tasks ⚠️

---

## Success Criteria

- [ ] Membro autenticado completa o ciclo: autocadastro → cartão com foto → QR de dízimo identificado (walkthrough < 3 min)
- [ ] Avisos aparecem ordenados no `/painel` sem erro
- [ ] `npm run lint && npm run typecheck && npm run build` passam sem erros