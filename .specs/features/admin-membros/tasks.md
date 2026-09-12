# Admin Membros Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-membros/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates `npm run lint`/`typecheck`/`build` até F10; runner entra na F10 — AD-006/QA-001), prática das features anteriores (`scripts/probes-*.sh` como camada de teste por AC — QA-002).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / schema / RLS / seed | probe estático (grep dos arquivos `.sql`) | colunas (`status`, endereço), `member_documents`, policies (select all admin, insert/update writers, delete admin/super), seed `admin.teste`/`leitor.teste` | `supabase/migrations/0006*.sql`, `0007*.sql` + asserts em `scripts/probes-admin-membros.sh` | `bash scripts/probes-admin-membros.sh` |
| Service / DAL (`src/lib/admin/*`, `src/lib/supabase/admin.ts`, `rbac.ts`) | probe estático por semântica + typecheck | 1:1 ACs ADMINMEM; todas as transições de status (5 válidas/1 inválida ex.), rollback 2-passos no create, RBAC writer/hard-delete | `scripts/probes-admin-membros.sh` (asserts grep) | `bash scripts/probes-admin-membros.sh` |
| Route Handlers (`src/app/api/admin/*`) | probe estático (guards/validação 401/403/400) + **e2e runtime** agregado | happy + edge + error de cada rota (create 201/400/409, dados 200/400/404, status 200/400, hard-delete 204/409/403, docs 201/400/204/404, RBAC 401/403) | `scripts/probes-admin-membros.sh` (curl) | `bash scripts/probes-admin-membros.sh` (servidor :3000) |
| Páginas RSC (`src/app/admin/membros*`, `MemberCard`) | probe estático + **e2e runtime** agregado | lista 200 + ordenação/busca/filtro; detalhe/cartão 200/404; novo fluxo com senha 1×; `/painel/cartao` sem regressão | `scripts/probes-admin-membros.sh` | `bash scripts/probes-admin-membros.sh` |
| Entity / config | none | - (build gate only) | - | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas de lib/schema (sem rotas novas) | `npm run typecheck` (com PATH nvm; ver AGENTS.md) |
| Full | Após rotas/páginas/probes | `bash scripts/probes-admin-membros.sh` (servidor dev/start no :3000) + `npm run lint && npm run typecheck && npm run build` |
| Build | Fechamento de fase / tarefas só de config/entity | `npm run lint && npm run typecheck && npm run build` |

> PATH do Node: `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` antes dos gates.

---

## Execution Plan

Phases são ordenadas e sequenciais. Tasks dentro de cada fase executam em ordem.

### Phase 1: Foundation (schema + libs)

Migrations (0006, 0007) aplicadas via MCP (`supabase_apply_migration` no projeto `[REDACTED_PROJECT_REF]`) + versionadas no repo. Libs novas: cliente service-role e helpers RBAC.

```
T1   T2   T3   T4   (independentes)
```

### Phase 2: Service layer (`src/lib/admin/membros.ts`, evolução em 4 commits)

Leituras → criação (rollback 2-passos) → edição/transição/inativação → exclusão + documentos.

```
T5 → T6
T5 → T7
T5 → T8
```

### Phase 3: Interface HTTP (guards + route handlers)

```
T9 → T10
T9 → T11
T9 → T12
T9 → T13
T9 → T14
T9 → T15
```

### Phase 4: UI (cartão extraído, lista, novo, detalhe, nav)

```
T16 → T17
T16 → T18
T19 → T22
T20, T21 (dependem de phases anteriores)
```

### Phase 5: Probes (e2e agregado, re-runnable)

```
T23
```

---

## Task Breakdown

### Phase 1: Foundation (schema + libs)

### T1: Migration 0006 — schema admin (status, endereço, documentos, RLS)

