# API — IVC

Contratos de **rotas** (App Router Next.js 16) e **integrações externas**. As rotas
exatas de cada feature são detalhadas nas specs da Fase 9; aqui está a **visão de
contrato** consolidada (REST/Server Actions).

## Princípios de contrato

- Rotas de leitura → **Server-rendered pages + Route Handlers/Server Actions** no servidor.
- CRUD administrativo → Route Handlers com verbo REST (`GET/POST/PATCH/DELETE`).
- **Toda mutação requer sessão + autorização (RBAC)** — ver `SECURITY.md`.
- Payload em JSON; validação no servidor (schemas); respostas de erro padronizadas:
  `{ "error": { "code", "message" } }`.
- Webhook industrioso: segredo/assinatura, idempotência, log (RF-026, AD-009).

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

### Webhook

| Rota | Método | Origem | Comportamento |
| ---- | ------ | ------ | ------------- |
| `/api/webhooks/mercadopago` | POST | RF-026, AD-009 | Recebe notificações PIX: valida assinatura, idempotenta, grava `webhook_events`, atualiza financeiro |

## Integrações externas

| Serviço | Uso | Contrato |
| ------- | --- | -------- |
| **Supabase (Postgres+Auth+Storage)** | Persistência, auth, arquivos | Drizzle (SQL) + SDK server-side; service-role só no servidor; RLS | 
| **Auth.js (NextAuth)** | Sessões membro/admin | Handlers de auth; callbacks de sessão; 1º acesso com troca de senha (RN-002) |
| **Mercado Pago** | Cobrança PIX + webhook | SDK/API MP; gerar QR/cobrança; webhook com assinatura; conciliação (RN-001.1) |
| **Resend** | E-mail transacional | SDK Resend; envio de 1º acesso/avisos; template em `mailer` Port |

## Padrões de resposta e erro

- Sucesso: `200` (leitura), `201` (criação), `204` (exclusão).
- Erros comuns: `400` validação · `401` não autenticado · `403` sem permissão ·
  `404` não encontrado · `422` regra de negócio · `500` erro interno.
- Corpo de erro: `{ "error": { "code": "VALIDATION", "message": "…" } }`.

## Versionamento

- Admin usa rotas versionadas por feature (ex.: `/admin/...`) — sem API pública externa
  no MVP; versionamento formal só se surgir consumo de terceiros.
- Webhook segue a versão do Mercado Pago (contrato do provedor).

## Segurança da camada API

- Sessões separadas membro/admin; middlewares de rota por papel.
- Rate limiting no login e no webhook (abuso/brute-force).
- Validação de payload no servidor; CSP/headers; sem segredos em respostas ou logs.

## Referências

- `docs/ARCHITECTURE.md` — Ports & Adapters (contratos de integração)
- `docs/SECURITY.md` — autenticação, RBAC, webhook seguro
- `docs/DATABASE.md` — persistência por trás das rotas
- `docs/REQUIREMENTS.md` — RF/RNF de origem por rota