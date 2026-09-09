# Eventos Context

**Gathered:** 2026-09-08
**Spec:** `.specs/features/eventos/spec.md`
**Status:** Ready for implementation

---

## Feature Boundary

Rotas públicas `/eventos` (listagem) e `/eventos/[id]` (detalhe) do portal IVC, com
botão "Inscrever-se" → WhatsApp oficial com mensagem pré-preenchida (RF-006, RN-003).
Sem autenticação. CRUD admin (RF-024) fica na onda 3.

---

## Implementation Decisions

### Fonte de dados

- `EVENTS` array em `src/lib/constants.ts`, **vazio no MVP** (liderança ainda não
  forneceu eventos; não fabricar dados).
- Formato por entrada: `{ id: string, title, date, time, location, description }`.
  `id` é slug estável (ex.: string curta única). Campo `date` em formato legível
  (sem depender de datafixa — é conteúdo editorial, não dado institucional).

### Estado vazio

- `/eventos` com `EVENTS = []` renderiza cartão/aviso acessível "Em breve avisaremos
  os próximos eventos" — sem cards fabricados.

### Rota dinâmica

- `/eventos/[id]` resolve o evento por `id`; se ausente → `notFound()` (404).
- Usar mecanismo de params do Next 16 deste repo (consultar docs em
  `node_modules/next/dist/docs/`) — conforme AGENTS.md, esta versão difere das
  anteriores.

### Botão "Inscrever-se"

- Abre `SOCIAL.whatsapp` + `?text=<urlencoded>` com
  `"Gostaria de me inscrever no evento <title>"`.
- Número sempre de `SOCIAL.whatsapp` (fonte única; RN-003: (83) 99945-0781).
- `encodeURIComponent` no texto (edge: acentos/espaços).

### Navegação

- Item "Eventos" no navbar + footer apontando `/eventos`.
- `NAV_ITEMS` passa a suportar rota externa além de âncoras (decidido: manter âncoras
  e adicionar entrada de rota; conferir como Navbar/Footer renderizam `href`).

### Acessibilidade & responsividade

- alts descritivos; botões com texto visível; contraste com a paleta atual.
- Layout mobile-first (grid responsivo `sm:`/`md:`/`lg:`, padrão dos componentes).

---

## Agent's Discretion

- Visual dos cards de evento e do estado vazio (consistente com `Schedule`/`About`:
  `bg-white`/`bg-bg-gray`, sombras `shadow-xl`, motion/framer).
- Seleção de ícones `lucide-react` já usados no projeto.

---

## Declined / Undiscussed Gray Areas → Assumptions

Nenhum em aberto — fonte estática, estado vazio, mensagem pré-preenchida e entrada no
navbar confirmados pelo administrador (2026-09-08).

---

## Specific References

- "constants.ts estático (Recomendado)" — fonte única AD-008
- "Mensagem pré-preenchida (Recomendado)" — RN-003
- "Estado vazio, sem dados fabricados (Recomendado)" — mesmo princípio dos dados institucionais
- "Link no navbar (Recomendado)" — rota própria acessível

---

## Deferred Ideas

- **Persistência em banco / Supabase** + CRUD admin de eventos (RF-024, visibilidade, auditoria RF-030) — onda 3; requer nova ADR quando a fonte passar de constants → DB.
- **Inscrição com dados do visitante** (nome/telefone em formulário) — não previsto na árvore; RN-003 é só redirecionamento.
- **Cron/date display automático** para merge de visibilidade futura — com RF-024.