**What**: Criar `supabase/migrations/0006_admin_membros.sql`: `members` ganha `status`
(`ATIVO` default, check 3 valores) + `logradouro/numero/bairro/cidade/uf/cep`;
tabela `member_documents` (FK cascade, tipo check); função `auth_role()` (security
definer); policies members (select all-admin, insert/update writers, delete
ADMIN/SUPER_ADMIN) e member_documents (select all-admin, insert/delete writers).
**Where**: `supabase/migrations/0006_admin_membros.sql`
**Depends on**: None
**Reuses**: padrão 0001 (RLS/policies), helper `auth.jwt()` para role
**Requirement**: ADMINMEM-06..34

**Tools**:
- MCP: `supabase` (aplicar migration no dev)
- Skill: NONE

**Done when**:
- [ ] SQL versionado contém as 6 colunas de endereço e a coluna `status` com check
- [ ] `member_documents` com FK `members(id) on delete cascade` + check de `tipo`
- [ ] 7 policies presentes (4 members + 3 documents) com os papéis certos
- [ ] Migration aplicada no projeto dev via MCP sem erro
- [ ] Nenhuma regressão nas policies existentes (`members_*_own`, `event_notices_select_visible` — não alteradas)

**Tests**: probes estáticos (greps no novo `.sql`: colunas, tabela, policies)
**Gate**: quick

---

### T2: Migration 0007 — seed de usuários admin de teste

**What**: Criar `supabase/migrations/0007_seed_admin.sql`: `auth.users` sintéticos
`admin.teste@ivc.local` (role `ADMIN`) e `leitor.teste@ivc.local` (role
`FINANCEIRO`), sem `force_password_change`, idempotente (padrão 0002/0004).
**Where**: `supabase/migrations/0007_seed_admin.sql`
**Depends on**: None
**Reuses**: padrão de seed `0002_seed_painel_membro.sql:8-25`
**Requirement**: ADMINMEM-32..34

**Tools**:
- MCP: `supabase` (aplicar seed no dev)
- Skill: NONE

**Done when**:
- [ ] Seed versionado e idempotente (`on conflict (id) do nothing`)
- [ ] Ambos os usuários com `raw_app_meta_data` contendo `role` (ADMIN / FINANCEIRO)
- [ ] Nenhum com `force_password_change` (probes não podem travar no `/trocar-senha`)
- [ ] Aplicado no dev via MCP sem erro

**Tests**: probes estáticos (greps no `.sql`: emails, roles)
**Gate**: quick

---

### T3: Helper de cliente service-role

**What**: Criar `src/lib/supabase/admin.ts` exportando `createAdminClient()` (padrão
do `trocar-senha/route.ts`), lendo `SUPABASE_SERVICE_ROLE_URL|KEY`; lançar erro se a
chave não estiver configurada. **Nunca** importado em client components.
**Where**: `src/lib/supabase/admin.ts`
**Depends on**: None
**Reuses**: `createClient` de `@supabase/supabase-js` (`trocar-senha/route.ts:53-56`)
**Requirement**: ADMINMEM-06, ADMINMEM-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `createAdminClient` exportado e funcional (typecheck passa)
- [ ] Sem import em nenhum arquivo `"use client"` (verificado por grep)
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep da export + ausência em client)
**Gate**: quick

---

### T4: Helpers RBAC (writers / hard-delete)

**What**: Estender `src/lib/auth/rbac.ts` com `ADMIN_WRITER_ROLES = { SECRETARIA,
ADMIN, SUPER_ADMIN }`, `isAdminWriterRole(role)` e `isHardDeleteRole(role)`
(ADMIN/SUPER_ADMIN).
**Where**: `src/lib/auth/rbac.ts`
**Depends on**: None
**Reuses**: `ADMIN_ROLES` existente
**Requirement**: ADMINMEM-32..34, ADMINMEM-21..23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Constantes e funções exportadas
- [ ] `isAdminWriterRole("FINANCEIRO") === false`, `isHardDeleteRole("SECRETARIA") === false` (asserts no probe estático)
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep dos helpers)
**Gate**: quick

---

### Phase 2: Service layer (`src/lib/admin/membros.ts`)

### T5: Service — tipos, `listMembros` e `getMembro`

