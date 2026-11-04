create table private.site_usage_consent_prompt_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  queued_at timestamptz not null default pg_catalog.clock_timestamp(),
  decided_at timestamptz
);

alter table private.site_usage_consent_prompt_queue enable row level security;
revoke all on table private.site_usage_consent_prompt_queue from public, anon, authenticated, service_role;

insert into private.site_usage_consent_prompt_queue (user_id)
select u.id
from auth.users as u
where not exists (
  select 1
  from private.site_usage_consents as c
  where c.user_id = u.id
)
and pg_catalog.jsonb_typeof(u.raw_user_meta_data -> 'usage_analytics_consent') is distinct from 'boolean'
on conflict (user_id) do nothing;

create or replace function private.enqueue_usage_analytics_consent_prompt()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if pg_catalog.jsonb_typeof(new.raw_user_meta_data -> 'usage_analytics_consent') is distinct from 'boolean' then
    insert into private.site_usage_consent_prompt_queue (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function private.enqueue_usage_analytics_consent_prompt() from public, anon, authenticated, service_role;

create trigger queue_usage_analytics_consent_prompt_on_signup
after insert on auth.users
for each row
execute function private.enqueue_usage_analytics_consent_prompt();

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
    delete from private.site_usage_active_daily where user_id = v_user_id;
    delete from private.site_usage_activity where user_id = v_user_id;
  end if;

  update private.site_usage_consent_prompt_queue
  set decided_at = pg_catalog.clock_timestamp()
  where user_id = v_user_id
    and decided_at is null;

  return true;
end;
$function$;

revoke all on function public.get_my_usage_analytics_consent_prompt() from public, anon, authenticated, service_role;
grant execute on function public.get_my_usage_analytics_consent_prompt() to authenticated;
