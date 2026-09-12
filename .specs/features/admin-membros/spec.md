# Admin Membros Specification

## Problem Statement

O painel administrativo hoje é uma landing mínima (e-mail + papel). A liderança
não consegue gerir os membros da igreja: o registro oficial vive só em
autocadastro pelo próprio membro (RF-015) e não há listagem, edição,
ciclo de vida, documentos ou cartão acessíveis ao admin. Sem isso, o painel admin
(RF-021..030) não tem base operacional — dashboard, eventos e financeiro dependem
de um registro de membros confiável.

## Goals

- [ ] Admin lista, busca e filtra membros em `/admin/membros` (RF-022)
- [ ] Admin cadastra novo membro gerando conta auth + senha-ID temporária (RN-002/AD-013)
- [ ] Admin edita dados e gerencia ciclo de vida (ATIVO/INATIVO/TRANSFERIDO) com transições válidas
- [ ] Admin exclui membro de forma segura (inativação + hard-delete restrito)
- [ ] Admin vê/imprime o cartão de qualquer membro
- [ ] Admin registra metadados de documentos (RG/CPF/comprovante/outro) — P2
- [ ] RBAC simples: SECRETARIA/ADMIN/SUPER_ADMIN escrevem; demais papéis admin leem

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Upload real de arquivos de documentos (Storage) | P2 metadados nesta feature; upload em próxima iteração (context.md) |
| Upload/edição de foto pelo admin | RF-015 mantém o autocadastro/edição própria do membro |
| Matriz de permissões por módulo | RF-032 (feature futura); aqui RBAC simples por papel |
| Auditoria persistida de ações sensíveis | RF-030 (RN-004); aqui só log do servidor |
| Vínculo de membro a conta auth existente | Fluxos novos; hoje e-mail em uso → 409 |
| Mudança de e-mail do membro | Escopo MVP; admin API de e-mail confirmado fora |
| Reemissão/recuperação de senha-ID | D2/AD-013 entregam manualmente uma única senha-ID |
| Paginação da listagem | Volumes 30-50 (RN-005/AD-001): fetch-all com ORDER BY |
| Bloqueio de acesso do membro por status | RF-032 (inativar não revoga sessão nem o `/painel` aqui) |
| Gestão de usuários/papéis (RBAC admin) | RF-028 (feature futura) |
| Dízimo/extrato por membro | RF-026 (financeiro, feature futura) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Criação de membro gera conta auth | Sim: auth user `MEMBRO` + `force_password_change=true` + senha-ID aleatória, via service-role | Decisão da discussão; `auth_user_id` permanece `not null` | y |
| Senha-ID exibida uma única vez | Somente no response 201 do POST de criação; não persistida em texto | Entrega manual pela liderança (D2/AD-013) | y |
| E-mail em uso em `auth.users` | 409 `email_em_uso` | Pessoa provavelmente já tem login; vínculo é evolução | y |
| Form de criação obrigatórios | nome, nascimento (bounds do painel-membro), whatsapp, email válido; endereço opcional | Consistência com PAINEL-16; e-mail necessário p/ auth | y |
| Papéis que escrevem | SECRETARIA, ADMIN, SUPER_ADMIN | Decisão da discussão (RF-032 refina) | y |
| Papéis leitores | FINANCEIRO, PATRIMONIAL, LIDER — leem lista/detalhe/cartão/documentos | Decisão da discussão | y |
| Ciclo de vida | ATIVO / INATIVO / TRANSFERIDO, transições validadas no servidor | Decisão da discussão | y |
| Exclusão | Remover = inativar; hard-delete só ADMIN/SUPER_ADMIN, sem documentos, remove members+auth | Decisão da discussão (adaptada: como toda criação tem conta, condição real = sem documentos/recém-criado) | y |
| Inativar não bloqueia acesso | Sessão corrente e acesso futuro ao `/painel` seguem até RF-032 | Escopo da matriz de permissões | y |
| Endereço | logradouro, numero, bairro, cidade, uf, cep — opcionais | Pendência herdada do painel-membro | y |
| Documentos | P2 metadados: `member_documents` (tipo, descricao, data), CRUD por escritores | Decisão da discussão | y |
| Listagem | busca nome/matricula (OR, case-insensitive) + filtro status + default nome asc, sem paginação | Volumes baixos | y |
| Cartão | `/admin/membros/[id]/cartao` reusa layout `/painel/cartao` + imprimir | Decisão da discussão | y |
| E-mail não editável | Admin não altera e-mail do membro | Evita fluxo de confirmação fora do MVP | y |
| Auditoria | Log server-side apenas (sem tabela) — RF-030 virá | RN-004 fora desta feature | y |
| Service-role key | Disponível em `.env.local` (ref `[REDACTED_PROJECT_REF]`, role `service_role` — validado 2026-09-12) | Desbloqueia criação/remoção de auth user e AUTH-12 runtime | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Listar e localizar membros ⭐ MVP