**What**: Criar `src/lib/admin/membros.ts` com `MembroAdmin = Member & {status,
endereço}` e funções de leitura: `listMembros({q, status})` (select ordenado `nome
asc`, filtra por `ilike` nome OR matrícula quando `q`, e por `status` quando dado,
usando server client — RLS select admin) e `getMembro(id)` (`.maybeSingle()`,
retorna null p/ 404).
**Where**: `src/lib/admin/membros.ts`
**Depends on**: T1
**Reuses**: `createServerClient` (`server.ts`), tipo `Member` (`members.ts`)
**Requirement**: ADMINMEM-01..03, ADMINMEM-24, ADMINMEM-26

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `listMembros` ordena `nome asc` por default e aplica `ilike` nome/matrícula + filtro status
- [ ] `getMembro` retorna null em not-found (não lança)
- [ ] `npm run typecheck` exit 0; probes estáticos (grep ordenação/filtro) passam

**Tests**: probes estáticos (semântica ordenação/filtro — L-001/05)
**Gate**: quick

---

### T6: Service — `criarMembro` (conta auth + matrícula + rollback + senha 1×)

**What**: Adicionar `criarMembro(dados)` a `src/lib/admin/membros.ts`: gerar
senha-ID aleatória (≥12, letra+número); `createAdminClient().auth.admin.createUser({ email,
password, email_confirm: true, app_metadata: { role: "MEMBRO", force_password_change: true } })`;
`generateMatricula()` (RPC); insert `members` via server client; **rollback** =
`admin.deleteUser` no catch; retorna `{ membro, senhaTemporaria }`. Mapear
erro `user_already_exists` → `email_em_uso` no caller.
**Where**: `src/lib/admin/membros.ts`
**Depends on**: T5, T3
**Reuses**: `generateMatricula` (`members.ts:54`), `createAdminClient` (T3)
**Requirement**: ADMINMEM-06..12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Order de passos: createUser → matrícula → insert; catch remove o user (rollback)
- [ ] `app_metadata` com `role=MEMBRO` e `force_password_change=true` (grep)
- [ ] Senha-ID nunca armazenada nem em URL (só no retorno 1×)
- [ ] `npm run typecheck` exit 0; probes estáticos (grep createUser/rollback/senha)

**Tests**: probes estáticos (semântica do create + rollback — L-004)
**Gate**: quick

---

### T7: Service — `atualizarDadosMembro`, `transicionarStatus`, `inativarMembro`

**What**: Adicionar a `src/lib/admin/membros.ts`: `atualizarDadosMembro(id,dados)`
(update nome/nascimento/whatsapp/endereço + `atualizado_em`); `transicionarStatus(id,
novo)` com mapa `TRANSICOES = {ATIVO:[INATIVO,TRANSFERIDO], INATIVO:[ATIVO,
TRANSFERIDO], TRANSFERIDO:[]}` lançando `StatusInvalidoError`; `inativarMembro(id)` =
transição p/ INATIVO.
**Where**: `src/lib/admin/membros.ts`
**Depends on**: T5
**Reuses**: validação de limites de nascimento (padrão perfil)
**Requirement**: ADMINMEM-13..16, ADMINMEM-17..19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Mapa de transições com as 5 válidas + TRANSFERIDO terminal
- [ ] `transicionarStatus` lança erro tipado em transição inválida (→ handler 400)
- [ ] `npm run typecheck` exit 0; probes estáticos (grep mapa + erro)

**Tests**: probes estáticos (todas transições — L-003)
**Gate**: quick

---

### T8: Service — `excluirMembro` + documentos

**What**: Adicionar a `src/lib/admin/membros.ts`: `excluirMembro(id)` (se
`member_documents` não vazio → erro `MembroComDocumentosError`; senão
`auth.admin.deleteUser(auth_user_id)` via admin client + delete da linha via server
client) e `listDocumentos(memberId)`, `criarDocumento(memberId, tipo, descricao)`,
`removerDocumento(memberId, docId)` (tudo via server client; verificar existência).
**Where**: `src/lib/admin/membros.ts`
**Depends on**: T5, T3
**Reuses**: `createAdminClient` (T3), RLS docs
**Requirement**: ADMINMEM-20..23, ADMINMEM-27..31

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `excluirMembro` verifica documentos antes de apagar (conta + linha)
- [ ] `criarDocumento` valida `tipo` no serviço (check do banco já protege)
- [ ] Documentos listados ordenados `criado_em desc`
- [ ] `npm run typecheck` exit 0; probes estáticos (grep delete/documentos)

