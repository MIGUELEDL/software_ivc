# Spec: admin-configuracoes (RF-029)

## Problem Statement

System settings (church info, WhatsApp, PIX key, schedule, social links) are hardcoded in `constants.ts`. Admins cannot update them without code changes and redeployment. This feature adds an admin page to view and edit these settings, persisted in a `settings` DB table.

## Assumptions & Open Questions

- **A1**: Settings changes do NOT automatically reflect on the public portal in this iteration (CFG-20). Portal continues reading `constants.ts`.
- **A2**: Credential management (Supabase keys, Mercado Pago credentials) stays in env vars, not in the settings table (per SECURITY.md).
- **A3**: The `configuracoes` module is already in the RBAC permissions matrix (0008): ADMIN and SUPER_ADMIN have `administrar`.
- **A4**: No image upload for church logo in this iteration.
- **A5**: Rich text for "sobre"/"missao" is out of scope — plain textarea.

## Overview

Module for viewing and editing system-wide church settings from the admin panel. Settings are stored in a `settings` table (DB) and override the hardcoded `constants.ts` values. Only ADMIN/SUPER_ADMIN can edit; all authenticated admin roles can view.

## User Stories

1. **US1**: As an admin, I want to view all current system settings so I can verify what's configured.
2. **US2**: As a SUPER_ADMIN/ADMIN, I want to edit settings (church info, WhatsApp, PIX, schedule, social links) so I can update them without code changes.
3. **US3**: As an admin, I want to see who last modified a setting and when, for accountability.

## Acceptance Criteria

### Settings Categories

CFG-01: Page displays settings grouped into 5 sections: Dados da Igreja, WhatsApp, PIX, Horarios de Culto, Redes Sociais.

CFG-02: "Dados da Igreja" section shows: nome, nome curto, slogan, fundacao, CNPJ, endereco, cidade, pastor, sobre, missao, visao, valores.

CFG-03: "WhatsApp" section shows: numero formatado (ex: (83) 99945-0781) and link wa.me completo.

CFG-04: "PIX" section shows: chave PIX (CNPJ sem pontuacao) e instrucoes de doacao.

CFG-05: "Horarios de Culto" section shows: lista de cultos (dia, horario, titulo) em formato editavel (adicionar/remover linhas).

CFG-06: "Redes Sociais" section shows: Instagram URL, YouTube URL.

### Edit Flow

CFG-07: When `can(papel, 'configuracoes', 'administrar')` is true, each section shows an "Editar" button that toggles the section to edit mode.

CFG-08: In edit mode, text fields become input/textarea, schedule items become editable rows with add/remove buttons.

CFG-09: "Salvar" button calls `PATCH /api/admin/configuracoes` with the changed settings. "Cancelar" reverts to original values.

CFG-10: On successful save, a toast/feedback message "Configuracoes salvas com sucesso" is shown and the page re-renders with new values.

CFG-11: On save error, the error message is displayed and the form remains in edit mode with unsaved values preserved.

### API

CFG-12: `GET /api/admin/configuracoes` returns all settings as `{ [key]: value }` JSON. Requires `configuracoes:ler`.

CFG-13: `PATCH /api/admin/configuracoes` accepts `{ [key]: value }` partial update. Requires `configuracoes:administrar`.

CFG-14: PATCH validates each setting key against a whitelist of allowed keys. Unknown keys return 400 `chave_invalida`.

CFG-15: PATCH returns 200 `{ ok: true }` on success.

### Data Model

CFG-16: `settings` table: `key` (text, PK), `value` (jsonb, not null), `updated_at` (timestamptz, default now()), `updated_by` (uuid, references auth.users).

CFG-17: RLS: SELECT to authenticated (all admin roles can view); UPDATE/INSERT only to users with `configuracoes:administrar` via `can_access('configuracoes', 'administrar')`.

CFG-18: Seed idempotente populates default settings from `constants.ts` values (church info, WhatsApp, PIX, schedule, social links).

### Fallback

CFG-19: If a setting key has no row in `settings` table, the system falls back to the hardcoded value in `constants.ts`.

CFG-20: The public portal continues to read from `constants.ts` (no change to public pages in this feature).

### RBAC

CFG-21: Page guard: `can(papel, 'configuracoes', 'ler')` — return 403 card if denied.

CFG-22: Edit buttons only visible when `can(papel, 'configuracoes', 'administrar')` is true.

CFG-23: API routes use `authAdmin('configuracoes')` for GET and `requireAdministrar('configuracoes')` for PATCH.

### Edge Cases

CFG-24: Connection error on load shows current constants.ts values as fallback with a subtle "(padrao)" indicator.

CFG-25: Empty schedule list is allowed (no cultos configured).

## Out of Scope

- Image upload for church logo (future evolution)
- Rich text editor for "sobre"/"missao" (plain textarea for now)
- Real-time preview of public portal changes
- `cms_content` table (separate feature)
- `payment_configs` table (credential management stays in env vars per SECURITY.md)

## Requirement Traceability

| AC | Requisito | Covered By |
|----|-----------|------------|
| CFG-01 | RF-029 — secoes de configuracao | Page sections |
| CFG-02 | RF-029 — dados da igreja | Page section |
| CFG-03 | RF-029 — WhatsApp | Page section |
| CFG-04 | RF-029 — PIX | Page section |
| CFG-05 | RF-029 — horarios | Page section |
| CFG-06 | RF-029 — redes sociais | Page section |
| CFG-07 | RF-029 — editar | Edit flow |
| CFG-08 | RF-029 — modo edicao | Edit flow |
| CFG-09 | RF-029 — salvar/cancelar | Edit flow |
| CFG-10 | RF-029 — feedback sucesso | Edit flow |
| CFG-11 | RF-029 — feedback erro | Edit flow |
| CFG-12 | RF-029 — GET API | Route handler |
| CFG-13 | RF-029 — PATCH API | Route handler |
| CFG-14 | RF-029 — validacao chave | Route handler |
| CFG-15 | RF-029 — response 200 | Route handler |
| CFG-16 | RF-029 — tabela settings | Migration |
| CFG-17 | RF-029 — RLS | Migration |
| CFG-18 | RF-029 — seed | Migration |
| CFG-19 | RF-029 — fallback constants | Fallback logic |
| CFG-20 | RF-029 — portal inalterado | Out of scope |
| CFG-21 | RF-032 — guard page | Guards |
| CFG-22 | RF-032 — conditional edit | Guards |
| CFG-23 | RF-032 — guard API | Route handlers |
| CFG-24 | RF-029 — erro conexao | Error handling |
| CFG-25 | RF-029 — schedule vazio | Edge case |
