# Banco de Dados — IVC

> Decisões de persistência derivam de **AD-003** (PostgreSQL via Supabase) e
> **AD-014** (migrações SQL puras versionadas). Drizzle ORM permanece como evolução
> futura e não é usado no MVP. Os requisitos RF/RNF/RN estão em
> `docs/REQUIREMENTS.md`.

## Provedor e tooling

| Item | Escolha | Nota |
| ---- | ------- | ---- |
| Banco | PostgreSQL (Supabase, plano free) | Integridade financeira |
| Migrações | SQL puro em `supabase/migrations/` | 28 migrações versionadas |
| Auth | Supabase Auth (GoTrue) | Tabela `auth.users` gerenciada pelo Supabase |
| Storage | Supabase Storage | Buckets privados de fotos e documentos |
| RLS | Row Level Security | Policies com `auth_role()` e `can_access()` |

## Princípios

- Dados vivem no Postgres; **RLS aplicado** por policy por papel (ver `SECURITY.md`).
- Schema versionado em SQL; nunca se altera o banco à mão em produção.
- Volume baixo (1 templo, ~30–50 membros, ~30 lançamentos/mês, ~20 doações/mês) —
  modelo simples, sem denormalização prematura (AD-001).
- Escritas sensíveis usam o client service-role apenas no servidor; o restante passa
  por RLS com a sessão do usuário.

## Tabelas

### Identidade e acesso

- **`auth.users`** — contas gerenciadas pelo Supabase Auth. O papel fica em
  `app_metadata.role` e a flag de primeiro acesso em `app_metadata.force_password_change`.
- **`members`** — cadastro do membro: `auth_user_id`, nome, nascimento, WhatsApp,
  matrícula, foto, endereço, RG, CPF, data de batismo, status
  (ATIVO/INATIVO/TRANSFERIDO) e validade do cartão.
- **`permissions`** — matriz RBAC com PK `(role, module)` e nível
  `ler`/`escrever`/`administrar`. É a fonte única do acesso fino (AD-015).

### Portal e conteúdo

- **`churches`** — templo (um hoje, topologia evoluível).
- **`leaders`** — liderança institucional, com foto no bucket `fotos-lideranca`.
- **`events`** — eventos do portal, com visibilidade e exclusão lógica.
- **`event_notices`** — avisos exibidos na área do membro.

### Financeiro (PIX — AD-009)

- **`transactions`** — receitas e despesas, com categoria, status e autoria.
- **`cash_closes`** — snapshot imutável de fechamento de caixa.
- **`webhook_events`** — log idempotente das notificações do Mercado Pago.

### Administrativo

- **`assets`** — inventário de patrimônio.
- **`documents`** — documentos administrativos categorizados.
- **`member_documents`** — metadados de documentos entregues pelo membro.
- **`audit_logs`** — trilha append-only das ações administrativas sensíveis.
- **`settings`** — configurações globais em chave-valor JSONB.

## Storage

- **`fotos-membros`** — foto 4x4 do membro; leitura pelo próprio membro e por papéis
  administrativos.
- **`fotos-lideranca`** — fotos da liderança exibidas no portal.
- **`documentos`** — documentos do painel administrativo; download por URL assinada.

## RLS (postura)

- Policies por tabela baseadas no papel do JWT (`auth_role()`) e na propriedade do
  registro (ex.: membro lê apenas o próprio cadastro).
- O acesso fino usa `can_access(module, nivel)`, uma função `SECURITY DEFINER` que
  consulta `permissions` e falha fechada quando não há linha.
- Tabelas de leitura pública (conteúdo do portal) têm policy para `anon`; o restante
  exige `authenticated` com permissão.

## Backup e integridade

- **RPO ≤ 24h / RTO ≤ 4h** (RNF-006) — fornecido pelo Supabase (PITR/backup no plano;
  documentar como política de restauração). Detalhes operacionais em `DEPLOYMENT.md`.

## Referências

- `docs/ARCHITECTURE.md` — camadas e isolamento
- `docs/SECURITY.md` — RLS, RBAC e auditoria
- `docs/REQUIREMENTS.md` — RF/RNF/RN de origem
