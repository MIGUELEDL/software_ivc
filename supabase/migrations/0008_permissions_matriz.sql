-- 0008_permissions_matriz.sql
-- Matriz de permissões (RF-032 / MATRIZ-01..13): tabela `permissions` como
-- fonte única do RBAC fino, função `can_access()` para as policies RLS e seed
-- dos 48 pares do Anexo A do spec. Recria as policies admin de 0006
-- (`members_*_admin`, `docs_*_admin`) para decidir via `can_access('membros')`
-- — as role-lists saem do SQL (AD-015, lição L-006).

-- Tabela da matriz: par (role, module) com nível hierárquico. Sem FK: papéis
-- vivem em `app_metadata.role` (AD-013); módulos são enum no código (design).
create table if not exists public.permissions (
  role       text not null,
  module     text not null,
  nivel      text not null check (nivel in ('ler','escrever','administrar')),
  criado_em  timestamptz not null default now(),
  primary key (role, module)
);

comment on table public.permissions is 'Matriz de permissões RBAC (RF-032): papel x módulo x nível hierárquico (ler < escrever < administrar)';
comment on column public.permissions.role is 'Papel do app_metadata (MEMBRO/SECRETARIA/LIDER/FINANCEIRO/PATRIMONIAL/ADMIN/SUPER_ADMIN); sem FK — papéis não são tabela (AD-013)';
comment on column public.permissions.module is 'Módulo admin (dashboard, membros, igrejas, eventos, patrimonio, financeiro, relatorios, usuarios, configuracoes, auditoria)';
comment on column public.permissions.nivel is 'Nível hierárquico: administrar concede ler+escrever+administrar; escrever concede ler+escrever; ler concede só ler';

alter table public.permissions enable row level security;

-- Leitura liberada a qualquer sessão autenticada (dado não-sensível: o modelo
-- de RBAC; o app decide via session client sem service-role — assumption do
-- spec). Escrita (INSERT/UPDATE/DELETE) restrita a SUPER_ADMIN: a matriz só
-- muda via SQL/seed até a RF-028 criar a UI de gestão.
create policy "permissions_select_authenticated"
  on public.permissions for select to authenticated
  using (true);

create policy "permissions_insert_super_admin"
  on public.permissions for insert to authenticated
  with check (public.auth_role() = 'SUPER_ADMIN');

create policy "permissions_update_super_admin"
  on public.permissions for update to authenticated
  using (public.auth_role() = 'SUPER_ADMIN')
  with check (public.auth_role() = 'SUPER_ADMIN');

create policy "permissions_delete_super_admin"
  on public.permissions for delete to authenticated
  using (public.auth_role() = 'SUPER_ADMIN');

-- Decisão da matriz para as policies RLS: papel do JWT via `auth_role()` (0006),
-- leitura direta de `permissions` (SECURITY DEFINER burla RLS de leitura — a
-- policy em si roda no contexto da query do app). Hierarquia por comparação:
-- administrar concede qualquer p_nivel; escrever concede ler/escrever; ler só
-- ler. Sem linha → false (fail-closed, MATRIZ-10/11).
create or replace function public.can_access(p_module text, p_nivel text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.permissions
    where role = public.auth_role()
      and module = p_module
      and (
        nivel = 'administrar'
        or (nivel = 'escrever' and p_nivel in ('ler','escrever'))
        or (nivel = 'ler' and p_nivel = 'ler')
      )
  );
$$;

-- EXECUTE limitada à role autenticada (as policies admin são `to
-- authenticated`); revoga do público como no padrão 0005/0006.
revoke all on function public.can_access(text,text) from public;
grant execute on function public.can_access(text,text) to authenticated;

comment on function public.can_access(text,text) is 'Autoriza o papel do JWT a um nível em um módulo segundo a matriz permissions; hierarquia ler<escrever<administrar; sem linha → false (fail-closed)';

