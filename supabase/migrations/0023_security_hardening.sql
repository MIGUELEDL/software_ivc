-- 0023_security_hardening.sql
-- Endurecimento de segurança (advisors Supabase):
--
-- 1) `webhook_events` estava SEM RLS (lint ERROR 0013): agora habilita RLS com
--    leitura restrita a `can_access('financeiro','ler')`. NÃO há policy de
--    INSERT para anon/authenticated: a escrita passa a ser feita pela
--    service-role (webhook route usa createAdminClient — BYPASSRLS).
--
-- 2) Funções SECURITY DEFINER expostas via `/rest/v1/rpc` para o role `anon`
--    (lint WARN 0028/0029): `auth_role`, `can_access`, `proxima_matricula` e
--    `proximo_patrimonio`. Revoga EXECUTE do public e mantém apenas para
--    `authenticated` (as policies que as usam são todas de authenticated —
--    verificado em pg_policies; as de anon churches/events/leaders não usam).
--
-- 3) Defense-in-depth: anon perde privilégios de escrita (INSERT/UPDATE/DELETE)
--    em todas as tabelas (atuais e futuras) do schema public — só lê via RLS.

-- 1) RLS em webhook_events (leitura admin de financeiro; escrita só service-role)
alter table public.webhook_events enable row level security;

drop policy if exists webhook_events_select_financeiro on public.webhook_events;
create policy webhook_events_select_financeiro
  on public.webhook_events
  for select
  to authenticated
  using (can_access('financeiro', 'ler'));

-- 2) Restringe EXECUTE das funções SECURITY DEFINER ao role authenticated.
--    As funções tinham grant EXPLÍCITO `anon=X` (não só via public) — é preciso
--    revogar do role anon diretamente, além de do public.
revoke all on function public.auth_role() from public;
revoke all on function public.can_access(text, text) from public;
revoke all on function public.proxima_matricula() from public;
revoke all on function public.proximo_patrimonio() from public;

revoke all on function public.auth_role() from anon;
revoke all on function public.can_access(text, text) from anon;
revoke all on function public.proxima_matricula() from anon;
revoke all on function public.proximo_patrimonio() from anon;

grant execute on function public.auth_role() to authenticated;
grant execute on function public.can_access(text, text) to authenticated;
grant execute on function public.proxima_matricula() to authenticated;
grant execute on function public.proximo_patrimonio() to authenticated;

-- 3) Defense-in-depth: anon perde escrita em tabelas public (atuais e futuras)
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;