**Tests**: probes estáticos (semântica hard-delete + docs)
**Gate**: quick

---

### Phase 3: Interface HTTP (guards + route handlers)

### T9: Guards HTTP (`src/lib/admin/http.ts`)

**What**: Criar `src/lib/admin/http.ts`: `authAdmin()` retorna claims ou `401`
(`nao_autenticado`); `requireWriter()` retorna `403` p/ leitores/não-admin;
`requireHardDelete()` `403` p/ fora de ADMIN/SUPER_ADMIN; helper `erroCampos(campos)`
→ 400 `{error:"dados_invalidos", campos}`.
**Where**: `src/lib/admin/http.ts`
**Depends on**: T4
**Reuses**: `getClaims` (`claims.ts`), `isAdminWriterRole`/`isHardDeleteRole` (T4)
**Requirement**: ADMINMEM-04..05, ADMINMEM-32..34

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 401 sem sessão; 403 p/ leitor em escrita; 403 p/ SECRETARIA em hard-delete
- [ ] `npm run typecheck` exit 0; probes estáticos (grep guards)

**Tests**: probes estáticos (RBAC — L-003)
**Gate**: quick

---

### T10: Rota POST /api/admin/membros (criar)

**What**: Criar `src/app/api/admin/membros/route.ts`: `POST` — `requireWriter()`;
valida form (nome, nascimento com bounds, whatsapp, email formato, endereço
opcional) → 400 `{error,campos}`; `criarMembro` → 201 `{ member, senha_temporaria }`; mapear
`email_em_uso` → 409; erro genérico → 500.
**Where**: `src/app/api/admin/membros/route.ts`
**Depends on**: T6, T9
**Reuses**: `validarNascimento` (perfil), pois `src/lib/admin/validacao.ts` nasce aqui se necessário
**Requirement**: ADMINMEM-06..12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 201 com senha 1×; 400 por campo; 409 `email_em_uso`; 401/403 (via T9)
- [ ] `npm run typecheck` exit 0; probes estáticos (grep validação/status)

**Tests**: probes estáticos (validação + status — L-005)
**Gate**: quick

---

### T11: Rota POST /api/admin/membros/[id]/dados (editar)

**What**: Criar `src/app/api/admin/membros/[id]/dados/route.ts`: `requireWriter()`;
`await params`; valida (nome/nascimento/whatsapp + endereço opcional) → 400;
`atualizarDadosMembro` → 200 `{member}`; membro inexistente → 404.
**Where**: `src/app/api/admin/membros/[id]/dados/route.ts`
**Depends on**: T7, T9
**Reuses**: guard (T9), validação (padrão T10)
**Requirement**: ADMINMEM-13..16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 200/400/404 conforme ACs; `params` é `await` (Next 16)
- [ ] `npm run typecheck` exit 0; probes estáticos (grep guard/validação)

**Tests**: probes estáticos
**Gate**: quick

---

### T12: Rota POST /api/admin/membros/[id]/status (ciclo de vida)

**What**: Criar `src/app/api/admin/membros/[id]/status/route.ts`: `requireWriter()`;
`await params`; corpo `status`; `transicionarStatus` → 200 `{member}`; transição
inválida → 400 `status_transicao_invalida`; 404 se membro não existe.
**Where**: `src/app/api/admin/membros/[id]/status/route.ts`
**Depends on**: T7, T9
**Reuses**: `transicionarStatus` (T7)
**Requirement**: ADMINMEM-17..19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Transição válida → 200; INATIVO→ATIVO→...→TRANSFERIDO→X → 400; 404
- [ ] `npm run typecheck` exit 0; probes estáticos (grep mapa no handler)

**Tests**: probes estáticos
**Gate**: quick

---

