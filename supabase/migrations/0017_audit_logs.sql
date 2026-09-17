-- 0017_audit_logs.sql
-- RF-030 (Auditoria), modulo `auditoria` da matriz de permissoes (0008).
-- Tabela `audit_logs` para trilha de auditoria de acoes administrativas.
-- RLS via can_access('auditoria', 'ler'): SELECT/INSERT para authenticated
-- com permissao de leitura no modulo auditoria. Sem policies UPDATE/DELETE
-- (tabela imutavel — append-only).

-- ============================================================ table =========

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  autor uuid references auth.users(id),
  acao text not null,
  entidade text not null,
  entidade_id text,
  timestamp timestamptz not null default now(),
  ip inet,
  user_agent text,
  payload jsonb
);

comment on table public.audit_logs is 'Trilha de auditoria (RF-030): acoes administrativas com autor, acao, entidade, entidade_id, timestamp, ip, user_agent, payload';
comment on column public.audit_logs.autor is 'UUID do usuario que executou a acao (auth.users.id); nullable para acoes de sistema';
comment on column public.audit_logs.acao is 'Tipo da acao: criar, editar, excluir, cancelar, baixar, atualizar, etc.';
comment on column public.audit_logs.entidade is 'Entidade afetada: membros, eventos, patrimonio, financeiro, relatorios, usuarios, configuracoes';
comment on column public.audit_logs.entidade_id is 'ID do objeto afetado (text para flexibilidade); nullable para acoes sem entidade especifica';
comment on column public.audit_logs.timestamp is 'Timestamp da acao (timestamptz, default now())';
comment on column public.audit_logs.ip is 'Endereco IP do cliente (inet); extraido do request header';
comment on column public.audit_logs.user_agent is 'User-Agent do cliente; extraido do request header';
comment on column public.audit_logs.payload is 'Dados adicionais da acao (jsonb); opcional';

-- ============================================================ indexes =====

create index if not exists idx_audit_logs_timestamp
  on public.audit_logs (timestamp desc);

create index if not exists idx_audit_logs_entidade
  on public.audit_logs (entidade);

create index if not exists idx_audit_logs_acao
  on public.audit_logs (acao);

-- ============================================================ rls ==========

alter table public.audit_logs enable row level security;

-- SELECT: authenticated com can_access('auditoria', 'ler')
create policy "audit_logs_select_authenticated"
  on public.audit_logs for select to authenticated
  using (public.can_access('auditoria', 'ler'));

-- INSERT: authenticated com can_access('auditoria', 'ler')
-- Qualquer um que pode ler auditoria pode registrar (escrita necessaria
-- para que os route handlers instrumentados funcionem)
create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert to authenticated
  with check (public.can_access('auditoria', 'ler'));

-- Sem policies UPDATE/DELETE: tabela imutavel (append-only)
