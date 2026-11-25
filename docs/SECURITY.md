# Segurança — IVC

> Segurança e adequação à LGPD derivam de **AD-013** (Supabase Auth), **AD-003**
> (RLS no Supabase) e **AD-015** (RBAC na tabela `permissions`). Requisitos:
> RNF-004/005/008, RN-002 e RN-004. LGPD em profundidade: `docs/LGPD.md`.

## Postura

Segurança em profundidade: **autenticação → autorização (RBAC) → camada de dados (RLS)
→ registro de auditoria**. Toda decisão de permissão acontece no **servidor**; o
cliente nunca decide o que pode acessar.

## Autenticação (Supabase Auth, AD-013)

- Supabase Auth (GoTrue) com `@supabase/ssr` e sessão em cookies gerenciados pelo servidor (`SameSite=Lax`).
- Logins separados: `/login` para membros e `/login/admin` para a liderança.
- O papel do usuário fica em `app_metadata.role`, não editável pelo cliente e lido
  server-side.
- **Primeiro acesso:** senha-ID temporária entregue manualmente pela liderança, com
  troca obrigatória. A flag `app_metadata.force_password_change` bloqueia as áreas
  protegidas até a troca.
- O GoTrue aplica seus próprios limites de tentativa de login; não há camada extra de
  rate limiting no app.

## Autorização — RBAC (AD-015)

| Papel | Escopo |
| ----- | ------ |
| MEMBRO | Próprio perfil/foto; avisos; QR de dízimo; cartão de membro |
| SECRETARIA | Escreve membros e eventos; lê os demais módulos |
| LIDER | Lê os módulos administrativos |
| FINANCEIRO | Escreve financeiro e relatórios; lê os demais |
| PATRIMONIAL | Escreve patrimônio; lê os demais |
| ADMIN | Administra todos os módulos |
| SUPER_ADMIN | Administra todos os módulos e a matriz de permissões |

- A matriz fica na tabela `permissions` (PK `(role, module)`, níveis hierárquicos
  `ler`/`escrever`/`administrar`) e é consultada por `can(papel, módulo, nível)` no
  servidor.
- `proxy.ts` faz o gate grosseiro por área (`/painel`, `/admin`); a decisão fina é do
  servidor e das policies de RLS.
- A edição da matriz é restrita a quem tem `administrar` no módulo `usuarios`.

## RLS — Row Level Security (Supabase, AD-003)

- Policies por tabela baseadas no papel do JWT (`auth_role()`) e na propriedade do
  registro (ex.: membro lê somente o próprio cadastro).
- O acesso fino usa `can_access(module, nivel)`, uma função `SECURITY DEFINER` que
  consulta `permissions` e falha fechada (sem linha = nega).
- Storage: buckets de fotos públicos para leitura, com escrita restrita por RLS; o
  bucket `documentos` é privado e usa URL assinada de curta duração.
- RLS é camada **defensiva adicional**; a autorização de negócio fica no domínio.

## Segredos e configuração

- Variáveis de ambiente (`.env.local`, CI/git ignorado): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`),
  `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN`. Nunca
  commitadas.
- Configuração do portal (WhatsApp, chave PIX, dados institucionais) também é
  administrável no painel (RF-029) e fica na tabela `settings`.
- Auditoria de **toda ação administrativa sensível** (RN-004): `audit_logs` com autor,
  ação, entidade e timestamp.

## Integrações externas

- **Supabase:** a service-role key é usada apenas no servidor (webhook, seed e rotas
  administrativas específicas); os clientes comuns usam a chave publishable + RLS.
- **Mercado Pago (webhook, AD-009):** o endpoint atual é um stub idempotente que
  registra `webhook_events` e cria a transação quando o pagamento é aprovado. A
  validação de assinatura entra junto com a configuração das credenciais reais.
- **Sentry:** captura de erros sem PII (ver `OBSERVABILITY.md`).

## Controles mínimos de app (web)

- Validação de entrada no servidor, feita nos services e nas rotas, sem depender de
  schema externo.
- Sem dados sensíveis em logs; o logger aplica sanitização recursiva de PII.
- Cabeçalhos de segurança adicionais podem ser configurados no `next.config.ts` em
  iteração futura; não fazem parte do MVP atual.

## Auditoria (RN-004)

- Tabela `audit_logs` alimentada por ação administrativa sensível; consultável em
  `/admin/auditoria` por quem tem permissão de leitura no módulo `auditoria`.

## Referências

- `docs/LGPD.md` — privacidade de dados e consentimentos
- `docs/ARCHITECTURE.md` — camadas de auth e pagamentos
- `docs/DATABASE.md` — RLS, storage e auditoria
- `docs/REQUIREMENTS.md` — RNF-004/005/008, RN-002/004, RF-031/032
