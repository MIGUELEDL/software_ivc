# Relatórios/Documentos Design

**Spec**: `.specs/features/admin-relatorios/spec.md`
**Context**: `.specs/features/admin-relatorios/context.md`
**Status**: Draft

---

## Architecture Overview

Seguinte os padrões consolidados das features admin (membros/eventos/patrimônio/financeiro):
RSC lê com client de sessão (RLS `can_access('relatorios', ...)`) + Route Handlers escrevem
(exceto download, que é GET com guarda de leitura). Relatórios são **servidos como CSV**
por um route handler GET dedicado (download nativo do navegador via `Content-Disposition`),
sem cliente JS nem geração server-side de PDF. Documentos usam Storage (bucket privado
`documentos`) com metadados na tabela `documents`, categorias por módulo, RLS por papel.

```
GET  /admin/relatorios  ──► page.tsx (RSC)
       │  leitor: can('relatorios','ler')            │
       ├── Seção Relatórios
       │     └─ Links/GET-form ──► GET /api/admin/relatorios/exportar?tipo=financeiro&data_inicio&data_fim
       │                               └─ authAdmin('relatorios') → relatorios.gerarCSVX() → Response text/csv (BOM ;)
       └── Seção Documentos
             ├─ lista  ── (RSC, RLS documents_select_admin, filtro categoria via searchParams)
             ├─ form upload (escritor) ──► POST  /api/admin/relatorios/documentos
             │                                └─ requireEscrita('relatorios') → storage.upload → insert row → 201
             ├─ download ──► GET /api/admin/relatorios/documentos/[id]/download
             │                └─ authAdmin('relatorios') → createSignedUrl → redirect 307
             └─ excluir ──► DELETE /api/admin/relatorios/documentos/[id]
                              └─ requireEscrita('relatorios') → remove row + storage object → 200
```

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `can()` / `getMatriz()` / `MODULOS` | `src/lib/auth/rbac.ts` | Guardas de rota/página para módulo `relatorios` (já existe na matriz 0008) |
| `authAdmin` / `requireEscrita` / `erroCampos` | `src/lib/admin/http.ts:33` | Guardas dos route handlers `/api/admin/relatorios/*` (401/403 padrão) |
| `createServerClient()` | `src/lib/supabase/server.ts` | RSC e rotas — leitura por RLS, upload storage |
| `suprir/getPublicUrl` upload pattern | `src/lib/admin/lideranca.ts:361` | Referência de upload/upsert storage com validação por campo |
| `listarLancamentos(filtros)` | `src/lib/admin/financeiro.ts` | Fonte do relatório financeiro (reusa `LancamentoFiltros`) |
| `listMembros(filtros)` | `src/lib/admin/membros.ts` | Fonte do relatório de membros |
| `listarEventos()` | `src/lib/admin/eventos.ts:78` | Fonte do relatório de eventos |
| `listarAssets()` | `src/lib/admin/assets.ts:39` | Fonte do relatório de patrimônio |
| Pattern de filtros GET + searchParams | `src/app/admin/financeiro/page.tsx` | Página relatórios: filtro categoria (chips Link) + período (GET form) — AD-016 |
| Pattern denied-block de página | `src/app/admin/financeiro/page.tsx:50` | Bloco "sem permissão" + voltar ao painel |
| Dash nav cards | `src/app/admin/page.tsx` | Adicionar card "Relatórios" (RF-021 dashboard já tem os módulos) |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Supabase Postgres | Tabela `documents` (migration 0015) + RLS via `can_access('relatorios', ...)` |
| Supabase Storage | Bucket **privado** `documentos` (migration 0015) com policies por papel; download via `createSignedUrl` |
| RBAC (matriz) | Módulo `relatorios` já seeded na 0008: FINANCEIRO=escrever; SECRETARIA/PATRIMONIAL/LIDER=ler; ADMIN/SA=administrar |

---

## Components

### `src/lib/admin/relatorios.ts` (service layer)

