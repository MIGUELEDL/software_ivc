# Observabilidade (Fase 11) Design

**Spec**: `.specs/features/observabilidade/spec.md`
**Status**: Draft

---

## Architecture Overview

Setup manual mínimo do `@sentry/nextjs` (sem wizard, sem `withSentryConfig`
nesta fase) + lib de log própria + rota de health + adoção no webhook MP.

```mermaid
graph TD
    B[Browser] -->|instrumentation-client.ts| S[Sentry SaaS]
    R[Route handlers / Server Components] -->|instrumentation.ts: register + onRequestError| S
    G[global-error.tsx boundary] -->|captureException| S
    W[webhook MP] --> L[logger + reportError]
    L -->|stdout JSON| V[Vercel function logs]
    L -->|exceção| S
    M[Monitor externo] -->|GET sem auth| H[/api/health]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| Padrão de rota API (NextResponse.json + códigos) | `src/app/api/webhooks/mercadopago/route.ts` | Health segue o mesmo shape `{ status }` / `{ error }` + status |
| Prefixo de log por rota (`"POST /rota — evento"`) | `route.ts:49,70,109,139,157,168` | Viram o campo `evento` do logger; corpos/status HTTP intocados |
| Framework Vitest + alias `@/*` | `vitest.config.ts`, F10 (AD-030) | Suite do logger em `src/lib/observability/*.test.ts` |
| Probes bash por rota | `scripts/probes-*.sh` (padrão do projeto) | Novo `scripts/probe-health.sh` (ou bloco em probe existente) |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Sentry SaaS (projeto `[REDACTED_PROJECT_NAME]`, região US) | `@sentry/nextjs` init nos 3 runtimes; DSN só via `.env.local` (gitignorado) |
| Vercel function logs | `console` JSON via logger (stdout); nada a instalar |
| Monitor externo (F12) | `GET /api/health` público |

---

## Components

### Sentry server config

- **Purpose**: Inicializa o SDK no runtime Node com errors-only e scrub anti-PII.
- **Location**: `src/sentry.server.config.ts`
- **Interfaces**:
  - (side-effect) `Sentry.init({ dsn: process.env.SENTRY_DSN, release, tracesSampleRate: undefined, sendDefaultPii: false, beforeSend: scrubPii })` — sem `dsn` o SDK opera em NOOP por desenho (cobre OBS-02).
- **Dependencies**: `@sentry/nextjs` (nova dependência), `release` de `src/lib/observability/release.ts`.
- **Reuses**: Padrão de init por runtime da doc oficial Sentry/Next.

### Sentry edge config

- **Purpose**: Mesmo que acima para o runtime edge.
- **Location**: `src/sentry.edge.config.ts`
- **Interfaces**: Idênticas à server, sem Node-APIs.
- **Dependencies**: `@sentry/nextjs`.

### Sentry client init

- **Purpose**: Captura client-side; registra `onRouterTransitionStart`.
- **Location**: `src/instrumentation-client.ts`
- **Interfaces**: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ...idem })` + `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`.
- **Dependencies**: `@sentry/nextjs`. DSN precisa do prefixo `NEXT_PUBLIC_` (bundle client não lê env server).

### instrumentation.ts (server/edge register + hook)

- **Purpose**: Registra os inits no boot do servidor e encaminha erros de request.
- **Location**: `src/instrumentation.ts`
- **Interfaces**:
  - `export async function register()` — importa `./sentry.server.config` ou `./sentry.edge.config` por `NEXT_RUNTIME`.
  - `export const onRequestError = Sentry.captureRequestError` — cobre route handlers/server components (OBS-01).
- **Dependencies**: Convenção estável do Next 15+ (`instrumentation.ts` em `src/`).
- **Reuses**: Formato da doc oficial (Next 16.3 + Sentry).

### global-error boundary

- **Purpose**: Fallback client de rota com captura (OBS-04).
- **Location**: `src/app/global-error.tsx` (`"use client"`, html/body próprios por convenção).
- **Interfaces**: `useEffect(() => Sentry.captureException(error), [error])` + UI fallback sem stack.
- **Dependencies**: `@sentry/nextjs`.

### release

- **Purpose**: Fonte única do `release` (contrato OBS-03/05).
- **Location**: `src/lib/observability/release.ts`
- **Interfaces**: `getRelease(): string` — `process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"`.
- **Dependencies**: nenhuma.

### logger

- **Purpose**: Log JSON estruturado com sanitização anti-PII (OBS-09/11).
- **Location**: `src/lib/observability/logger.ts`
- **Interfaces**:
  - `logger.debug/info/warn/error(evento: string, meta?: unknown): void` — stdout JSON `{ level, evento, ts, release, meta }`, meta sanitizada.
  - `sanitize(meta: unknown, depth?: number): unknown` — remove/mascara chaves PII (`email, cpf, rg, foto, telefone, endereco, senha, token`, `*_pii`), recursivo até profundidade 3, além disso trunca com marcador.
  - `reportError(erro: unknown, contexto: { evento: string; meta?: unknown }): void` — logger.error + `Sentry.captureException`.
- **Dependencies**: `@sentry/nextjs` (só `reportError`), `release.ts`.
- **Reuses**: Prefixos de log existentes viram `evento`.

### GET /api/health

- **Purpose**: Uptime público e raso (OBS-05..08).
- **Location**: `src/app/api/health/route.ts` (só exporta `GET`; demais métodos → 405 por convenção do App Router).
- **Interfaces**: `GET → 200 { status: "ok", release: getRelease() }`. Sem DB, sem auth, sem PII.
- **Dependencies**: `release.ts`.

### Adoção no webhook MP

- **Purpose**: Trocar os 6 `console.error` por `logger.error`/`reportError` sem alterar corpos/status (OBS-10).
- **Location**: `src/app/api/webhooks/mercadopago/route.ts` (linhas 49, 70, 109, 139, 157, 168).
- **Interfaces**: Inalteradas (200/400/500 + corpos idênticos — regressão FIN-13..19).
- **Dependencies**: `logger.ts`.

---

## Data Models (if applicable)

Nenhum (sem migration; Sentry e logs vivem fora do banco).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Sem `SENTRY_DSN` / DSN inválido | SDK NOOP + warn único no boot; app sobe normal | Nenhum |
| Falha de envio ao Sentry (rede/quota) | SDK descarta; request original completa | Nenhum |
| Exceção em client component | `global-error.tsx`: captura + fallback sem stack | Página de erro amigável |
| Falha no webhook MP | logger.error + capture; status HTTP contratado mantido | MP recebe o mesmo status de antes |
| Meta com PII aninhada além de profundidade 3 | Trunca com marcador `__truncated__` | Nada vaza; diagnóstico parcial |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Sem `withSentryConfig`, auto-instrumentação de build ausente | `next.config.ts:1` | Captura automática de alguns caminhos pode não ativar | `onRequestError` + boundary + `reportError` cobrem os ACs; prova empírica com throw proposital (tarefa de verificação); wrapper vira fix-task se falhar |
| Regressão FIN-13..19 ao tocar o webhook | `src/app/api/webhooks/mercadopago/route.ts:49-172` | Quebra de gate da F9 | Corpos/status intocados (só troca a chamada de log); `probe:admin-financeiro` no gate de cada tarefa que tocar o arquivo |
| DSN client exposto no bundle | `src/instrumentation-client.ts` | Esperado: ingest key é pública por desenho | Allowed domains no dashboard (passo do runbook); sem `authToken` no repo |
| Quota free estourada por loop de erro | configs | Perda de eventos | Errors-only (sem tracing/replay); `tracesSampleRate` ausente por decisão; spike-alert no dashboard (runbook) |
| Cobertura: rotas além do webhook sem logger | demais `src/app/api/**` | Diagnóstico parcial fora do MP | Declarado Out of Scope; helper exportado + documentado para adoção futura |

> Lições aplicadas: L-014 (probe do health asserta corpo exato, não só 200); L-015 (fallback do `global-error` asserta texto/classe, não só presença).

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Wizard Sentry | Não rodar; setup manual | Wizard cria arquivos de teste, envolve `next.config` e pede authToken; manual é mínimo, auditável e reversível |
| `withSentryConfig` | Fora nesta fase | Sem sourcemap upload (sem authToken no repo) o wrapper agrega pouco para errors-only; reavaliar na F12 |
| Tracing/Replay | Desligados | Quota free + spec errors-only |
| `release` | `VERCEL_GIT_COMMIT_SHA ?? "unknown"` | Contrato testável local (`unknown`) e real na Vercel |
| Profundidade de sanitize | 3 + truncamento | Limite anti-vazamento explícito (edge case da spec) |

> **Project-level decisions:** na conclusão da feature, registrar AD-033 (Sentry manual errors-only + convenção `src/lib/observability/`) em `.specs/STATE.md`.
