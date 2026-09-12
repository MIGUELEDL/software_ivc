# Admin Membros Context

**Gathered:** 2026-09-12
**Spec:** `.specs/features/admin-membros/spec.md`
**Status:** Ready for design

---

## Feature Boundary

CRUD de membros no painel administrativo (RF-022): listagem com busca/filtro,
cadastro de novo membro com geração de conta auth + senha-ID temporária, edição
de dados, ciclo de vida (ATIVO/INATIVO/TRANSFERIDO), exclusão (inativação +
hard-delete restrito), visualização/impressão do cartão e metadados de
documentos (P2). Acesso via `/admin/membros*` e `/api/admin/membros*` com RBAC
simples por papel (escritores vs leitores).

---

## Implementation Decisions

### Criação de membro — conta auth vinculada

- O admin cadastra novo membro (nome, nascimento, WhatsApp, e-mail + endereço
  opcional). O sistema **gera a conta auth** (cretão de usuário Supabase via
  service-role), papel `MEMBRO` e `force_password_change=true`.
- Gera **senha-ID temporária** aleatória e a exibe **uma única vez** no response
  do POST (entrega manual pela liderança — D2/AD-013). Nunca recuperável depois.
- Matrícula `IVC-####` via RPC `proxima_matricula` existente (0005), imune a RLS.
- `members.auth_user_id` permanece `not null` (toda criação vincula a conta
  recém-criada).
- E-mail já em uso em `auth.users` → **409 `email_em_uso`** (mensagem orienta que
  a pessoa provavelmente já tem conta; vincular é evolução futura).
- Senha-ID exibida uma única vez; regra: nova solicitação de senha temporária
  fora de escopo (recuperação por e-mail é fora do MVP — D2).

### Papéis (RBAC simples — RF-032 refina depois)

- **Escritores**: `SECRETARIA`, `ADMIN`, `SUPER_ADMIN` — criam/editam/inativam/
  transferem/hard-delete/documentos.
- **Leitores**: `FINANCEIRO`, `PATRIMONIAL`, `LIDER` — veem a lista, o detalhe e o
  cartão; qualquer POST/PUT/DELETE → 403.
- `ADMIN_ROLES` (`isAdminRole`, `src/lib/auth/rbac.ts`) continua o gate de área.

### Ciclo de vida e exclusão

- Status: `ATIVO` (default), `INATIVO`, `TRANSFERIDO`.
- Transições validadas no servidor:
  `ATIVO → {INATIVO, TRANSFERIDO}`, `INATIVO → {ATIVO, TRANSFERIDO}`,
  `TRANSFERIDO` é terminal.
- "Remover" do dia a dia = **inativar** (soft, histórico preservado).
- **Hard-delete** (`DELETE /api/admin/membros/[id]`): apenas `ADMIN`/`SUPER_ADMIN`,
  apenas quando o membro **não possui documentos** (metadados) cadastrados. Remove
  a linha `members` **e** a conta auth via service-role (refinamento da condição
  "sem conta auth" da discussão: como toda criação gera conta, a condição real de
  segurança é "sem documentos e registro recém-criado"). Se houver documentos →
  409.
- Inativar não revoga sessão em andamento nem bloqueia o `/painel` nesta feature
  (bloqueio por status entra na RF-032).

### Endereço

- Campos opcionais em `members`: `logradouro`, `numero`, `bairro`, `cidade`,
  `uf` (2 letras), `cep`.

### Documentos (P2 — metadados apenas)

- Tabela `member_documents`: `id`, `member_id` (FK `members.id`), `tipo`
  (`RG`, `CPF`, `comprovante_endereco`, `outro`), `descricao` (opcional), `criado_em`.
- Sem upload real de arquivo nesta feature (Storage/arquivo → próxima iteração).
- Escritores criam/listam/removem metadados; leitores listam.

### Listagem

- `/admin/membros`: todos os membros; busca case-insensitive por **nome ou
  matrícula** (OR); filtro por status (todos/ativos/inativos/transferidos);
  ordenação default `nome asc`. Sem paginação (volumes 30-50 — RN-005/AD-001).

### Cartão

- `/admin/membros/[id]/cartao` reusa o layout do `/painel/cartao` (nome,
  matrícula, igreja, foto com placeholder) + botão imprimir; qualquer papel
  leitor acessa.

### E-mail não editável

- O admin não altera o e-mail do membro nesta feature (mudança de e-mail em
  usuário confirmado via admin API sai do escopo MVP).

---

## Agent's Discretion

- Estrutura interna de rotas/rotas API, nome das funções, formato de resposta
  JSON, split de migrations (0006+), composição dos forms de UI.
- Mensagens de erro exatas (mantendo o formato `{ error, campos? }` do
  `painel-membro`).

---

## Declined / Undiscussed Gray Areas → Assumptions

- **Fotos 4x4 / upload de foto pelo admin**: fora do escopo (RF-015 mantém o
  autocadastro/edição própria do membro). Assumption: admin não faz upload de
  foto; a foto existente (se houver) aparece no cartão.
- **Bloqueio de acesso por status**: inativado/transferido continua podendo logar
  no `/painel` até a RF-032. Assumption registrada.
- **Recuperação de senha / reemissão de senha-ID**: fora do MVP (D2 entrega
  manual única). Assumption registrada.
- **Paginação**: não há na listagem; volumes baixos. Assumption registrada.

---

## Specific References

- AD-013 (senha-ID temporária + troca obrigatória, entrega manual) e D2
  (contexto do auth) — fluxo de primeiro acesso.
- Padrão de resposta e validação do `painel-membro`
  (`src/app/api/painel/perfil/route.ts`): `{ error, campos }` com 400 por campo.
- RPC `proxima_matricula` (0005) + `src/lib/painel/members.ts` para matrícula.
- Seed de usuários auth sintéticos via SQL (0002/0004) — mesmo padrão para o
  seed de admin dos probes.
- Prox dos admin e `isAdminRole` (`src/proxy.ts`, `src/lib/auth/rbac.ts`).
- `supabase-js` admin API com service-role
  (`admin.createUser`, `admin.deleteUser`, `admin.updateUserById`) — usado em
  `trocar-senha/route.ts`.

---

## Deferred Ideas

- Matriz de permissões por módulo (RF-032) — refina o RBAC simples desta feature.
- Auditoria de ações sensíveis (RF-030, RN-004) — tabela/via de auditoria numa
  feature própria; aqui só o registro em log do servidor.
- Upload/distribuição de arquivos de documentos (Storage bucket) — próxima
  iteração da RF-022.
- Vínculo de membro a uma conta auth existente (pessoa que já tem login, ex.
  autocadastro anterior) — evolução futura; today: 409 `email_em_uso`.
- Mudança de e-mail do membro — evolução futura.
- Reemissão/recuperação de senha-ID — evolução futura (D2 limita a entrega).