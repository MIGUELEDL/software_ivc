# Arquitetura — IVC

> Decisões derivam de **AD-002** (monólito modular), **AD-013** (Supabase Auth),
> **AD-014** (migrações SQL) e **AD-015** (RBAC no banco). Este documento consolida a
> forma final da implementação.

## Visão de alto nível

**Monólito modular** em Next.js 16 (App Router + Route Handlers), deploy único,
organizado por domínio. O portal público, a área do membro e o painel administrativo
compartilham o mesmo app e o mesmo banco Supabase. As integrações externas ficam
isoladas em `src/lib`.

```
Navegador (visitante / membro / admin)
        │ HTTPS
        ▼
Next.js 16 (App Router)
├── Portal público:  /  /eventos  /doacao
├── Área do membro:  /painel/*
├── Painel admin:    /admin/*
└── Route Handlers:  /api/*
        │
        ├── Supabase (PostgreSQL + Auth + Storage, com RLS)
        ├── Mercado Pago (webhook PIX)
        └── Sentry (captura de erros)
```

## Decisões principais

| Aspecto | Decisão | ADR |
| ------- | ------- | --- |
| Estilo | Monólito modular, deploy único | AD-002 |
| Banco | PostgreSQL via Supabase (Auth + Storage inclusos) | AD-003 |
| Persistência | SQL puro versionado em `supabase/migrations/` | AD-014 |
| Autenticação | Supabase Auth (GoTrue) via `@supabase/ssr`; logins separados de membro e admin; papel em `app_metadata.role` | AD-013 |
| Autorização | RBAC por módulo na tabela `permissions`, consultado por `can()` e `can_access()` | AD-015 |
| Dados institucionais | `src/lib/constants.ts` como fonte única | AD-008 |
| Pagamentos | PIX no MVP; webhook do Mercado Pago | AD-009 |
| Observabilidade | Sentry errors-only, logger JSON sem PII e `GET /api/health` | AD-033 |
| Processo | Spec-driven (`tlc-spec-driven`), verificação independente por feature | AD-005 |

## Estrutura de pastas

```
src/
├── app/                    # Rotas: portal, área do membro, admin e API
│   ├── admin/              # Painel administrativo
│   ├── painel/             # Área do membro
│   ├── api/                # Route Handlers (auth, admin, painel, webhook, health)
│   ├── eventos/            # Listagem e detalhe público
│   ├── doacao/             # QR PIX público
│   └── login/              # Entradas de membro e de admin
├── components/             # Componentes de interface (portal e admin)
├── lib/
│   ├── admin/              # Serviços do painel administrativo
│   ├── auth/               # Claims, RBAC e guards
│   ├── barcode/            # Codificador Code 128
│   ├── observability/      # Release, logger e Sentry
│   ├── painel/             # Serviços da área do membro
│   └── supabase/           # Clients server, browser e admin
├── proxy.ts                # Gate de rota por área (membro/admin)
supabase/migrations/        # Schema versionado (28 migrações)
scripts/                    # Seed, probes e smoke tests
.specs/                     # Especificações por feature e decisões
docs/                       # Documentação transversal
```

## Modelo de renderização

| Área | Estratégia | Justificativa |
| ---- | ---------- | ------------- |
| Portal público | Renderização sob demanda (dynamic) | Lê configurações, eventos e liderança do banco |
| Área do membro | SSR com sessão Supabase em cookies httpOnly | Dados privados por membro |
| Painel administrativo | SSR com RBAC no servidor e RLS | Decisão de acesso centralizada |
| Mutações | Route Handlers em `src/app/api` | Validação e autorização no servidor |
| Webhook Mercado Pago | Route Handler dedicado (POST) | Recebe notificações de pagamento |

## Camadas e isolamento

- `src/app` é a borda HTTP: páginas e Route Handlers.
- `src/lib/admin` e `src/lib/painel` concentram regras de negócio e acesso a dados.
- `src/lib/auth` resolve claims da sessão, o gate de área (`proxy.ts`) e o RBAC fino.
- `src/lib/supabase` encapsula os clients server, browser e service-role.
- `src/lib/observability` concentra release, logger anti-PII e captura de erros.
- `src/lib/barcode` e `src/lib/pix` são domínio puro, cobertos por testes e mutação.
- `supabase/migrations` é a fonte única do schema; `scripts` contém seed, probes e smoke.

## Fluxos críticos

1. **Login de membro e de admin:** `/login` e `/login/admin` autenticam no Supabase
   Auth. O papel vem de `app_metadata.role`, não editável pelo cliente. A flag
   `force_password_change` redireciona para `/trocar-senha` antes de liberar a área.
2. **Autorização:** `proxy.ts` faz o gate grosseiro por área; `can(papel, módulo, nível)`
   e as policies com `can_access()` decidem o acesso fino no servidor e no banco.
3. **Doação PIX:** o portal exibe QR estático e código copia-e-cola. O webhook do
   Mercado Pago registra eventos em `webhook_events` e cria a transação quando o
   pagamento é aprovado (stub até a configuração das credenciais reais).
4. **Eventos:** listagem e detalhe públicos; a inscrição abre o WhatsApp com mensagem
   pré-preenchida.
5. **Auditoria:** ações administrativas sensíveis gravam em `audit_logs`, com leitura
   pela página `/admin/auditoria`.

## Limitações aceitas

- Deploy único: mudanças afetam todo o app (AD-002).
- Escala vertical limitada, suficiente para um templo (AD-001).
- Dependência de provedores gerenciados (lock-in moderado, AD-003).
- Webhook do Mercado Pago opera em modo stub até as credenciais de produção.
- Sem envio de e-mail transacional; a senha-ID é entregue manualmente (AD-013).

## Referências

- `docs/REQUIREMENTS.md` — requisitos e árvore de navegação
- `docs/DATABASE.md` — modelo de dados
- `docs/API.md` — rotas e contratos
- `docs/SECURITY.md` — autenticação, RBAC e RLS
- `.specs/STATE.md` — decisões AD-NNN
