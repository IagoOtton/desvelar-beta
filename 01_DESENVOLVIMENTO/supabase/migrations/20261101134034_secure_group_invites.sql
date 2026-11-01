-- Keep existing 8-character invitation codes valid while issuing stronger codes.
alter table public.groups
  alter column invite_code set default (
    upper(
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8) ||
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8)
    )
  );

alter table public.reader_groups
  drop constraint if exists reader_groups_invite_code_check;
alter table public.reader_groups
  add constraint reader_groups_invite_code_check
  check (invite_code ~ '^([A-Z0-9]{8}|[A-F0-9]{16})$');

-- One account-level limiter is shared by both group invitation flows.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.group_invite_join_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failed_attempts smallint not null check (failed_attempts between 1 and 5),
  window_started_at timestamptz not null,
  blocked_until timestamptz
);

alter table private.group_invite_join_attempts enable row level security;
revoke all on table private.group_invite_join_attempts
  from public, anon, authenticated, service_role;

create or replace function private.begin_group_invite_join(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_failed_attempts smallint;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
  v_now timestamptz;
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('desvelar:group-invite:' || p_user_id::text, 0)
  );
  v_now := pg_catalog.clock_timestamp();

  select a.failed_attempts, a.window_started_at, a.blocked_until
  into v_failed_attempts, v_window_started_at, v_blocked_until
  from private.group_invite_join_attempts a
  where a.user_id = p_user_id;

  if not found then
    return true;
  end if;

  if v_blocked_until is not null and v_blocked_until > v_now then
    return false;
  end if;

  if v_window_started_at <= v_now - interval '15 minutes'
     or (v_blocked_until is not null and v_blocked_until <= v_now) then
    delete from private.group_invite_join_attempts where user_id = p_user_id;
    return true;
  end if;

  return v_failed_attempts < 5;
end;
$function$;

create or replace function private.record_group_invite_join_failure(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    return;
  end if;

  insert into private.group_invite_join_attempts as existing (
    user_id, failed_attempts, window_started_at, blocked_until
  ) values (
    p_user_id, 1, v_now, null
  )
  on conflict (user_id) do update set
    failed_attempts = case
      when existing.window_started_at <= excluded.window_started_at - interval '15 minutes'
        or (existing.blocked_until is not null and existing.blocked_until <= excluded.window_started_at)
        then 1
      else existing.failed_attempts + 1
    end,
    window_started_at = case
      when existing.window_started_at <= excluded.window_started_at - interval '15 minutes'
        or (existing.blocked_until is not null and existing.blocked_until <= excluded.window_started_at)
        then excluded.window_started_at
      else existing.window_started_at
    end,
    blocked_until = case
      when existing.window_started_at <= excluded.window_started_at - interval '15 minutes'
        or (existing.blocked_until is not null and existing.blocked_until <= excluded.window_started_at)
        then null
      when existing.failed_attempts + 1 >= 5
        then excluded.window_started_at + interval '15 minutes'
      else existing.blocked_until
    end;
end;
$function$;

revoke all on function private.begin_group_invite_join(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.record_group_invite_join_failure(uuid)
  from public, anon, authenticated, service_role;

-- Invalid codes return NULL so the failed-attempt increment commits with the RPC.
create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_code text := upper(btrim(coalesce(p_invite_code, '')));
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  if not private.begin_group_invite_join(v_user_id) then
    raise exception 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente'
      using errcode = 'P0001';
  end if;

  if v_code !~ '^([A-Z0-9]{8}|[A-F0-9]{16})$' then
    perform private.record_group_invite_join_failure(v_user_id);
    return null;
  end if;

  select g.id into v_group_id
  from public.groups g
  where g.invite_code = v_code;

  if v_group_id is null then
    perform private.record_group_invite_join_failure(v_user_id);
    return null;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  delete from private.group_invite_join_attempts where user_id = v_user_id;
  return v_group_id;
end;
$function$;

create or replace function public.join_reader_group(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_code text := upper(btrim(coalesce(p_invite_code, '')));
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  if not private.begin_group_invite_join(v_user_id) then
    raise exception 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente'
      using errcode = 'P0001';
  end if;

  if v_code !~ '^([A-Z0-9]{8}|[A-F0-9]{16})$' then
    perform private.record_group_invite_join_failure(v_user_id);
    return null;
  end if;

  select g.id into v_group_id
  from public.reader_groups g
  where g.invite_code = v_code;

  if v_group_id is null then
    perform private.record_group_invite_join_failure(v_user_id);
    return null;
  end if;

  insert into public.reader_group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  delete from private.group_invite_join_attempts where user_id = v_user_id;
  return v_group_id;
end;
$function$;

revoke all on function public.join_group_by_invite(text)
  from public, anon, authenticated, service_role;
revoke all on function public.join_reader_group(text)
  from public, anon, authenticated, service_role;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.join_reader_group(text) to authenticated;