**User Story**: Como pessoa da liderança, quero ver a lista completa de membros
com busca e filtro por situação, para encontrar um membro rapidamente.

**Why P1**: É a base de navegação de todo o painel admin de membros.

**Acceptance Criteria** (EARS):

1. WHEN um usuário com papel administrador autenticado acessa `/admin/membros` THEN o sistema SHALL listar todos os membros ordenados por nome ascendente por padrão. <!-- event-driven -->
2. WHEN o admin pesquisa por um texto em `/admin/membros` THEN o sistema SHALL filtrar a lista por nome OU matrícula contendo o texto (case-insensitive). <!-- event-driven -->
3. WHEN o admin seleciona um filtro de situação (`todos`, `ativos`, `inativos`, `transferidos`) THEN o sistema SHALL exibir apenas os membros daquele status. <!-- event-driven -->
4. IF um usuário sem sessão acessa `/admin/membros` THEN o sistema SHALL redirecionar para `/login/admin`. <!-- unwanted-behavior -->
5. IF uma sessão de papel `MEMBRO` (não admin) acessa `/admin/membros` THEN o sistema SHALL redirecionar para `/login/admin`. <!-- unwanted-behavior -->

**Independent Test**: Login admin seed → `/admin/membros` retorna 200 com nomes ordenados; buscar "IVC-000" filtra; filtrar por INATIVO mostra só inativos; sem sessão → 307 `/login/admin`.

---

### P1: Cadastrar novo membro com conta e senha-ID ⭐ MVP

**User Story**: Como liderança, quero cadastrar um novo membro e, em um único
ato, gerar seu acesso (e-mail, senha-ID temporária) para entregar manualmente.

**Why P1**: Materializa RN-002 + AD-013 no painel admin e tira a criação de
usuários do SQL manual.

**Acceptance Criteria**:

1. WHEN um escritor envia `POST /api/admin/membros` com dados válidos (nome, nascimento, whatsapp, email) THEN o sistema SHALL criar a conta auth (papel `MEMBRO`, `force_password_change=true`), criar a linha em `members` com matrícula `IVC-####` derivada da sequência e responder `201` incluindo a senha-ID temporária **uma única vez**. <!-- complex -->
2. WHEN o admin registra endereço no cadastro THEN o sistema SHALL persistir logradouro, numero, bairro, cidade, uf e cep junto ao membro (campos opcionais). <!-- event-driven -->
3. IF o e-mail já estiver em uso em `auth.users` THEN o sistema SHALL responder `409` com `email_em_uso` sem criar linha nem conta. <!-- unwanted-behavior -->
4. IF nome, nascimento, whatsapp ou email forem inválidos/ausentes THEN o sistema SHALL responder `400` com o mapeamento de campos e NÃO criar nada. <!-- unwanted-behavior -->
5. O sistema SHALL garantir que cada matrícula gerada seja única e diferente das já existentes (incluindo o seed `IVC-0001`). <!-- ubiquitous -->
6. O sistema SHALL não expor a senha-ID temporária em nenhuma resposta posterior à de criação. <!-- ubiquitous -->
7. WHEN o novo membro acessa `/login` com e-mail+senha-ID THEN o sistema SHALL exigir a troca de senha antes de liberar `/painel` (force_password_change). <!-- complex -->

**Independent Test**: POST válido → 201 com matrícula regex `IVC-###` e `senha_temporaria`; e-mail duplicado → 409; campos inválidos → 400; login com a senha recebida → 307 `/trocar-senha`.

---

### P1: Editar dados do membro

**User Story**: Como liderança, quero corrigir/atualizar os dados de um membro.

**Why P1**: Registro oficial precisa ser editável (telefone, endereço, datas).