### T13: Rota DELETE /api/admin/membros/[id] (hard-delete)

**What**: Criar `src/app/api/admin/membros/[id]/route.ts`: `DELETE` — `requireHardDelete()`;
`await params`; `excluirMembro` → 204; `MembroComDocumentosError` → 409; 404 se
membro não existe; 403 p/ SECRETARIA (via guard).
**Where**: `src/app/api/admin/membros/[id]/route.ts`
**Depends on**: T8, T9
**Reuses**: `excluirMembro` (T8), `requireHardDelete` (T9)
**Requirement**: ADMINMEM-20..23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 204 limpa (conta auth removida também); 409 com documentos; 403 SECRETARIA
- [ ] `npm run typecheck` exit 0; probes estáticos (grep guard + 409)

**Tests**: probes estáticos
**Gate**: quick

---

### T14: Rota POST /api/admin/membros/[id]/documentos (criar metadado)

**What**: Criar `src/app/api/admin/membros/[id]/documentos/route.ts`: `requireWriter()`;
`await params`; valida `tipo ∈ {RG,CPF,comprovante_endereco,outro}` → 400; `criarDocumento`
→ 201 `{documento}`; 404 se membro ausente.
**Where**: `src/app/api/admin/membros/[id]/documentos/route.ts`
**Depends on**: T8, T9
**Reuses**: `criarDocumento` (T8)
**Requirement**: ADMINMEM-27..28, ADMINMEM-31

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 201 com tipo válido; 400 tipo inválido; 404 membro inexistente
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos
**Gate**: quick

---

### T15: Rota DELETE /api/admin/membros/[id]/documentos/[docId]

**What**: Criar `src/app/api/admin/membros/[id]/documentos/[docId]/route.ts`:
`requireWriter()`; `await params` (dois ids); `removerDocumento` → 204; 404.
**Where**: `src/app/api/admin/membros/[id]/documentos/[docId]/route.ts`
**Depends on**: T8, T9
**Reuses**: `removerDocumento` (T8)
**Requirement**: ADMINMEM-30..31

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 204 ao remover; 404 doc/membro inexistente; sem regressão nos demais
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos
**Gate**: quick

---

### Phase 4: UI (cartão, lista, novo, detalhe, nav)

### T16: Extração do `MemberCard`

**What**: Criar `src/components/MemberCard.tsx` (presentacional, `id="cartao-membro"`,
props `member: Member`), movendo o bloco do cartão de `cartao/page.tsx:78-132`
(cabeçalho igreja, foto/placeholder, nome, matrícula, rodapé igreja).
**Where**: `src/components/MemberCard.tsx`
**Depends on**: None
**Reuses**: `CHURCH` (`constants.ts`), `UserRound` (lucide)
**Requirement**: ADMINMEM-25

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Componente exportado com `id="cartao-membro"` e imagens/foto com alt correto
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep do componente)
**Gate**: quick

---

### T17: Re-uso do `MemberCard` no `/painel/cartao`

**What**: Reescrever `src/app/painel/cartao/page.tsx` para usar `MemberCard`
(mantendo o fluxo atual: sessão → falha amigável → redirect sem cadastro → card +
print). Sem mudança de comportamento.
**Where**: `src/app/painel/cartao/page.tsx`
**Depends on**: T16
**Reuses**: `MemberCard` (T16), `PrintButton`
**Requirement**: ADMINMEM-25 (não-regressão PAINEL-09..12)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Page renderiza `MemberCard`; probes antigos do painel-membro continuam verdes
      (`bash scripts/probes-painel.sh` no servidor)
- [ ] `npm run typecheck` exit 0

**Tests**: probes (regressão painel-membro) + typecheck
**Gate**: full (após start do servidor)

---

### T18: Página do cartão no admin

**What**: Criar `src/app/admin/membros/[id]/cartao/page.tsx`: `await params`;
`getMembro(id)` → 404 se ausente; renderiza `MemberCard` + `PrintButton` + link
voltar; `foto_url`/placeholder vêm do `MemberCard`.
**Where**: `src/app/admin/membros/[id]/cartao/page.tsx`
**Depends on**: T16, T5
**Reuses**: `MemberCard` (T16), `getMembro` (T5)
**Requirement**: ADMINMEM-25..26

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 200 com cartão p/ id do seed; 404 p/ id inexistente
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos + runtime (404)
**Gate**: full (com servidor)

