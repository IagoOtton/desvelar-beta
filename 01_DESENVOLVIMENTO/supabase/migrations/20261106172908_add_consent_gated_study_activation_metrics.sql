-- Adds opt-in metrics for a first saved Study session and a 7-day return.
-- The event stores only account ID + timestamp in a private table. Dashboard
-- access remains aggregate-only, and all rows expire with the existing 90-day
-- usage retention window.

alter table private.site_usage_consents
  add column if not exists consent_version integer not null default 1;

create table if not exists private.site_usage_first_study_records (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_recorded_at timestamptz not null
);

create index if not exists site_usage_first_study_records_at_idx
  on private.site_usage_first_study_records (first_recorded_at desc);

alter table private.site_usage_first_study_records enable row level security;
revoke all on table private.site_usage_first_study_records
  from public, anon, authenticated, service_role;

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

create or replace function public.get_my_usage_analytics_consent_v2()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce((
    select c.enabled and c.consent_version >= 2
    from private.site_usage_consents as c
    where c.user_id = (select auth.uid())
  ), false);
$function$;

create or replace function public.get_my_usage_analytics_consent_prompt()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from private.site_usage_consent_prompt_queue as q
      where q.user_id = (select auth.uid())
        and q.decided_at is null
    );
$function$;

create or replace function public.get_my_usage_analytics_consent_prompt_v2()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from private.site_usage_consent_prompt_queue as q
        where q.user_id = (select auth.uid())
          and q.decided_at is null
      )
      or exists (
        select 1
        from private.site_usage_consents as c
        where c.user_id = (select auth.uid())
          and c.enabled
          and c.consent_version < 2
      )
    );
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

  insert into private.site_usage_consents (
    user_id, enabled, consent_version, updated_at
  ) values (
    v_user_id, p_enabled, 1, pg_catalog.clock_timestamp()
  )
  on conflict (user_id) do update
  set enabled = excluded.enabled,
      consent_version = excluded.consent_version,
      updated_at = excluded.updated_at;

  if not p_enabled then
    delete from private.site_usage_daily where user_id = v_user_id;
    delete from private.site_usage_active_daily where user_id = v_user_id;
    delete from private.site_usage_activity where user_id = v_user_id;
    delete from private.site_usage_first_study_records where user_id = v_user_id;
  end if;

  update private.site_usage_consent_prompt_queue
  set decided_at = pg_catalog.clock_timestamp()
  where user_id = v_user_id
    and decided_at is null;

  return true;
end;
$function$;

create or replace function public.set_my_usage_analytics_consent_v2(p_enabled boolean)
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

  insert into private.site_usage_consents (
    user_id, enabled, consent_version, updated_at
  ) values (
    v_user_id, p_enabled, 2, pg_catalog.clock_timestamp()
  )
  on conflict (user_id) do update
  set enabled = excluded.enabled,
      consent_version = excluded.consent_version,
      updated_at = excluded.updated_at;

  if not p_enabled then
    delete from private.site_usage_daily where user_id = v_user_id;
    delete from private.site_usage_active_daily where user_id = v_user_id;
    delete from private.site_usage_activity where user_id = v_user_id;
    delete from private.site_usage_first_study_records where user_id = v_user_id;
  end if;

  update private.site_usage_consent_prompt_queue
  set decided_at = pg_catalog.clock_timestamp()
  where user_id = v_user_id
    and decided_at is null;

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
  v_now timestamptz;
  v_today date;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_area is not null and p_area not in (
    'estudo', 'foco', 'temas', 'erros', 'desempenho'
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

  v_now := pg_catalog.clock_timestamp();
  v_today := pg_catalog.timezone('UTC', v_now)::date;

  insert into private.site_usage_active_daily (user_id, usage_date)
  values (v_user_id, v_today)
  on conflict (user_id, usage_date) do nothing;

  insert into private.site_usage_activity as existing (user_id, last_seen_at)
  values (v_user_id, v_now)
  on conflict (user_id) do update
  set last_seen_at = excluded.last_seen_at
  where existing.last_seen_at <= excluded.last_seen_at - interval '1 minute';

  if p_area is not null then
    insert into private.site_usage_daily as existing (
      user_id, usage_date, area, open_count, last_opened_at
    ) values (
      v_user_id, v_today, p_area, 1, v_now
    )
    on conflict (user_id, usage_date, area) do update
    set open_count = case
          when existing.last_opened_at <= excluded.last_opened_at - interval '5 minutes'
            then least(existing.open_count + 1, 1000)
          else existing.open_count
        end,
        last_opened_at = case
          when existing.last_opened_at <= excluded.last_opened_at - interval '5 minutes'
            then excluded.last_opened_at
          else existing.last_opened_at
        end;
  end if;

  return true;
end;
$function$;

create or replace function public.record_my_first_study_record()
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz;
begin
  if v_user_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('desvelar:site-usage:' || v_user_id::text, 0)
  );

  if not exists (
    select 1
    from private.site_usage_consents as c
    where c.user_id = v_user_id
      and c.enabled
      and c.consent_version >= 2
  ) then
    return false;
  end if;

  v_now := pg_catalog.clock_timestamp();

  insert into private.site_usage_first_study_records (user_id, first_recorded_at)
  values (v_user_id, v_now)
  on conflict (user_id) do nothing;

  insert into private.site_usage_active_daily (user_id, usage_date)
  values (v_user_id, pg_catalog.timezone('UTC', v_now)::date)
  on conflict (user_id, usage_date) do nothing;

  insert into private.site_usage_activity as existing (user_id, last_seen_at)
  values (v_user_id, v_now)
  on conflict (user_id) do update
  set last_seen_at = excluded.last_seen_at
  where existing.last_seen_at <= excluded.last_seen_at - interval '1 minute';

  return true;
