-- Admin broadcasts are stored once and made visible to accounts that existed
-- when the message was sent. Per-user read state is stored separately.

create table if not exists private.site_broadcasts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  request_id uuid not null,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (pg_catalog.char_length(title) between 1 and 120),
  body text not null check (pg_catalog.char_length(body) between 1 and 3000),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  recipient_count integer not null check (recipient_count >= 0),
  unique (created_by, request_id)
);

create index if not exists site_broadcasts_created_at_idx
  on private.site_broadcasts (created_at desc);

create table if not exists private.site_broadcast_reads (
  broadcast_id uuid not null references private.site_broadcasts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (broadcast_id, user_id)
);

alter table private.site_broadcasts enable row level security;
alter table private.site_broadcast_reads enable row level security;

revoke all on table private.site_broadcasts, private.site_broadcast_reads
  from public, anon, authenticated, service_role;

create or replace function public.publish_site_broadcast(
  p_request_id uuid,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_title text := pg_catalog.btrim(coalesce(p_title, ''));
  v_body text := pg_catalog.btrim(coalesce(p_body, ''));
  v_recipient_count integer;
  v_broadcast private.site_broadcasts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  if not exists (
    select 1 from private.site_usage_admins as a where a.user_id = v_user_id
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Identificador da solicitação inválido' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_title) < 1 or pg_catalog.char_length(v_title) > 120 then
    raise exception 'O título precisa ter entre 1 e 120 caracteres' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_body) < 1 or pg_catalog.char_length(v_body) > 3000 then
    raise exception 'A mensagem precisa ter entre 1 e 3000 caracteres' using errcode = '22023';
  end if;

  select pg_catalog.count(*)::integer
    into v_recipient_count
    from auth.users as u
    where u.created_at <= v_now;

  insert into private.site_broadcasts (
    request_id, created_by, title, body, created_at, recipient_count
  )
  values (
    p_request_id, v_user_id, v_title, v_body, v_now, v_recipient_count
  )
  on conflict (created_by, request_id) do nothing
  returning * into v_broadcast;

  if not found then
    select * into v_broadcast
    from private.site_broadcasts as b
    where b.created_by = v_user_id and b.request_id = p_request_id;
  end if;

  if v_broadcast.id is null then
    raise exception 'Não foi possível salvar o aviso' using errcode = 'P0001';
  end if;

  -- Do not show the sender's own broadcast as unread.
  insert into private.site_broadcast_reads (broadcast_id, user_id)
  values (v_broadcast.id, v_user_id)
  on conflict (broadcast_id, user_id) do nothing;

  return pg_catalog.jsonb_build_object(
    'id', v_broadcast.id,
    'title', v_broadcast.title,
    'created_at', v_broadcast.created_at,
    'recipient_count', v_broadcast.recipient_count
  );
end;
$function$;

create or replace function public.get_my_site_broadcasts()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_user_created_at timestamptz;
  v_items jsonb;
  v_unread_count bigint;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  select u.created_at into v_user_created_at
  from auth.users as u where u.id = v_user_id;
  if v_user_created_at is null then
    raise exception 'Conta não encontrada' using errcode = '28000';
  end if;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', recent.id,
      'title', recent.title,
      'body', recent.body,
      'created_at', recent.created_at,
      'read_at', recent.read_at
    ) order by recent.created_at desc
  ), '[]'::jsonb)
  into v_items
  from (
    select b.id, b.title, b.body, b.created_at, r.read_at
    from private.site_broadcasts as b
    left join private.site_broadcast_reads as r
      on r.broadcast_id = b.id and r.user_id = v_user_id
    where b.created_at >= v_user_created_at
    order by b.created_at desc
    limit 50
  ) as recent;

  select pg_catalog.count(*) into v_unread_count
  from private.site_broadcasts as b
  left join private.site_broadcast_reads as r
    on r.broadcast_id = b.id and r.user_id = v_user_id
  where b.created_at >= v_user_created_at and r.read_at is null;

  return pg_catalog.jsonb_build_object(
    'items', v_items,
    'unread_count', v_unread_count
  );
end;
$function$;

create or replace function public.mark_my_site_broadcast_read(p_broadcast_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_user_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  select u.created_at into v_user_created_at
  from auth.users as u where u.id = v_user_id;
  if v_user_created_at is null or not exists (
    select 1
    from private.site_broadcasts as b
    where b.id = p_broadcast_id and b.created_at >= v_user_created_at
  ) then
    raise exception 'Aviso não encontrado' using errcode = '42501';
  end if;

  insert into private.site_broadcast_reads (broadcast_id, user_id)
  values (p_broadcast_id, v_user_id)
  on conflict (broadcast_id, user_id) do nothing;

  return true;
end;
$function$;

create or replace function public.get_admin_site_broadcasts()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_items jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from private.site_usage_admins as a where a.user_id = v_user_id
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', recent.id,
      'title', recent.title,
      'body', recent.body,
      'created_at', recent.created_at,
      'recipient_count', recent.recipient_count
    ) order by recent.created_at desc
  ), '[]'::jsonb)
  into v_items
  from (
    select b.id, b.title, b.body, b.created_at, b.recipient_count
    from private.site_broadcasts as b
    order by b.created_at desc
    limit 30
  ) as recent;

  return v_items;
end;
$function$;

revoke all on function public.publish_site_broadcast(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.get_my_site_broadcasts()
  from public, anon, authenticated, service_role;
revoke all on function public.mark_my_site_broadcast_read(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_admin_site_broadcasts()
  from public, anon, authenticated, service_role;

grant execute on function public.publish_site_broadcast(uuid, text, text) to authenticated;
grant execute on function public.get_my_site_broadcasts() to authenticated;
grant execute on function public.mark_my_site_broadcast_read(uuid) to authenticated;
grant execute on function public.get_admin_site_broadcasts() to authenticated;
