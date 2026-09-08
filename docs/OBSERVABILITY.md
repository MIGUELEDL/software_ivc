# Observabilidade — IVC

Requisito: **RNF-008** (Sentry plano free). Observabilidade ativa em produção começa
na **Fase 11**; aqui está o plano e o que já é aplicável nas fases anteriores.

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
| Falhas em integrações | Sentry + logs (Resend, Mercado Pago, Supabase) | Alertas por exceção |
| Webhook Mercado Pago | Log de `webhook_events` + Sentry | Evitar perda/conciliação travada |
| Auditoria | `audit_logs` (RN-004) | Trilha consultável no painel |

## Sem PII

Regra: **nenhum dado pessoal** (e-mail, CPF, foto) em logs/erros/Sentry. Se necessário,
IDs internos e metadados funcionais — conforme `docs/LGPD.md`.

## Status por fase

| Fase | Observabilidade |
| ---- | --------------- |
| **F8/F9** | Aplicável desde o início: `npm run build` reporta erros de compilação; Sentry pode ser instrumentado a partir da F9 (opcional, "early")
| **F10** | Testes de erro (framework) cobrem caminhos de falha esperados |
| **F11** | Sentry free ativado (RNF-008): DSN, `release`, alertas por canal (e-mail institucional) |

## Runbook de incidente (F11)

1. **Detecção:** alerta Sentry/uptime para o e-mail institucional.
2. **Triagem:** papel de monitor via painel admin (RBAC) ou encarregado encaminha.
3. **Resposta:** rollback de deploy no Vercel (`verifyDOM`), correção em PR, re-deploy.
4. **Aprendizado:** feature impactada → antes de fechar o incidente, registrar lição no
   processo spec-driven (aplicável a partir da F11).

## Referências

- `docs/COSTS.md` — Sentry free no TCO
- `docs/REQUIREMENTS.md` — RNF-008, RNF-003
- `docs/ARCHITECTURE.md` — camadas de integração (onde instrumentar)