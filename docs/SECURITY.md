# Segurança — IVC

> Segurança e adequação à LGPD derivam de **AD-004** (Auth.js, sessões separadas,
> senha-ID no 1º acesso) e **AD-003** (RLS no Supabase). Requisitos: RNF-004/005/008,
> RN-002 e RN-004. LGPD em profundidade: `docs/LGPD.md`.

## Postura

Segurança em profundidade: **autenticação → autorização (RBAC) → camada de dados (RLS)
→ registro de auditoria**. Toda decisão de permissão acontece no **servidor**; o
cliente nunca decide o que pode acessar.

## Autenticação (Auth.js / NextAuth, AD-004)

- Sessões **separadas** entre **membro** e **administrador** (mesmo app, contextos isolados).
- **1º acesso**: senha-ID temporária (hash) distribuída pela liderança → troca
  **obrigatória** no primeiro login (RN-002); senha-ID expira após o uso.
- Cookies de sessão `httpOnly`, `secure`, `sameSite`; sessão server-side (SSR).
- Hashes de senha forte (ex.: bcrypt/argon2 via adapters — definido na implementação).
- Proteção de brute-force: rate limiting no login (a granularidade entra na feature de auth).

## Autorização — RBAC (RF-031 / RF-032)

| Papel | Escopo sugerido (matriz RF-032 detalhada na spec de auth) |
| ----- | -------------------------------------------------------- |
| MEMBRO | Próprio perfil/foto; avisos; QR de dízimo; cartão de membro |
| SECRETARIA | Cadastro de membros, eventos, documentos |
| LIDER | Conteúdo/liderança, visibilidade de eventos |
| FINANCEIRO | Financeiro (PIX, webhook, conciliação, fechamento), relatórios |
| PATRIMONIAL | Patrimônio |
| ADMIN | Configurações, usuários/permissões, conteúdo do portal |
| SUPER_ADMIN | Tudo + gestão de papéis/auditoria |

- Middleware/autorização **por rota e por ação** (ler/escrever/administrar por módulo).
- Regras centralizadas (constantes de permissão), nunca espalhadas no componente.

## RLS — Row Level Security (Supabase, AD-003)

- Políticas por tabela baseadas no papel da sessão (`jwt.claims.role`) e na propriedade
  do registro (ex.: membro lê somente o próprio registro).
- Storage: buckets com policies — foto do membro privada ao próprio + papéis autorizados.
- RLS é camada **defensiva adicional**; a autorização de negócio fica no domínio.

## Segredos e configuração

- Variáveis de ambiente (`.env.local`, CI/git ignorado): `DATABASE_URL`, JWT/Auth,
  Supabase keys, Resend, Mercado Pago (chave PIX/credenciais). Nunca commitadas.
- Configuração do portal (chave PIX, WhatsApp, etc.) também administrável no painel
  (RF-029) — credenciais sensíveis ficam em env, não em CMS.
- Auditoria de **toda ação administrativa sensível** (RN-004): `audit_logs` com autor,
  ação, entidade, timestamp (IP/UA quando aplicável).

## Integrações externas

- **Mercado Pago (webhook, AD-009):** validação de assinatura do webhook e
  idempotência (`webhook_events`); nunca confiar apenas na notificação — conciliar com a
  consulta de pagamento quando necessário.
- **Resend:** e-mails transacionais (1º acesso, avisos) sem expor chaves ao cliente.
- **Supabase:** service-role key **só no servidor**; clientes usam keys anon + RLS.

## Controles mínimos de app (web)

- Headers de segurança (CSP, X-Content-Type-Options, HSTS) — configuração no deploy.
- Validação de entrada no servidor (zod/schemas Drizzle) em actions/routes.
- Sem dados sensíveis em logs (ver `OBSERVABILITY.md`).

## Auditoria (RN-004)

- Tabela `audit_logs` alimentada por ação administrativa sensível; consultável no painel
  (RF-030) por quem tem papel de auditoria (SUPER_ADMIN).

## Referências

- `docs/LGPD.md` — privacidade de dados e consentimentos
- `docs/ARCHITECTURE.md` — camada de auth/pagamentos
- `docs/DATABASE.md` — RLS, storage, auditoria
- `docs/REQUIREMENTS.md` — RNF-004/005/008, RN-002/004, RF-031/032