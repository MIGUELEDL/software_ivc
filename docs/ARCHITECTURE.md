# Arquitetura — IVC

> Decisões de arquitetura derivam de **AD-002** (monólito modular, Ports & Adapters) e
> das demais ADRs em `.specs/STATE.md`. Este documento consolida a forma final.

## Visão de alto nível

**Monólito modular** em Next.js 16 (App Router + Route Handlers + Server Actions),
deploy único, organizado em **camadas por domínio**. Serviços externos são isolados
atrás de **Ports & Adapters** para que o domínio não dependa de provedores.

```
┌─────────────────────────────────────────────────────────────────┐
│                      NAVEGADOR (visitante / membro / admin)      │
└───────────────▲───────────────────────────────▲─────────────────┘
                │ HTTP/HTTPS                    │ HTTP/HTTPS
┌───────────────┴──────────────┐   ┌────────────┴───────────────┐
│  PORTAL PÚLCOS (SSG/ISR)     │   │  PAINEL MEMBRO/ADMIN (SSR) │
│  /  /sobre  /cultos  /eventos│   │  /painel/*  sessão+RABAC   │
│  /doacao  (QR PIX)           │   │  Route Handlers / Actions  │
└───────────────▲──────────────┘   └────────────▲───────────────┘
                │                camada de domínio (apps/features)
┌───────────────┴────────────────────────────────┴──────────────┐
│              DOMÍNIO / CASOS DE USO (features)                 │
│  membros │ eventos │ financeiro │ patrimônio │ conteúdo │ ...  │
└───────▲───────────────────────────────────────────▲────────────┘
        │ Ports (interfaces)                         │ Ports
┌───────┴────────────────┐        ┌──────────────────┴───────────┐
│ ADAPTER: Supabase       │        │ ADAPTER: Mercado Pago /      │
│ (Postgres+Auth+Storage) │        │ Resend (e-mail)             │
└────────────────────────┘        └──────────────────────────────┘
```

## Principais decisões (resumo)

| Aspecto | Decisão | ADR |
| ------- | ------- | --- |
| Estilo | Monólito modular, deploy único | AD-002 |
| Banco | PostgreSQL via Supabase (Auth+Storage inclusos) | AD-003 |
| Persistência | Drizzle ORM (tipagem first-class, migrações SQL) | AD-003 |
| Autenticação | Auth.js com sessões separadas membro/admin; 1º acesso por senha-ID com troca | AD-004 |
| Dados institucionais | `src/lib/constants.ts` como fonte única (F9) | AD-008 |
| Pagamentos | Mercado Pago via webhook; **MVP = PIX apenas** | AD-009 |
| Processo | Spec-driven (`tlc-spec-driven`), verificação por feature | AD-005 |

## Estrutura de pastas

```
src/
├── app/                    # Rotas (App Router): portal + painéis
│   ├── layout.tsx          # Layout raiz
│   ├── page.tsx            # Home (landing atual)
│   └── globals.css         # Estilos globais (Tailwind v4)
├── components/             # Componentes de apresentação (portal)
│   ├── Navbar/ Hero/ About/ Values/ LiveBanner/ SocialLinks/
│   ├── Gallery/ Footer/
├── lib/
│   └── constants.ts        # Fonte única de dados institucionais (AD-008)
└── features/               # (a criar na F9) camada de domínio por feature
    └── <dominio>/          # casos de uso, Ports, adapters, schemas
```

**Evolução esperada na F9:** `app/(portal)`, `app/(membro)`, `app/(admin)` como
grupos de rotas organizados pela árvore de navegação; `features/*` para o domínio;
`lib/db` (Drizzle), `lib/auth` (Auth.js), `lib/payments` (adapter Mercado Pago).

## Modelo de renderização

| Área | Estratégia | Justificativa |
| ---- | ---------- | ------------- |
| Portal público (Home, Sobre, Cultos…) | Static (SSG) / ISR | Conteúdo institucional muda pouco (AD-008) |
| Eventos / doações | ISR com revalidação curta | Atualização sem rebuild manual |
| Painéis (membro/admin) | SSR + sessão server-side | Dados privados por recioso; RBAC no servidor |
| Ações mutáveis | Server Actions / Route Handlers | Formulários e CRUD com validação no servidor |
| Webhook Mercado Pago | Route Handler dedicado (POST) | Recebe notificações de pagamento |

## Ports & Adapters (contratos)

Cada integração externa tem **Port** (interface no domínio) e **Adapter** (impl
específica), permitindo trocar provedor sem tocar no domínio:

- **Persistência** → `Port: memberRepository, eventRepository…` → Adapter Drizzle/Supabase.
- **Auth** → `Port: sessionManager` → Adapter Auth.js + Supabase Auth.
- **E-mail** → `Port: mailer` → Adapter Resend.
- **Pagamentos** → `Port: paymentGateway` (criar cobrança, validar webhook) → Adapter Mercado Pago.

> Blast radius: mudanças de provedor ficam restritas ao adapter e aos testes de
> integração desse adapter (ver `TESTING.md`).

## Topologia do produto (árvore de navegação aprovada)

- **Portal público (visitante):** Home, Sobre/História/MVV, Liderança, Localização,
  Cultos, Redes sociais, Eventos (listagem + detalhe → inscrever via WhatsApp),
  Doação/Oferta (QR PIX), Login.
- **Painel do membro:** avisos de eventos, QR code de dízimo, cartão de membro,
  minhas informações (editar dados + foto 4x4).
- **Painel administrativo (RBAC):** dashboard, membros (CRUD), igrejas/liderança,
  eventos, patrimônio, financeiro (PIX, webhook, conciliação, fechamento),
  relatórios/documentos, usuários/permissões, configurações, auditoria.

> A árvore é a **fonte de verdade estrutural** (ver `docs/REQUIREMENTS.md`) e determina
> os grupos de rotas e a granularidade das features da Fase 9.

## Fluxos críticos

1. **Login membro:** e-mail + senha-ID temporária → primeira troca obrigatória (RN-002) →
   sessão membro isolada da sessão admin (AD-004).
2. **Login admin:** sessão separada; autorização por papel (RBAC, RF-031/032).
3. **Doação PIX:** portal mostra QR PIX (RN-001); webhook Mercado Pago atualiza o
   financeiro; conciliação e fechamento de caixa obrigatórios (RN-001.1).
4. **Inscrição em evento:** detalhe do evento → "inscrever-se" → WhatsApp (RN-003).
5. **Auditoria:** ações administrativas sensíveis gravam trilha de auditoria (RN-004).

## Limitações aceitas

- Deploy único: mudanças afetam todo o app (AD-002).
- Escala vertical limitada — suficiente para 1 templo (AD-001).
- Dependência de provedores gerenciados (lock-in moderado, AD-003).

## Referências

- `docs/REQUIREMENTS.md` — árvore e requisitos
- `docs/DATABASE.md` — modelo de dados
- `docs/API.md` — contratos de rotas e integrações
- `docs/SECURITY.md` — autenticação, RBAC, RLS
- `.specs/STATE.md` — decisões AD-NNN