- **Purpose**: Geração de CSV dos relatórios + listagem/CRUD de documentos (metadados) e download via signed URL.
- **Interfaces**:
  - `gerarCSVFinanceiro(filtros: LancamentoFiltros): Promise<{ csv: string; filename: string }>` — lê `listarLancamentos`, monta CSV `Data;Tipo;Metodo;Status;Categoria;Descricao;Valor` com totais final (Receitas/Despesas/Saldo).
  - `gerarCSVMembros(filtros?: MembroFiltros): Promise<{ csv; filename }>` — CSV `Matricula;Nome;Status;Nascimento;Whatsapp;Cidade/UF`.
  - `gerarCSVEventos(): Promise<{ csv; filename }>` — CSV `Titulo;Data;Hora;Local;Visivel;Status`.
  - `gerarCSVPatrimonio(): Promise<{ csv; filename }>` — CSV `Nome;Categoria;Tombo;Local;Valor;DataAquisicao;Responsavel;Status`.
  - `escapaCSV(valor: unknown): string` — aspas duplas + escape de `"` (RFC 4180) e `\n`.
  - `listarDocumentos(categoria?: DocumentoCategoria): Promise<Documento[]>` — `documents` por `created_at desc`, filtro opcional por categoria.
  - `subirDocumento(dados: DocumentoDados, file: File): Promise<Documento>` — valida (título, categoria, mime, tamanho) → upload storage → insert row; rollback (remove objeto) se insert falhar.
  - `buscarDocumento(id): Promise<Documento | null>` — para 404.
  - `removerDocumento(id): Promise<void>` — remove row + objeto storage (ordem segura: remove storage se row ok).
  - `urlDownloadDocumento(id): Promise<string>` — valida prefixo `documentos/`, `createSignedUrl(60s)`; falha → erro (404/500).
- **Dependencies**: `createServerClient`, `listarLancamentos`, `listMembros`, `listarEventos`, `listarAssets`, `validarDocumento`.
- **Reuses**: funções de listagem dos outros módulos (fontes de dados); padrão de exceções de domínio (`assets.ts`).

### `src/lib/admin/relatorios-constants.ts`

- **Purpose**: Tipos e constantes puras (sem server-only) — `DOCUMENT_CATEGORIES` (categorias por módulo: `FINANCEIRO`, `MEMBROS`, `EVENTOS`, `PATRIMONIO`, `IGREJAS`, `GERAL`), `DOCUMENT_MIME_TYPES`, `DOCUMENT_MAX_BYTES = 10MB`, tipos `Documento`, `DocumentoCategoria`, `DocumentoDados`.
- **Location**: `src/lib/admin/relatorios-constants.ts` (padrão `asset-types.ts` — evita server-only em client component).

### `src/app/api/admin/relatorios/exportar/route.ts`

- **Purpose**: GET — exporta o CSV de um relatório (download nativo). Guarda `authAdmin('relatorios')` (leitura). Query: `tipo` (`financeiro|membros|eventos|patrimonio`) + `data_inicio`/`data_fim` (financeiro). Response `text/csv; charset=utf-8` com `Content-Disposition: attachment` e BOM `\uFEFF`.
- **Dependencies**: `relatorios.ts`. Tipo desconhecido → 400 `{ error: "tipo_invalido" }`.

### `src/app/api/admin/relatorios/documentos/route.ts`

- **Purpose**: POST — upload de documento. Guarda `requireEscrita('relatorios')`; parse `multipart/form-data`; validação por campo (`titulo`, `categoria`, arquivo mime/tamanho) → 400 `{error:"dados_invalidos", campos}`; sucesso → 201 `{ documento }`; arquivo sem `titulo`/arq → 400.
- **Purpose (GET)**: lista documentos (espelho da RSC, usada pelos probes) — `authAdmin('relatorios')`, filtro `categoria`.
- **Dependencies**: `relatorios.ts`.

### `src/app/api/admin/relatorios/documentos/[id]/route.ts`

