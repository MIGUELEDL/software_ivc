# Design: admin-configuracoes (RF-029)

## Architecture

Single service layer + API routes + page. No new external dependencies.

```
Settings DB table
       ↓
configuracoes.ts (service)
       ↓
GET/PATCH /api/admin/configuracoes (route handlers)
       ↓
/admin/configuracoes (RSC page)
```

## Data Model

### Migration: `settings` table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view
CREATE POLICY settings_select ON settings
  FOR SELECT TO authenticated USING (true);

-- UPDATE/INSERT: only users with configuracoes:administrar
CREATE POLICY settings_admin ON settings
  FOR ALL TO authenticated
  USING (can_access('configuracoes', 'administrar'))
  WITH CHECK (can_access('configuracoes', 'administrar'));
```

### Setting Keys (whitelist)

| Key | Type | Default (from constants.ts) |
|-----|------|----------------------------|
| `church.name` | string | "Igreja Virtude Crista" |
| `church.shortName` | string | "IVC" |
| `church.slogan` | string | (slogan) |
| `church.foundedDate` | string | "07/09/2025" |
| `church.cnpj` | string | "68.683.917/0001-71" |
| `church.address` | string | (address) |
| `church.city` | string | "Santa Luzia - PB" |
| `church.leader` | string | (leader name) |
| `church.about` | string | (about text) |
| `church.mission` | string | (mission text) |
| `church.vision` | string | (vision text) |
| `church.values` | array | (3 values) |
| `whatsapp.number` | string | "83999450781" |
| `whatsapp.display` | string | "(83) 99945-0781" |
| `pix.key` | string | (CNPJ without punctuation) |
| `schedule.items` | array | (3 cultos) |
| `social.instagram` | string | (instagram URL) |
| `social.youtube` | string | (youtube URL) |

## Components

### Service: `src/lib/admin/configuracoes.ts`

- `SETTINGS_KEYS` — whitelist of allowed keys with types and defaults
- `obterConfiguracoes()` — reads all settings from DB, falls back to constants.ts defaults
- `atualizarConfiguracoes(updates)` — partial update, validates keys against whitelist, sets `updated_at` and `updated_by`

### API Routes

- `GET /api/admin/configuracoes` — returns `{ settings: { [key]: value } }`
- `PATCH /api/admin/configuracoes` — accepts `{ settings: { [key]: value } }`, validates keys, returns `{ ok: true }`

### Page: `src/app/admin/configuracoes/page.tsx`

- RSC with `getClaims()` + `can()` guard
- Calls `obterConfiguracoes()` server-side
- Renders 5 sections (Dados da Igreja, WhatsApp, PIX, Horarios, Redes Sociais)
- Each section shows current values; edit mode toggled by client state
- Administrar permission controls edit/save buttons

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/00XX_settings.sql` | Create — settings table + RLS + seed |
| `src/lib/admin/configuracoes.ts` | Create — service layer |
| `src/app/admin/configuracoes/page.tsx` | Create — admin page |
| `src/app/api/admin/configuracoes/route.ts` | Create — GET/PATCH routes |
| `src/app/admin/page.tsx` | Modify — add "Configuracoes" card |
| `scripts/probes-admin-configuracoes.sh` | Create — probe script |

## RBAC

- Module: `configuracoes` (already in permissions matrix 0008)
- ADMIN + SUPER_ADMIN: `administrar` (full access)
- All other roles: no row → no access (fail-closed)