---

### T19: Página de listagem `/admin/membros` + nav no landing

**What**: Criar `src/app/admin/membros/page.tsx`: lê `searchParams` (`q`, `status`);
`listMembros`; tabela/cards com nome, matrícula, situação, ações (ver/detalhe/cartão);
filtro de status e busca no form.
**Where**: `src/app/admin/membros/page.tsx`
**Depends on**: T5
**Reuses**: `listMembros` (T5), layout section/max-w do padrão, `lucide-react`
**Requirement**: ADMINMEM-01..05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 200 sem `q` (orde `nome asc`); filtra por `q` e `status` via searchParams
- [ ] Estado vazio ("Nenhum membro encontrado") quando filtro não retorna nada
- [ ] `npm run typecheck` exit 0; probes estáticos (grep ordenação/filtro)

**Tests**: probes estáticos + runtime (200/307)
**Gate**: full (com servidor)

---

### T20: Página de novo membro + form client (senha 1×)

**What**: Criar `src/app/admin/membros/novo/page.tsx` (server) + `membro-novo-form.tsx`
(client, padrão F4): campos nome/nascimento/whatsapp/email + endereço; `POST
/api/admin/membros` via fetch; 201 → exibir senha temporária **1×** (botão copiar e
continuar p/ `/admin/membros/[id]`, sem senha em URL); 400 → erros por campo; 409 →
mensagem `email_em_uso`.
**Where**: `src/app/admin/membros/novo/` (page.tsx + membro-novo-form.tsx)
**Depends on**: T10
**Reuses**: padrão `perfil-form.tsx` (F4), `fetch` de API
**Requirement**: ADMINMEM-06..12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Fluxo feliz: 201 + senha exibida no estado do form; navegação sem senha na URL
- [ ] 400 mapeia campos; 409 mostra aviso
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep fetch/form) + runtime (via T23)
**Gate**: quick

---

### T21: Página de detalhe `[id]` (dados + ciclo de vida + docs)

**What**: Criar `src/app/admin/membros/[id]/page.tsx`: `await params`; `getMembro` +
`listDocumentos` (404); mostra matrícula/situação/contatos/endereço; forms server:
dados (`POST .../dados`), transição (`.../status`, inclui botão "Remover" →
`status=INATIVO`), novo documento (`.../documentos`), lista + remover doc; botão
cartão; hard-delete client confirm (`DELETE .../[id]`).
**Where**: `src/app/admin/membros/[id]/page.tsx`
**Depends on**: T11, T12, T14, T15 (forms), T5
**Reuses**: `getMembro`/`listDocumentos`, forms server no padrão do repo
**Requirement**: ADMINMEM-13..23, ADMINMEM-24, ADMINMEM-27..31

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 200 com todos os blocos; 404 p/ id inexistente; forms apontam para as rotas certas
- [ ] Leitor vê a página mas o hard-delete não aparece (guard de UI)
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep rotas dos forms) + runtime (via T23)
**Gate**: quick

---

### T22: Refino de UX do admin (navegação e estados vazios)

**What**: Ajustar `src/app/admin/page.tsx`: adicionar link "Membros" na navegação do
landing admin + garantir estado vazio da listagem com mensagem amigável (Já coberto
na T19 — este crafting foca na entrada de navegação).
**Where**: `src/app/admin/page.tsx`
**Depends on**: T19
**Reuses**: padrão de estado vazio dos eventos (`EVENTS`)
**Requirement**: ADMINMEM-01..03 (estado vazio), RNF-001

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Navegação do landing admin lista Membros (link para `/admin/membros`)
- [ ] `npm run typecheck` exit 0

**Tests**: probes estáticos (grep estado vazio)
**Gate**: quick

---

### Phase 5: Probes (e2e agregado, re-runnable)