**Acceptance Criteria**:

1. WHEN um escritor envia `PUT /api/admin/membros/[id]` com dados textuais válidos (nome, nascimento, whatsapp, endereço) THEN o sistema SHALL atualizar o registro e responder `200` com o membro atualizado. <!-- event-driven -->
2. IF algum campo obrigatório for inválido/ausente THEN o sistema SHALL responder `400` com o mapeamento de campos sem efetuar a atualização. <!-- unwanted-behavior -->
3. IF o membro não existir THEN o sistema SHALL responder `404`. <!-- unwanted-behavior -->
4. O sistema SHALL manter o e-mail inalterável nesta action (não aceito nem exposto como editável). <!-- ubiquitous -->

**Independent Test**: PUT válido → 200 com dados novos; PUT com nascimento inválido → 400; PUT em id inexistente → 404.

---

### P1: Ciclo de vida e exclusão

**User Story**: Como liderança, quero controlar a situação do membro (ativo,
inativo, transferido) e remover cadastros de forma segura.

**Why P1**: "CRUD + ciclo de vida" é o coração operacional da RF-022.

**Acceptance Criteria**:

1. WHEN um escritor muda o status para uma transição válida (ATIVO→INATIVO, ATIVO→TRANSFERIDO, INATIVO→ATIVO, INATIVO→TRANSFERIDO) THEN o sistema SHALL atualizar e responder `200`. <!-- event-driven -->
2. IF a transição for inválida (ex.: TRANSFERIDO para qualquer outro) THEN o sistema SHALL responder `400` `status_transicao_invalida` sem alterar o registro. <!-- unwanted-behavior -->
3. WHEN um escritor aciona "remover" um membro THEN o sistema SHALL alternar o status para `INATIVO` (não apagar o histórico). <!-- event-driven -->
4. WHEN `ADMIN`/`SUPER_ADMIN` envia `DELETE /api/admin/membros/[id]` de um membro sem documentos THEN o sistema SHALL remover a linha `members` e a conta auth correspondente e responder `204`. <!-- complex -->
5. IF o hard-delete for solicitado para membro com documentos cadastrados THEN o sistema SHALL responder `409` e não remover nada. <!-- unwanted-behavior -->
6. IF um papel não-escritor (leitor ou não-admin) tentar qualquer ação de escrita (PUT status, DELETE) THEN o sistema SHALL responder `403`. <!-- unwanted-behavior -->

**Independent Test**: Inativar ATIVO → 200 e status INATIVO; TRANSFERIDO→ATIVO → 400; DELETE de membro sem documentos → 204 e linha some (auth user também); DELETE com documento → 409; leitor tenta DELETE → 403.

---

### P1: Detalhe e cartão do membro

**User Story**: Como liderança, quero ver o detalhe de um membro e imprimir o
cartão dele.

**Why P1**: Fecha o ciclo de leitura (RF-022 "cartão").

**Acceptance Criteria**:

1. WHEN um admin (qualquer papel) acessa `/admin/membros/[id]` THEN o sistema SHALL exibir os dados do membro (nome, matrícula, situação, contatos, endereço). <!-- event-driven -->
2. WHEN um admin acessa `/admin/membros/[id]/cartao` THEN o sistema SHALL renderizar o cartão (nome, matrícula, igreja, foto ou placeholder) com botão imprimir. <!-- event-driven -->
3. IF o membro não existir THEN o sistema SHALL responder `404` na rota de detalhe e na de cartão. <!-- unwanted-behavior -->

**Independent Test**: `/admin/membros/IVC-id-seed` → 200 com dados; `/cartao` → 200 com layout do cartão; id inexistente → 404.

---

### P2: Documentos (metadados)

**User Story**: Como secretaria, quero registrar na ficha do membro quais
documentos ele entregou (RG, CPF, comprovante de endereço) sem anexar o arquivo
nesta etapa.

**Why P2**: Registro da ficha sem o custo de Storage; upload entra depois.

**Acceptance Criteria**:

