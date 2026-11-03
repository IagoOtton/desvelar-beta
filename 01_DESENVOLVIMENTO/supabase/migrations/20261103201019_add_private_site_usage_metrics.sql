-- Optional, coarse product analytics for the DESVELAR owner dashboard.
-- No progress, message, profile, finance, workout, book, or note content is stored.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.site_usage_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists private.site_usage_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default pg_catalog.now()
);

create table if not exists private.site_usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  area text not null check (area in (
    'inicio', 'agenda', 'estudo', 'foco', 'temas', 'erros', 'desempenho',
    'atividade_fisica', 'atividade_treino', 'atividade_rotinas',
    'atividade_historico', 'atividade_desempenho', 'atividade_medidas',
    'leitura', 'financas', 'comunidade_estudos',
    'comunidade_atividade_fisica', 'comunidade', 'grupos'
  )),
  open_count integer not null default 1 check (open_count between 0 and 1000),
  last_opened_at timestamptz not null,
  primary key (user_id, usage_date, area)
);

create index if not exists site_usage_daily_date_area_idx
  on private.site_usage_daily (usage_date desc, area);

create table if not exists private.site_usage_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null
);

alter table private.site_usage_admins enable row level security;
alter table private.site_usage_consents enable row level security;
alter table private.site_usage_daily enable row level security;
alter table private.site_usage_activity enable row level security;

revoke all on table private.site_usage_admins,
  private.site_usage_consents,
  private.site_usage_daily,
  private.site_usage_activity
from public, anon, authenticated, service_role;

-- Bootstrap the owner using the public contact email; the actual user UUID stays in the database.
insert into private.site_usage_admins (user_id)
select u.id
from auth.users as u
where pg_catalog.lower(u.email) = 'iagoottonwork@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.is_site_usage_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from private.site_usage_admins as a
    where a.user_id = (select auth.uid())
  );
$function$;

create or replace function public.get_my_usage_analytics_consent()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce((
    select c.enabled
    from private.site_usage_consents as c
    where c.user_id = (select auth.uid())
  ), false);
$function$;

create or replace function public.set_my_usage_analytics_consent(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  if p_enabled is null then
    raise exception 'A escolha de métricas é obrigatória' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('desvelar:site-usage:' || v_user_id::text, 0)
  );

  insert into private.site_usage_consents (user_id, enabled, updated_at)
  values (v_user_id, p_enabled, pg_catalog.clock_timestamp())
  on conflict (user_id) do update
  set enabled = excluded.enabled,
      updated_at = excluded.updated_at;

  if not p_enabled then
    delete from private.site_usage_daily where user_id = v_user_id;
    delete from private.site_usage_activity where user_id = v_user_id;
  end if;

  return true;
end;
$function$;

create or replace function public.record_my_site_usage(p_area text default null)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_today date := pg_catalog.timezone('UTC', pg_catalog.clock_timestamp())::date;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_area is not null and p_area not in (
    'inicio', 'agenda', 'estudo', 'foco', 'temas', 'erros', 'desempenho',
    'atividade_fisica', 'atividade_treino', 'atividade_rotinas',
    'atividade_historico', 'atividade_desempenho', 'atividade_medidas',
    'leitura', 'financas', 'comunidade_estudos',
    'comunidade_atividade_fisica', 'comunidade', 'grupos'
  ) then
    raise exception 'Área inválida' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('desvelar:site-usage:' || v_user_id::text, 0)
  );

  if not exists (
    select 1
    from private.site_usage_consents as c
    where c.user_id = v_user_id
      and c.enabled
  ) then
    return false;
  end if;

  insert into private.site_usage_activity as existing (user_id, last_seen_at)
  values (v_user_id, v_now)
  on conflict (user_id) do update
  set last_seen_at = excluded.last_seen_at
  where existing.last_seen_at <= excluded.last_seen_at - interval '1 minute';

  if p_area is not null then
    insert into private.site_usage_daily as existing (user_id, usage_date, area, open_count, last_opened_at)
    values (v_user_id, v_today, p_area, 1, v_now)
    on conflict (user_id, usage_date, area) do update
    set open_count = case
          when existing.last_opened_at <= excluded.last_opened_at - interval '5 minutes'
            then least(existing.open_count + 1, 1000)
          else existing.open_count
        end,
        last_opened_at = case
          when existing.last_opened_at <= excluded.last_opened_at - interval '5 minutes'
            then excluded.last_opened_at
          else private.site_usage_daily.last_opened_at
        end;
  end if;

  return true;
