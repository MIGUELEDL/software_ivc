-- 0028_aniversariantes_rpc.sql
-- RPC pública (anon) que devolve os nomes dos membros ATIVO aniversariantes
-- do dia (fuso America/Fortaleza), para o banner da landing. Só nomes —
-- nenhum dado sensível (ANI-06). Padrão da RPC 0005 (SECURITY DEFINER +
-- search_path fixo).
create or replace function public.aniversariantes_do_dia()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(m.nome order by m.nome), '{}')
  from members m
  where m.status = 'ATIVO'
    and extract(month from m.nascimento) = extract(month from (now() at time zone 'America/Fortaleza'))
    and extract(day   from m.nascimento) = extract(day   from (now() at time zone 'America/Fortaleza'));
$$;

comment on function public.aniversariantes_do_dia() is
  'Nomes dos membros ATIVO aniversariantes hoje (America/Fortaleza). Público (anon) para o banner da landing.';

grant execute on function public.aniversariantes_do_dia() to anon, authenticated;
