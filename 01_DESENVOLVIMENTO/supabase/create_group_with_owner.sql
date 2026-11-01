alter table public.groups
  alter column invite_code set default (
    upper(
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8) ||
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8)
    )
  );

create or replace function public.create_group_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_name text := btrim(p_name);
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  if v_name is null or v_name = '' then
    raise exception 'Informe o nome do grupo' using errcode = '22023';
  end if;

  if char_length(v_name) > 60 then
    raise exception 'O nome do grupo deve ter no máximo 60 caracteres'
      using errcode = '22023';
  end if;

  insert into public.groups (name, created_by)
  values (v_name, v_user_id)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$function$;

revoke execute on function public.create_group_with_owner(text)
  from public, anon;
grant execute on function public.create_group_with_owner(text)
  to authenticated;