end;
$function$;

create extension if not exists pg_cron;

create or replace function private.purge_site_usage_old_records()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_today date := pg_catalog.timezone('UTC', pg_catalog.clock_timestamp())::date;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  delete from private.site_usage_daily
  where usage_date < v_today - 89;

  delete from private.site_usage_activity
  where last_seen_at < v_now - interval '90 days';

  delete from private.site_usage_consents
  where not enabled
    and updated_at < v_now - interval '90 days';
end;
$function$;

revoke all on function private.purge_site_usage_old_records()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'desvelar-site-usage-retention',
  '15 4 * * *',
  'select private.purge_site_usage_old_records()'
);

create or replace function public.get_site_usage_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_now timestamptz := pg_catalog.now();
  v_today date := pg_catalog.timezone('UTC', pg_catalog.now())::date;
  v_metrics jsonb;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from private.site_usage_admins as a
    where a.user_id = (select auth.uid())
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  select pg_catalog.jsonb_build_object(
    'registered_users', (select count(*) from auth.users),
    'consented_users', (
      select count(*)
      from private.site_usage_consents as c
      where c.enabled
    ),
    'active_users_7d', (
      select count(distinct d.user_id)
      from private.site_usage_daily as d
      where d.usage_date >= v_today - 6
    ),
    'active_users_30d', (
      select count(distinct d.user_id)
      from private.site_usage_daily as d
      where d.usage_date >= v_today - 29
    ),
    'active_users_15m', (
      select count(*)
      from private.site_usage_activity as a
      join private.site_usage_consents as c on c.user_id = a.user_id and c.enabled
      where a.last_seen_at >= v_now - interval '15 minutes'
    ),
    'area_usage', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'area', usage.area,
          'opens', usage.open_count,
          'users', usage.users
        ) order by usage.open_count desc, usage.area
      )
      from (
        select d.area,
          sum(d.open_count)::bigint as open_count,
          count(distinct d.user_id)::bigint as users
        from private.site_usage_daily as d
        where d.usage_date >= v_today - 29
        group by d.area
      ) as usage
    ), '[]'::jsonb),
    'daily_active_users', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'date', pg_catalog.to_char(v_today - days.day_offset, 'YYYY-MM-DD'),
          'users', coalesce(daily.active_users, 0)
        ) order by days.day_offset desc
      )
      from pg_catalog.generate_series(0, 29) as days(day_offset)
      left join (
        select d.usage_date, count(distinct d.user_id)::bigint as active_users
        from private.site_usage_daily as d
        where d.usage_date >= v_today - 29
        group by d.usage_date
      ) as daily on daily.usage_date = v_today - days.day_offset
    ), '[]'::jsonb),
    'generated_at', v_now
  ) into v_metrics;

  return v_metrics;
end;
$function$;

revoke all on function public.is_site_usage_admin() from public, anon, authenticated, service_role;
revoke all on function public.get_my_usage_analytics_consent() from public, anon, authenticated, service_role;
revoke all on function public.set_my_usage_analytics_consent(boolean) from public, anon, authenticated, service_role;
revoke all on function public.record_my_site_usage(text) from public, anon, authenticated, service_role;
revoke all on function public.get_site_usage_metrics() from public, anon, authenticated, service_role;

grant execute on function public.is_site_usage_admin() to authenticated;
grant execute on function public.get_my_usage_analytics_consent() to authenticated;
grant execute on function public.set_my_usage_analytics_consent(boolean) to authenticated;
grant execute on function public.record_my_site_usage(text) to authenticated;
grant execute on function public.get_site_usage_metrics() to authenticated;