- **Purpose**: DELETE — exclui documento. Guarda `requireEscrita('relatorios')`; inexistente → 404 `{ error: "nao_encontrado" }`; sucesso → 200 `{ ok: true }`.

### `src/app/api/admin/relatorios/documentos/[id]/download/route.ts`

- **Purpose**: GET — baixa o arquivo. Guarda `authAdmin('relatorios')` (leitura — SECRETARIA/PATRIMONIAL/LIDER também baixam); redirect 307 para signed URL de 60s; inexistente → 404.

### `src/app/admin/relatorios/page.tsx`

- **Purpose**: RSC — tela do módulo. Guarda `leitor = can('relatorios','ler')` → denied-block (padrão financeiro). Seções:
  - **Relatórios**: card financeiro com GET form (data_inicio/data_fim, submit → `/api/admin/relatorios/exportar?tipo=financeiro`) + 3 links diretos de exportação (membros/eventos/patrimônio) com ícones.
  - **Documentos**: chips de categoria por módulo (`next/link`, padrão AD-016) + lista cronológica (título, categoria, tamanho, data, autor) com download (link) e excluir (form POST→DELETE) visíveis só p/ escritores; form de upload (escritores) com inputs título/categoria/arquivo — padrão da foto de líder (multipart).
- **Dependencies**: `relatorios.ts` (listarDocumentos), `can()`, `getClaims`.

### `src/app/admin/page.tsx` (dashboard)

- **Purpose**: Adiciona card "Relatórios" na navegação (ícone `BarChart3`), padrão dos cards existentes — link `/admin/relatorios`.

### `supabase/migrations/0015_relatorios_documentos.sql`

- **Purpose**: Cria `public.documents` + bucket privado `documentos` + policies RLS/storage.
- `documents(id uuid pk 000, title text >0, description text, category text CHECK in DOCUMENT_CATEGORIES, file_path text unique, file_name text, mime_type text, file_size int >=0, uploaded_by uuid ref auth.users, created_at timestamptz default now())` + índice `(category)` e `(created_at desc)`.
- RLS `documents`: SELECT `authenticated` com `can_access('relatorios','ler')`; INSERT/UPDATE/DELETE com `can_access('relatorios','escrever')` — **sem `anon`**, sem menção a roles (L-006: policies por composição `can_access`, não role-list).
- Bucket `documentos`: `public=false`, `file_size_limit=10485760`, `allowed_mime_types` (PDF, CSV, xls/xlsx, doc/docx, ods/odt).
- Policies storage: INSERT/UPDATE/DELETE `can_access('relatorios','escrever')`; SELECT para `authenticated` com `can_access('relatorios','ler')` (necessário para download/upsert — lição L-foto: select requerido).
- Deny default storage objects (nenhuma policy a anon).

---

## Data Models (migration 0015)

```sql
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text,
  category    text not null check (category in
                ('FINANCEIRO','MEMBROS','EVENTOS','PATRIMONIO','IGREJAS','GERAL')),
  file_path   text not null unique,
  file_name   text not null,
  mime_type   text not null,
  file_size   integer not null check (file_size >= 0),
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
```

**Relationships**: `documents.uploaded_by → auth.users(id)` (auditoria RN-004); `file_path`
aponta para `documentos/{uuid}.{ext}` no storage. Nenhuma relação com outras tabelas de
domínio (categoria é string — módulos são estáveis).

