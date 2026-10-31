create table if not exists public.app_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.app_user_data enable row level security;

revoke all privileges on table public.app_user_data from anon, authenticated;
grant select on table public.app_user_data to authenticated;

drop policy if exists app_user_data_select_own
  on public.app_user_data;

create policy app_user_data_select_own
  on public.app_user_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.save_my_app_data(
  p_data jsonb,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_row public.app_user_data%rowtype;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na sua conta';
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Os dados do aplicativo precisam ser um objeto JSON';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'A revisão esperada é inválida';
  end if;

  if p_expected_revision = 0 then
    insert into public.app_user_data (user_id, data, revision, updated_at)
    values (v_user_id, p_data, 1, now())
    on conflict (user_id) do nothing
    returning * into v_row;

    if found then
      return jsonb_build_object(
        'ok', true,
        'data', v_row.data,
        'revision', v_row.revision,
        'updated_at', v_row.updated_at
      );
    end if;
  end if;

  update public.app_user_data
  set data = p_data,
      revision = revision + 1,
      updated_at = now()
  where user_id = v_user_id
    and revision = p_expected_revision
  returning * into v_row;

  if found then
    return jsonb_build_object(
      'ok', true,
      'data', v_row.data,
      'revision', v_row.revision,
      'updated_at', v_row.updated_at
    );
  end if;

  select * into v_row
  from public.app_user_data
  where user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'data', null, 'revision', 0);
  end if;

  return jsonb_build_object(
    'ok', false,
    'data', v_row.data,
    'revision', v_row.revision,
    'updated_at', v_row.updated_at
  );
end;
$function$;

revoke all on function public.save_my_app_data(jsonb, bigint) from public, anon, authenticated;
grant execute on function public.save_my_app_data(jsonb, bigint) to authenticated;