-- Seed dos 48 pares (Anexo A do spec) — idempotente em re-aplicação.
-- Papéis: SUPER_ADMIN/ADMIN administram os 10 módulos; SECRETARIA escreve
-- membros/eventos e lê os demais; FINANCEIRO escreve financeiro/relatorios;
-- PATRIMONIAL escreve patrimonio; LIDER lê. usuarios/configuracoes/auditoria
-- só ADMIN/SUPER_ADMIN; MEMBRO sem linha (sem acesso admin — policies 0001
-- seguem governando os dados próprios).
insert into public.permissions (role, module, nivel) values
  ('SUPER_ADMIN','dashboard','administrar'),
  ('SUPER_ADMIN','membros','administrar'),
  ('SUPER_ADMIN','igrejas','administrar'),
  ('SUPER_ADMIN','eventos','administrar'),
  ('SUPER_ADMIN','patrimonio','administrar'),
  ('SUPER_ADMIN','financeiro','administrar'),
  ('SUPER_ADMIN','relatorios','administrar'),
  ('SUPER_ADMIN','usuarios','administrar'),
  ('SUPER_ADMIN','configuracoes','administrar'),
  ('SUPER_ADMIN','auditoria','administrar'),
  ('ADMIN','dashboard','administrar'),
  ('ADMIN','membros','administrar'),
  ('ADMIN','igrejas','administrar'),
  ('ADMIN','eventos','administrar'),
  ('ADMIN','patrimonio','administrar'),
  ('ADMIN','financeiro','administrar'),
  ('ADMIN','relatorios','administrar'),
  ('ADMIN','usuarios','administrar'),
  ('ADMIN','configuracoes','administrar'),
  ('ADMIN','auditoria','administrar'),
  ('SECRETARIA','dashboard','ler'),
  ('SECRETARIA','membros','escrever'),
  ('SECRETARIA','igrejas','ler'),
  ('SECRETARIA','eventos','escrever'),
  ('SECRETARIA','patrimonio','ler'),
  ('SECRETARIA','financeiro','ler'),
  ('SECRETARIA','relatorios','ler'),
  ('FINANCEIRO','dashboard','ler'),
  ('FINANCEIRO','membros','ler'),
  ('FINANCEIRO','igrejas','ler'),
  ('FINANCEIRO','eventos','ler'),
  ('FINANCEIRO','patrimonio','ler'),
  ('FINANCEIRO','financeiro','escrever'),
  ('FINANCEIRO','relatorios','escrever'),
  ('PATRIMONIAL','dashboard','ler'),
  ('PATRIMONIAL','membros','ler'),
  ('PATRIMONIAL','igrejas','ler'),
  ('PATRIMONIAL','eventos','ler'),
  ('PATRIMONIAL','patrimonio','escrever'),
  ('PATRIMONIAL','financeiro','ler'),
  ('PATRIMONIAL','relatorios','ler'),
  ('LIDER','dashboard','ler'),
  ('LIDER','membros','ler'),
  ('LIDER','igrejas','ler'),
  ('LIDER','eventos','ler'),
  ('LIDER','patrimonio','ler'),
  ('LIDER','financeiro','ler'),
  ('LIDER','relatorios','ler')
on conflict (role, module) do nothing;

-- Recria as policies admin de members/member_documents (0006:54-84) decidindo
-- via `can_access('membros', ...)` — a fonte única da matriz substitui as
-- role-lists hard-coded no SQL (paridade exata de papéis: SECRETARIA escreve,
-- FINANCEIRO/PATRIMONIAL/LIDER leem, ADMIN/SUPER_ADMIN administram; hard-delete
-- só administrar). Policies de 0001 (members_*_own etc.) ficam intactas.

drop policy if exists "members_select_admin" on public.members;
create policy "members_select_admin"
  on public.members for select to authenticated
  using (public.can_access('membros','ler'));

drop policy if exists "members_insert_admin" on public.members;
create policy "members_insert_admin"
  on public.members for insert to authenticated
  with check (public.can_access('membros','escrever'));

drop policy if exists "members_update_admin" on public.members;
create policy "members_update_admin"
  on public.members for update to authenticated
  using (public.can_access('membros','escrever'))
  with check (public.can_access('membros','escrever'));

drop policy if exists "members_delete_admin" on public.members;
create policy "members_delete_admin"
  on public.members for delete to authenticated
  using (public.can_access('membros','administrar'));

drop policy if exists "docs_select_admin" on public.member_documents;
create policy "docs_select_admin"
  on public.member_documents for select to authenticated
  using (public.can_access('membros','ler'));

drop policy if exists "docs_insert_admin" on public.member_documents;
create policy "docs_insert_admin"
  on public.member_documents for insert to authenticated
  with check (public.can_access('membros','escrever'));

drop policy if exists "docs_delete_admin" on public.member_documents;
create policy "docs_delete_admin"
  on public.member_documents for delete to authenticated
  using (public.can_access('membros','escrever'));