```typescript
// src/lib/admin/relatorios-constants.ts
export const DOCUMENT_CATEGORIES = [
  "FINANCEIRO", "MEMBROS", "EVENTOS", "PATRIMONIO", "IGREJAS", "GERAL",
] as const;
export type DocumentoCategoria = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export type Documento = {
  id: string; title: string; description: string | null;
  category: DocumentoCategoria; file_path: string; file_name: string;
  mime_type: string; file_size: number; uploaded_by: string | null;
  created_at: string;
};
export type DocumentoDados = {
  title: string; description?: string | null; category: DocumentoCategoria;
};
```

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Sem sessão / não admin (página) | Proxy redirect `/login/admin` (AUTH-14) | Redirecionado ao login |
| Sem papel ou sem `relatorios:ler` | denied-block na página (padrão financeiro:50) | Mensagem "sem permissão" + voltar |
| API sem permissão | `authAdmin`/`requireEscrita` → 401 `nao_autenticado` / 403 `nao_autorizado` | Erro JSON padrão |
| Export `tipo` inválido | 400 `{ error: "tipo_invalido" }` | Nada baixa; log |
| Upload sem título/categoria/arquivo ou inválido | `erroCampos({ titulo?, categoria?, arquivo? })` → 400 | Campos destacados |
| Arquivo > 10MB ou mime não permitido | 400 `{ error: "dados_invalidos", campos: { arquivo } }` | Arquivo rejeitado |
| Documento inexistente (download/remove) | 404 `{ error: "nao_encontrado" }` | Erro JSON padrão |
| Falha de storage/insert no upload | rollback (remove objeto) → 500 `erro_interno` | Sem estado parcial |
| Signed URL falha | 500 `erro_interno` | Download indisponível |

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Upload `multipart` em route handler Next 16 (pattern novo — membros usa JSON, foto usa form via página) | `documentos/route.ts` | Fronte de API pode divergir da foto | Seguir exatamente o padrão do route `lideres/[id]/foto` (`request.formData()` + `File`), validar mimetype no servidor + bucket |
| Bucket privado exige policy de SELECT em `storage.objects` para download/signed URL | migration 0015 | download 403/404 silencioso | Policy SELECT por `can_access('relatorios','ler')` (não anon) — lição do bug da foto (`2737ca0`) |
| CSV com número de formulário brasileiro (vírgula) pode quebrar Excel se sem BOM/separador | `relatorios.ts` | Arquivo "junta tudo" em célula | BOM `\uFEFF` + `;` + escape RFC 4180 + valores numéricos fixos `toFixed(2)` com vírgula |
| `listarLancamentos` consome período; gestão sem período — colunas divergentes | `financeiro.ts` | Export financeiro com filtros divergentes da page | Reusar `LancamentoFiltros`; CSV financeiro só com `tipo/status/periodo`; gestão = lista completa (context.md) |
| Caracteres acentuados em memória → CSV inválido | `relatorios.ts` | Excel mostra corrompido | BOM UTF-8 + header `content-type: text/csv; charset=utf-8` |
| Nome de arquivo original com chars estranhos no `Content-Disposition` | route exportar | Download com nome quebrado | Filename fixo (`relatorio-financeiro-YYYY-MM.csv`) e `file_name` só no metadado (path = uuid) |

> Dashboard: card novo sem quebrar RF-021 — adicionar `Link` após "Financeiro" (navbar admin).

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Formato exportação | CSV `;` + BOM UTF-8 | Abre no Excel PT-BR; sem lib nova; RNF-007 custo R$0 (context.md) |
| Geração relatórios | Rota GET dedicada por download | Sem JS cliente, sem gerar arquivo no storage; navegador baixa direto (AD-016 alignment) |
| Bucket documentos | **Privado** (`public=false`) + signed URL 60s | SECURITY.md: "documentos restritos a papéis com permissão"; URL não fica pública |
| Categorias | Enum fixo `DOCUMENT_CATEGORIES` | Multi-uso (CHECK DB, filtro, form); módulos estáveis — padrão `asset-types.ts` |
| Metadata documentos | Tabela `documents` (migration 0015) | Histórico e auditoria RN-004; `uploaded_by` regista autor |
| RLS | `can_access('relatorios', ...)`, sem anon/role-lists | AD-015 + L-006 (policies por composição, fail-closed) |
| Download/permissão | `escrever` para upload/excluir; `ler` para listar/exportar/baixar | Matriz 0008: FINANCEIRO escreve; SECRETARIA/PATRIMONIAL/LIDER leem (baixam) |

> **Project-level decisions:** módulo `relatorios` já está na matriz (0008) e no `MODULOS`
> do rbac.ts — nenhuma AD nova necessária; decisões desta feature ficam locais.