1. WHEN um escritor envia `POST /api/admin/membros/[id]/documentos` com `tipo` válido (`RG`, `CPF`, `comprovante_endereco`, `outro`) THEN o sistema SHALL criar o metadado e responder `201`. <!-- event-driven -->
2. IF o `tipo` for inválido THEN o sistema SHALL responder `400`. <!-- unwanted-behavior -->
3. WHEN um admin lê `GET /api/admin/membros/[id]/documentos` THEN o sistema SHALL listar os metadados ordenados por `criado_em` desc. <!-- event-driven -->
4. WHEN um escritor envia `DELETE /api/admin/membros/[id]/documentos/[docId]` THEN o sistema SHALL remover o metadado e responder `204`. <!-- event-driven -->
5. IF o membro ou o documento não existir THEN o sistema SHALL responder `404`. <!-- unwanted-behavior -->

**Independent Test**: Criar documento RG → 201; tipo "crachá" → 400; listar → ordenado; deletar → 204; id inexistente → 404.

---

### P1: RBAC — escritores vs leitores

**User Story**: Como liderança, quero que papéis de apoio (financeiro,
patrimonial, líder) consultem membros sem poder alterar dados.

**Why P1**: Menor privilégio até a RF-032.

**Acceptance Criteria**:

1. WHEN um papel leitor (FINANCEIRO/PATRIMONIAL/LIDER) acessa rotas de leitura (`/admin/membros`, `/admin/membros/[id]`, `/admin/membros/[id]/cartao`, documentos GET) THEN o sistema SHALL permitir a leitura. <!-- event-driven -->
2. WHEN um papel leitor ou um papel não-admin envia qualquer requisição de escrita (`POST /api/admin/membros`, `PUT`, `DELETE`, `POST/DELETE documentos`) THEN o sistema SHALL responder `403`. <!-- unwanted-behavior -->
3. IF uma requisição a `/api/admin/*` chega sem sessão THEN o sistema SHALL responder `401`. <!-- unwanted-behavior -->

**Independent Test**: Sessão leitor → GET 200; POST/PUT/DELETE → 403; sem sessão → 401.

---

## Edge Cases

- IF a sequência de matrícula estiver à frente do seed THEN a matrícula gerada SHALL ser derivada da sequence (nunca hardcoded). <!-- unwanted-behavior -->
- IF a criação da conta auth falhar depois de gerar a senha-ID THEN o sistema SHALL não criar a linha em `members` nem expor a senha como válida (nenhuma parcialidade). <!-- unwanted-behavior -->
- IF o e-mail informado tiver formato inválido THEN o sistema SHALL responder `400` no campo `email`. <!-- unwanted-behavior -->
- IF o membro for inativado com avisos/visitas já registrados THEN o sistema SHALL preservar o histórico (nenhuma dependência de exclusão). <!-- unwanted-behavior -->
- IF o hard-delete incluir a remoção da conta auth e esta falhar parcialmente THEN o sistema SHALL responder `500` sem deixar estado inconsistente (rolback manual documentado). <!-- unwanted-behavior -->

---

## Requirement Traceability

| Requisito | ID | Story | Status |
| --------- | -- | ----- | ------ |
| RF-022 | ADMINMEM-01..05 | P1: Listar e localizar | Pending |
| RF-022 | ADMINMEM-06..12 | P1: Cadastrar novo membro | Pending |
| RF-022 | ADMINMEM-13..16 | P1: Editar dados | Pending |
| RF-022 | ADMINMEM-17..23 | P1: Ciclo de vida e exclusão | Pending |
| RF-022 | ADMINMEM-24..26 | P1: Detalhe e cartão | Pending |
| RF-022 | ADMINMEM-27..31 | P2: Documentos | Pending |
| RF-022 | ADMINMEM-32..34 | P1: RBAC | Pending |
| RF-022 | ADMINMEM-35..39 | Edge cases | Pending |

**Coverage:** 39 total (5 listar + 7 cadastrar + 4 editar + 7 ciclo de vida + 3 detalhe/cartão + 5 documentos + 3 RBAC + 5 edge cases), 0 mapeados para tasks ⚠️

---

## Success Criteria

- [ ] A liderança cadastra um novo membro em < 2 min e recebe a senha-ID para entrega manual
- [ ] Um membro criado pelo admin acessa o `/painel` pelo 1º acesso (troca de senha obrigatória) em fluxo guiado
- [ ] Listar/buscar/filtrar membros responde em < 1s local
- [ ] Nenhuma transição de status inválida e nenhum hard-delete não autorizado passam nos probes
- [ ] Zero regressões nos probes existentes (`scripts/probes-painel.sh` e gates lint/typecheck/build)