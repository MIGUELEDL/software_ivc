# Observabilidade — IVC

Requisito: **RNF-008** (Sentry plano free). A observabilidade está ativa em produção
desde a **Fase 11**; este documento consolida o desenho e o runbook.

## Pilares

1. **Erros (Sentry free)** — captura de exceções server-side e client-side com
   contexto de sessão (sem PII) e fonte de `release`/deploy.
2. **Logs estruturados** — em produções Vercel (function logs) + logs do domínio
   (sem dados sensíveis — ver `SECURITY.md`).
3. **Métricas de uso (Vercel Analytics free)** — páginas mais acessadas, geografia,
   desempenho; conversão das doações (funil portal → QR PIX → webhook).
4. **Uptime/health** — rota de health (`/api/health`) para o monitoramento externo.

## O que observamos

| Observável | Instrumento | Alvo |
| ---------- | ----------- | ---- |
| Erros não capturados | Sentry (free) | Zero crítico sem alerta |
| Performance de rota | Vercel Analytics / Web Vitals | LCP < 2,5s (mobile) |
| Disponibilidade | RNF-003 ≥ 99% | Vercel + health checks |
| Falhas em integrações | Sentry + logs (Mercado Pago e Supabase) | Alertas por exceção |
| Webhook Mercado Pago | Log de `webhook_events` + Sentry | Evitar perda/conciliação travada |
| Auditoria | `audit_logs` (RN-004) | Trilha consultável no painel |

## Sem PII

Regra: **nenhum dado pessoal** (e-mail, CPF, foto) em logs/erros/Sentry. Se necessário,
IDs internos e metadados funcionais — conforme `docs/LGPD.md`.

## Status por fase

| Fase | Observabilidade |
| ---- | --------------- |
| **F8/F9** | Aplicável desde o início: `npm run build` reporta erros de compilação; Sentry pode ser instrumentado a partir da F9 (opcional, "early") |
| **F10** | Testes de erro (framework) cobrem caminhos de falha esperados |
| **F11** | ✅ **Ativa**: Sentry free errors-only (`[REDACTED_PROJECT_NAME]`, DSN só em `.env.local` gitignorado), `release` = SHA Vercel ou `unknown`, `GET /api/health` público e raso, logger JSON anti-PII (`src/lib/observability/`) adotado no webhook MP, alerta por e-mail via regra no dashboard (passo no runbook abaixo) |

## Runbook de incidente (F11)

1. **Detecção:** alerta Sentry/uptime para o e-mail institucional.
2. **Triagem:** papel de monitor via painel admin (RBAC) ou encarregado encaminha.
3. **Resposta:** rollback de deploy na Vercel, correção em PR e novo deploy.
4. **Aprendizado:** feature impactada → antes de fechar o incidente, registrar lição no
   processo spec-driven (aplicável a partir da F11).

### Criar a regra de alerta no dashboard Sentry (passo manual, fora do repo)

1. Em `sentry.io` → projeto `[REDACTED_PROJECT_NAME]` → **Alerts** → **Create Alert** → **Issues**.
2. Condição sugerida: `event.level = error` com frequência mínima (ex.: mais de
   10 eventos em 1h) para não esgotar a atenção com ruído.
3. Ação: enviar para o **canal de e-mail da liderança** (definir o endereço com
   a liderança; não versionar e-mails no repo).
4. O que NÃO alertar: `GET /api/health` 200 (tráfego de monitor) e eventos do
   ambiente local (`release: unknown` vindos de dev — filtrar por
   `release` quando necessário).
5. Revisão trimestral: ajustar o limiar conforme o volume real (plano free).

## Referências

- `docs/COSTS.md` — Sentry free no TCO
- `docs/REQUIREMENTS.md` — RNF-008, RNF-003
- `docs/ARCHITECTURE.md` — camadas de integração (onde instrumentar)