### T23: Probes `scripts/probes-admin-membros.sh` (e2e re-runnable)

**What**: Criar `scripts/probes-admin-membros.sh` (padrão probes-painel): seção
estática (greps 0006/0007, libs, guards, rotas, forms) + seção runtime com sessões
reais (`admin.teste@ivc.local` escrita, `leitor.teste@ivc.local` leitura): lista
200/ordenação; create 201 (email `$RANDOM`) + login do novo membro → 307
`/trocar-senha`; create inválido 400; email duplicado 409; dados 200/400; status
200/400; docs 201/400/204; hard-delete 204/409/403; RBAC 401/403; cartão 200/404;
**cleanup** (hard-delete do criado) → re-runnável. Registrar no package.json
`"probe:admin-membros"`.
**Where**: `scripts/probes-admin-membros.sh` (+ `package.json`)
**Depends on**: T10, T11, T12, T13, T14, T15, T18, T19, T20, T21
**Reuses**: estrutura `scripts/probes-painel.sh`
**Requirement**: ADMINMEM-01..39 (cobertura por AC)

**Tools**:
- MCP: `supabase` (verificar/compor estado do dev se preciso)
- Skill: NONE

**Done when**:
- [ ] `BASE_URL=http://localhost:3000 bash scripts/probes-admin-membros.sh` → 0 falhas
      (2 corridas consecutivas verdes; discriminações de mutação em mente do verifier)
- [ ] Cleanup remove o membro + conta criados; email `$RANDOM` evita colisão
- [ ] `npm run probe:admin-membros` idempotente frente a reruns
- [ ] Gates: `npm run lint && npm run typecheck && npm run build` verdes

**Tests**: probes (e2e runtime + estático agregado)
**Gate**: full

---

## Phase Execution Map

```
Phase 1:  T1 · T2 · T3 · T4   (independentes)
Phase 2:  T5 ——→ T6
          T5 ——→ T7
          T5 ——→ T8
Phase 3:  T9 ——→ T10
          T9 ——→ T11
          T9 ——→ T12
          T9 ——→ T13
          T9 ——→ T14
          T9 ——→ T15
Phase 4:  T16——→ T17
          T16——→ T18
          T19——→ T22
          T20 (via T10, T6)
          T21 (via T11,T12,T14,T15,T5)
Phase 5:  T23
```

Execução estritamente sequencial (um commit atômico por task). Tasks com deps
cross-phase apontam para trás (fases anteriores) — permitido; batches só cortam em
fronteira de fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1, T2 | 1 migration cada | ✅ Granular |
| T3, T4 | 1 lib cada | ✅ Granular |
| T5..T8 | 1 arquivo service (evolução por commit) | ✅ Granular |
| T9 | 1 lib de guards | ✅ Granular |
| T10..T15 | 1 route handler cada | ✅ Granular |
| T16..T22 | 1 componente/página cada | ✅ Granular |
| T23 | 1 script de probes | ✅ Granular |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1, T2 | Migration/schema/RLS | probe estático (grep `.sql`) | probes estáticos | ✅ OK |
| T3, T4 | Service/DAL helpers | probe estático + typecheck | probes estáticos | ✅ OK |
| T5..T8 | Service/DAL | probe estático por semântica | probes estáticos | ✅ OK |
| T9 | Service/DAL (guards) | probe estático | probes estáticos | ✅ OK |
| T10..T15 | Route Handlers | probe estático + e2e runtime agregado (T23) | probes estáticos (+ runtime em T23) | ✅ OK |
| T16 | Component presentacional | probe estático | probe estático | ✅ OK |
| T17 | Página RSC (refactor) | probe regressão + typecheck | probes regressão (probes-painel) | ✅ OK |
| T18..T21 | Páginas RSC | probe + e2e runtime agregado (T23) | probes estáticos (+ runtime em T23) | ✅ OK |
| T22 | Página RSC (UX) | probe estático | probe estático | ✅ OK |
| T23 | Probes e2e (agregado) | probe runtime e2e completo | probes (e2e + estático agregado) | ✅ OK |