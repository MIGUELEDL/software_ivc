-- 0005_proxima_matricula_rpc.sql
-- RPC `proxima_matricula()`: gera a próxima matrícula IVC-#### a partir da
-- sequence versionada `members_matricula_seq` (0001:5), CVII usando `nextval`.
--
-- Por que RPC e não o select no client: `members` tem RLS `members_select_own`
-- (0001:44-46) que filtra pelo `auth.uid()`. Um membro recém-autenticado SEM
-- cadastro vê `[]` — `generateMatricula()` (members.ts:47-62) prosseguia com
-- max=0 e gerava sempre `IVC-0001`, colidindo com o seed (23505 → 409
-- permanente no autocadastro). Uma sequence NÃO tem RLS: `nextval` retorna o
-- próximo valor incondicionalmente, então a corrida é resolvida na própria
-- sequence (não precisa de max+1 nem de RLS).
--
-- `security definer` roda com os privilégios do dono (postgres), burlando RLS
-- de leitura para TODO o enum de members — o único dado vazado é um inteiro
-- sequencial já exposto na própria matrícula. `set search_path` fixa o schema
-- (defesa contra hijack de search_path).

create or replace function public.proxima_matricula()
returns text
language sql
security definer
set search_path = public
as $$
  select 'IVC-' || lpad(nextval('public.members_matricula_seq')::text, 4, '0');
$$;

-- A DB role autenticada (supabase client server) precisa executar a RPC.
-- Restringimos a EXECUTE às roles de app (anon lê via RLS no client; não deve
-- poder gerar matrícula fora do fluxo de autocadastro autenticado).
revoke all on function public.proxima_matricula() from public;
grant execute on function public.proxima_matricula() to authenticated;

-- Sincroniza a sequence com o seed (0002:41 setou 1 — o próximo nextval dará
-- IVC-0002, sem colidir com o IVC-0001 do membro de teste).
select setval('public.members_matricula_seq', 1, true);