end;
$function$;

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

  delete from private.site_usage_active_daily
  where usage_date < v_today - 89;

  delete from private.site_usage_activity
  where last_seen_at < v_now - interval '90 days';

  delete from private.site_usage_first_study_records
  where first_recorded_at < v_now - interval '90 days';

  delete from private.site_usage_consents
  where not enabled
    and updated_at < v_now - interval '90 days';
end;
$function$;

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
      from private.site_usage_active_daily as d
      join private.site_usage_consents as c
        on c.user_id = d.user_id and c.enabled
      where d.usage_date >= v_today - 6
    ),
    'active_users_30d', (
      select count(distinct d.user_id)
      from private.site_usage_active_daily as d
      join private.site_usage_consents as c
        on c.user_id = d.user_id and c.enabled
      where d.usage_date >= v_today - 29
    ),
    'active_users_15m', (
      select count(*)
      from private.site_usage_activity as a
      join private.site_usage_consents as c
        on c.user_id = a.user_id and c.enabled
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
        join private.site_usage_consents as c
          on c.user_id = d.user_id and c.enabled
        where d.usage_date >= v_today - 29
          and d.area in ('estudo', 'foco', 'temas', 'erros', 'desempenho')
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
        from private.site_usage_active_daily as d
        join private.site_usage_consents as c
          on c.user_id = d.user_id and c.enabled
        where d.usage_date >= v_today - 29
        group by d.usage_date
      ) as daily on daily.usage_date = v_today - days.day_offset
    ), '[]'::jsonb),
    'activation_metrics', (
      select pg_catalog.jsonb_build_object(
        'version', 1,
        'scope_consent_users', (
          select count(*)
          from private.site_usage_consents as c
          where c.enabled and c.consent_version >= 2
        ),
        'first_study_records_30d', counts.first_records,
        'eligible_first_records_7d', counts.eligible,
        'returned_after_first_record_7d', counts.returned,
        'return_rate_7d', case
          when counts.eligible = 0 then null
          else pg_catalog.round(counts.returned::numeric * 100 / counts.eligible)::integer
        end
      )
      from (
        select
          count(*) filter (
            where fs.first_recorded_at >= v_now - interval '30 days'
          )::bigint as first_records,
          count(*) filter (
            where pg_catalog.timezone('UTC', fs.first_recorded_at)::date >= v_today - 37
              and pg_catalog.timezone('UTC', fs.first_recorded_at)::date <= v_today - 8
          )::bigint as eligible,
          count(*) filter (
            where pg_catalog.timezone('UTC', fs.first_recorded_at)::date >= v_today - 37
              and pg_catalog.timezone('UTC', fs.first_recorded_at)::date <= v_today - 8
              and exists (
                select 1
                from private.site_usage_daily as d
                where d.user_id = fs.user_id
                  and d.usage_date > pg_catalog.timezone('UTC', fs.first_recorded_at)::date
                  and d.usage_date <= pg_catalog.timezone('UTC', fs.first_recorded_at)::date + 7
                  and d.area in ('estudo', 'foco', 'temas', 'erros', 'desempenho')
              )
          )::bigint as returned
        from private.site_usage_first_study_records as fs
        join private.site_usage_consents as c
          on c.user_id = fs.user_id and c.enabled and c.consent_version >= 2
        where fs.first_recorded_at >= v_now - interval '90 days'
      ) as counts
    ),
    'generated_at', v_now
  ) into v_metrics;

  return v_metrics;
end;
$function$;

revoke all on function public.get_my_usage_analytics_consent_v2() from public, anon, authenticated, service_role;
grant execute on function public.get_my_usage_analytics_consent_v2() to authenticated;
revoke all on function public.get_my_usage_analytics_consent_prompt_v2() from public, anon, authenticated, service_role;
grant execute on function public.get_my_usage_analytics_consent_prompt_v2() to authenticated;
revoke all on function public.set_my_usage_analytics_consent_v2(boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_my_usage_analytics_consent_v2(boolean) to authenticated;
revoke all on function public.record_my_first_study_record() from public, anon, authenticated, service_role;
grant execute on function public.record_my_first_study_record() to authenticated;

alter table private.site_privacy_notice_acceptances
  drop constraint if exists site_privacy_notice_acceptances_notice_version_check;

alter table private.site_privacy_notice_acceptances
  add constraint site_privacy_notice_acceptances_notice_version_check
  check (notice_version in ('2026-11-03', '2026-11-06'));

create or replace function public.record_my_privacy_notice_acceptance(
  p_notice_version text
)
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

  if p_notice_version is null
    or p_notice_version not in ('2026-11-03', '2026-11-06') then
    raise exception 'Versão do aviso de privacidade inválida' using errcode = '22023';
  end if;

  insert into private.site_privacy_notice_acceptances (
    user_id, notice_version, accepted_at
  ) values (
    v_user_id, p_notice_version, pg_catalog.clock_timestamp()
  )
  on conflict (user_id, notice_version) do nothing;

  return true;
end;
$function$;
