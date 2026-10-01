-- 0024_validade_cartao.sql
-- Ciclo-base de `members.validade_cartao` = `criado_em + 1 ano`.
--
-- Contexto (feature cartao-valididade-anual, AD-020): o cartão de membro não
-- vence — renova sozinho a cada ano. A coluna `validade_cartao` (criada em
-- 0020) passa a guardar o CICLO-BASE, e o valor que o membro vê é calculado em
-- `src/lib/painel/validade.ts` a partir de `criado_em`.
--
-- Por que trigger e não pg_cron: um trigger só dispara em escrita, então a
-- coluna permanece no ciclo-base enquanto o tempo passa. Isso é deliberado —
-- a coluna existe para relatórios/CSV — e NÃO é um bug de renovação. Torná-la
-- rolante exigiria um job agendado que reescrevesse 11 linhas por ano sem
-- ganho real, já que o cálculo do ciclo corrente é puro e acontece no render.
--
-- Idempotente: `create or replace function` + `drop trigger if exists` +
-- backfill restrito a `where validade_cartao is null`.

-- 1) Função do ciclo-base. `make_date` normaliza o overflow de 29/02 para
--    28/02 em ano não bissexto — nunca produz uma data inválida nem 01/03.
--
--    `criado_em` é `timestamptz`, mas o cartão é documento civil: o dia do
--    registro é o dia no calendário da igreja, não o dia UTC. Por isso o
--    `at time zone 'America/Sao_Paulo'` explícito — sem ele a função herdaria o
--    `TimeZone` da sessão e o mesmo membro teria ciclo-base diferente conforme
--    quem conectou. `src/lib/painel/validade.ts` usa o mesmo fuso.
create or replace function public.members_ciclo_base(p_criado_em timestamptz)
returns date
language sql
immutable
set search_path = public
as $$
  select make_date(
    extract(year  from (p_criado_em at time zone 'America/Sao_Paulo'))::int + 1,
    extract(month from (p_criado_em at time zone 'America/Sao_Paulo'))::int,
    least(
      extract(day from (p_criado_em at time zone 'America/Sao_Paulo'))::int,
      extract(day from (
        date_trunc('month', (p_criado_em at time zone 'America/Sao_Paulo') + interval '1 year')
        + interval '1 month - 1 day'
      ))::int
    )
  );
$$;

-- 2) Trigger BEFORE INSERT OR UPDATE: popula a coluna a partir de `criado_em`.
--    Ele grava `criado_em`, nunca `validade_cartao` — um membro não consegue
--    escolher o próprio ciclo-base, porque a policy `members_update_own`
--    (0001:52-55) restringe a LINHA e não as colunas. Se `criado_em` for
--    alterado por um caminho privilegiado, a validade é recalculada junto.
create or replace function public.members_set_validade_cartao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.criado_em is null then
    new.validade_cartao := null;
  else
    new.validade_cartao := public.members_ciclo_base(new.criado_em);
  end if;
  return new;
end;
$$;

drop trigger if exists members_validade_cartao on public.members;

create trigger members_validade_cartao
  before insert or update on public.members
  for each row
  execute function public.members_set_validade_cartao();

-- 3) Backfill das linhas já existentes (as 11 do seed), só onde a coluna está
--    vazia — reexecutar a migration não sobrescreve nada e não altera
--    contagem nem qualquer outro dado de `members`.
update public.members
   set validade_cartao = public.members_ciclo_base(criado_em)
 where validade_cartao is null
   and criado_em is not null;
