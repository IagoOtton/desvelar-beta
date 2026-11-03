-- Keep a server-timestamped record of the privacy notice version accepted at signup.

create table if not exists private.site_privacy_notice_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_version text not null check (notice_version = '2026-11-03'),
  accepted_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (user_id, notice_version)
);

alter table private.site_privacy_notice_acceptances enable row level security;
revoke all on table private.site_privacy_notice_acceptances
  from public, anon, authenticated, service_role;

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

  if p_notice_version is distinct from '2026-11-03' then
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

revoke all on function public.record_my_privacy_notice_acceptance(text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_my_privacy_notice_acceptance(text)
  to authenticated;
