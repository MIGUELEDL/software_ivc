# Design — RF-030 Auditoria

## Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      audit_logs table                        │
│  (autor uuid, acao text, entidade text, entidade_id text,   │
│   timestamp timestamptz, ip inet, user_agent text)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  Service    │        │   Routes    │
    │  Layer      │        │  (API)      │
    │ registrar() │        │ GET/POST    │
    │ listar()    │        │             │
    └──────┬──────┘        └──────┬──────┘
           │                       │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  Instrument │        │    Page     │
    │  Handlers   │        │ /admin/     │
    │ (membros,   │        │ auditoria   │
    │  eventos,   │        │             │
    │  etc)       │        │             │
    └─────────────┘        └─────────────┘
```

### Migration

**Tabela `audit_logs`:**
- `id` uuid PK DEFAULT gen_random_uuid()
- `autor` uuid NULL (FK para auth.users via app_metadata)
- `acao` text NOT NULL (criar, editar, excluir, etc.)
- `entidade` text NOT NULL (membros, eventos, patrimonio, financeiro, etc.)
- `entidade_id` text NULL (ID do objeto afetado)
- `timestamp` timestamptz NOT NULL DEFAULT now()
- `ip` inet NULL
- `user_agent` text NULL
- `payload` jsonb NULL (dados adicionais, opcional)

**Índices:**
- `idx_audit_logs_timestamp` em `timestamp DESC`
- `idx_audit_logs_entidade` em `entidade`
- `idx_audit_logs_acao` em `acao`

**RLS:**
- Policy `audit_logs_select_authenticated`: SELECT para authenticated com `can_access('auditoria', 'ler')`
- Policy `audit_logs_insert_authenticated`: INSERT para authenticated com `can_access('auditoria', 'ler')` (qualquer um que pode ler pode registrar)
- Sem UPDATE/DELETE policies (imutável)

### Service Layer

**`src/lib/admin/auditoria.ts`:**

```typescript
type AuditLog = {
  id: string;
  autor: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  timestamp: string;
  ip: string | null;
  user_agent: string | null;
  payload: Record<string, unknown> | null;
};

type AuditoriaFiltros = {
  data_inicio?: string;
  data_fim?: string;
  acao?: string;
  entidade?: string;
  offset?: number;
  limit?: number;
};

// Função para extrair IP e user_agent do request
function extrairInfoRequest(request: Request): { ip: string | null; user_agent: string | null }

// Registrar ação de auditoria
async function registrarAuditoria(params: {
  autor?: string;
  acao: string;
  entidade: string;
  entidade_id?: string;
  ip?: string | null;
  user_agent?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void>

// Listar logs com filtros
async function listarAuditoria(filtros: AuditoriaFiltros): Promise<{
  logs: AuditLog[];
  total: number;
}>
```

### Route Handlers

**`GET /api/admin/auditoria`** — Listar logs
- Guard: `authAdmin('auditoria')`
- Query params: data_inicio, data_fim, acao, entidade, offset, limit
- Response: 200 `{ logs, total }`

**`POST /api/admin/auditoria`** — Criar log (usado internamente)
- Guard: `requireAdministrar('auditoria')`
- Body: { acao, entidade, entidade_id?, payload? }
- Response: 201 `{ log }`

### Página

**`/admin/auditoria`:**
- Guard RBAC: `can(papel, 'auditoria', 'ler')`
- Tabela com colunas: Data/Hora, Autor, Ação, Entidade, ID, IP
- Filtros: período (data_inicio/fim), ação (select), entidade (select)
- Paginação: 20 itens por página
- Empty state: "Nenhum log de auditoria encontrado"

### Instrumentação dos Route Handlers

**Padrão de instrumentação:**
```typescript
// No handler existente, após sucesso:
import { registrarAuditoria } from "@/lib/admin/auditoria";

// Exemplo: POST /api/admin/membros
const { ip, user_agent } = extrairInfoRequest(request);
await registrarAuditoria({
  autor: auth.sub,
  acao: "criar",
  entidade: "membros",
  entidade_id: member.id,
  ip,
  user_agent,
});
```

**Handlers a instrumentar:**
1. `src/app/api/admin/membros/route.ts` — criar membro
2. `src/app/api/admin/membros/[id]/route.ts` — editar/excluir membro
3. `src/app/api/admin/eventos/route.ts` — criar evento
4. `src/app/api/admin/eventos/[id]/route.ts` — editar/excluir evento
5. `src/app/api/admin/patrimonio/route.ts` — criar bem
6. `src/app/api/admin/patrimonio/[id]/route.ts` — editar/baixar bem
7. `src/app/api/admin/financeiro/route.ts` — criar lançamento
8. `src/app/api/admin/financeiro/[id]/route.ts` — editar/cancelar lançamento
9. `src/app/api/admin/relatorios/route.ts` — se aplicável
10. `src/app/api/admin/usuarios/route.ts` — criar usuário
11. `src/app/api/admin/usuarios/[id]/route.ts` — editar usuário
12. `src/app/api/admin/configuracoes/route.ts` — atualizar config

### RBAC

**Matriz de permissões (já existe em 0008):**
- `SUPER_ADMIN` → `auditoria:administrar`
- `ADMIN` → `auditoria:administrar`
- Demais papéis → sem acesso (sem linha na matriz)

**Guard da página:** `can(papel, 'auditoria', 'ler')`

### Probes

**`scripts/probes-admin-auditoria.sh`:**
- Estático: migration, RLS, service exports, routes, page
- Runtime: sessões ADMIN/SUPER_ADMIN, criar membro + verificar log, filtros, paginação
- Regressão: verificar que outros módulos continuam funcionando
