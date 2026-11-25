# API — IVC

Contratos de **rotas** (App Router Next.js 16) e **integrações externas**. As rotas
exatas de cada feature estão implementadas em `src/app`; aqui está a **visão de
contrato** consolidada.

## Princípios de contrato

- Rotas de leitura → páginas renderizadas no servidor.
- CRUD administrativo → Route Handlers com verbo REST (`GET/POST/PATCH/DELETE`).
- **Toda mutação requer sessão + autorização (RBAC)** — ver `SECURITY.md`.
- Payload em JSON; validação no servidor; erros no formato `{ "error": "codigo" }`.
- Webhook: idempotência e log em `webhook_events` (RF-026, AD-009).

## Áreas e namespace (organização por grupos de rotas)

### Portal público (visitante)

| Rota | Método | Origem | Comportamento |
| ---- | ------ | ------ | ------------- |
| `/` (Home, Sobre, Liderança, Localização, Cultos, Redes) | GET | RF-001..005 | Conteúdo institucional |
| `/eventos` ; `/eventos/[id]` | GET | RF-006 | Listagem/detalhe; "inscrever-se" → WhatsApp (RN-003) |
| `/doacao` | GET | RF-007 | QR PIX público (RN-001) |
| `/login` | GET | RF-008 | Porta de entrada aos painéis |

### Painel do membro (sessão membro)

| Rota | Método | Origem | Comportamento |
| ---- | ------ | ------ | ------------- |
| `/painel` (avisos) | GET | RF-012 | Avisos de eventos |
| `/painel/dizimo` (QR) | GET | RF-013 | QR code de dízimo do membro |
| `/painel/cartao` | GET | RF-014 | Cartão de membro |
| `/painel/perfil` | GET/PATCH | RF-015 | Editar dados + foto 4x4 (1º acesso troca senha) |

### Painel administrativo (sessão admin + RBAC)

| Rota | Método | Origem | Comportamento |
| ---- | ------ | ------ | ------------- |
| `/admin` | GET | RF-021 | Dashboard |
| `/admin/membros` + `/admin/membros/[id]` | CRUD | RF-022 | CRUD + ciclo de vida + cartão + documentos |
| `/admin/lideranca` | CRUD | RF-023 | Igrejas/Liderança |
| `/admin/eventos` + `/admin/eventos/[id]` | CRUD | RF-024 | CRUD + visibilidade |
| `/admin/patrimonio` | CRUD | RF-025 | Patrimônio |
| `/admin/financeiro` | CRUD/GET | RF-026, RN-001.1 | Receitas/despesas/doações PIX, conciliação, fechamento |
| `/admin/relatorios` | GET | RF-027 | Relatórios/Documentos |
| `/admin/usuarios` | CRUD | RF-028, RF-032 | Usuários/Permissões (RBAC) |
| `/admin/configuracoes` | CRUD | RF-029 | Portal/CMS, WhatsApp, chave PIX, dados institucionais |
| `/admin/auditoria` | GET | RF-030, RN-004 | Trilha de auditoria |

### API (Route Handlers)

| Namespace | Rotas | Comportamento |
| --------- | ----- | ------------- |
| `/api/auth` | `login`, `login/admin`, `logout`, `trocar-senha`, `atualizar-senha` | Sessão Supabase e troca de senha |
| `/api/painel` | `perfil`, `perfil/foto` | Dados e foto do próprio membro |
| `/api/admin` | `membros`, `lideres`, `igrejas`, `eventos`, `patrimonio`, `financeiro`, `relatorios`, `usuarios`, `configuracoes`, `auditoria`, `assets` | CRUD administrativo com RBAC |
| `/api/health` | `GET` | Health check público e raso |
| `/api/webhooks/mercadopago` | `POST` | Notificações de pagamento PIX |

### Webhook

| Rota | Método | Origem | Comportamento |
| ---- | ------ | ------ | ------------- |
| `/api/webhooks/mercadopago` | POST | RF-026, AD-009 | Stub idempotente: grava `webhook_events` e cria a transação quando o pagamento é aprovado. A validação de assinatura entra com as credenciais reais |

## Integrações externas

| Serviço | Uso | Contrato |
| ------- | --- | -------- |
| **Supabase (Postgres + Auth + Storage)** | Persistência, autenticação e arquivos | Clients `@supabase/ssr` e SDK server-side; RLS; service-role só no servidor |
| **Supabase Auth (GoTrue)** | Sessões de membro e admin | `app_metadata.role`, `force_password_change` e cookies httpOnly |
| **Mercado Pago** | Webhook de pagamentos PIX | Stub idempotente com `webhook_events`; assinatura na integração real |
| **Sentry** | Observabilidade | Captura de erros sem PII (errors-only) |

## Padrões de resposta e erro

- Sucesso: `200` (leitura), `201` (criação), `204` (exclusão).
- Erros comuns: `400` validação · `401` não autenticado · `403` sem permissão ·
  `404` não encontrado · `422` regra de negócio · `500` erro interno.
- Corpo de erro: `{ "error": "codigo" }` (ex.: `payload_invalido`, `nao_autorizado`).

## Versionamento

- Admin usa rotas versionadas por feature (ex.: `/admin/...`) — sem API pública externa
  no MVP; versionamento formal só se surgir consumo de terceiros.
- Webhook segue a versão do Mercado Pago (contrato do provedor).

## Segurança da camada API

- Sessões separadas membro/admin; `proxy.ts` faz o gate de área e o RBAC fino é do servidor.
- Limites de tentativa de login do GoTrue; webhook idempotente por `event_id`.
- Validação de payload no servidor; sem segredos em respostas ou logs.

## Referências

- `docs/ARCHITECTURE.md` — Ports & Adapters (contratos de integração)
- `docs/SECURITY.md` — autenticação, RBAC, webhook seguro
- `docs/DATABASE.md` — persistência por trás das rotas
- `docs/REQUIREMENTS.md` — RF/RNF de origem por rota