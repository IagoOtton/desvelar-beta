-- Comunidade de leitores do DESVELAR
-- Execute este script no Supabase SQL Editor uma vez.
-- Os e-mails e a biblioteca pessoal não são expostos por estas tabelas.
-- O feed fica disponível a contas autenticadas; dados de grupos ficam restritos aos membros.

-- A mesma limitação é compartilhada pelos grupos de leitura e pelos grupos de metas.
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

create table if not exists public.reader_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 2 and 40),
  bio text not null default ''
    check (char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.reader_profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1500),
  book_title text check (book_title is null or char_length(btrim(book_title)) <= 160),
  book_author text check (book_author is null or char_length(btrim(book_author)) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references public.reader_profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);

create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.reader_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.reader_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 500),
  invite_code text not null unique check (invite_code ~ '^([A-Z0-9]{8}|[A-F0-9]{16})$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.reader_groups
  drop constraint if exists reader_groups_invite_code_check;
alter table public.reader_groups
  add constraint reader_groups_invite_code_check
  check (invite_code ~ '^([A-Z0-9]{8}|[A-F0-9]{16})$');

create table if not exists public.reader_group_members (
  group_id uuid not null references public.reader_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.reader_group_cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reader_groups (id) on delete cascade,
  cycle_month date not null
    check (cycle_month = date_trunc('month', cycle_month::timestamp)::date),
  status text not null default 'nominations'
    check (status in ('nominations', 'reading', 'closed')),
  selected_title text,
  selected_author text not null default '',
  selected_isbn text,
  opened_by uuid not null references auth.users (id),
  selected_by uuid references auth.users (id),
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, cycle_month),
  check (status <> 'reading' or nullif(btrim(selected_title), '') is not null)
);

create table if not exists public.reader_group_book_candidates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.reader_group_cycles (id) on delete cascade,
  canonical_key text not null check (char_length(canonical_key) between 3 and 400),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  author text not null default '' check (char_length(author) <= 120),
  isbn text check (isbn is null or char_length(isbn) <= 20),
  nominated_at timestamptz not null default now(),
  unique (cycle_id, canonical_key),
  unique (id, cycle_id)
);

create table if not exists public.reader_group_nominations (
  candidate_id uuid not null,
  cycle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, user_id),
  foreign key (candidate_id, cycle_id)
    references public.reader_group_book_candidates (id, cycle_id) on delete cascade
);

create table if not exists public.reader_group_progress_updates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.reader_group_cycles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  percent_complete numeric(5, 2)
    check (percent_complete is null or percent_complete between 0 and 100),
  pages_read integer check (pages_read is null or pages_read >= 0),
  total_pages integer check (total_pages is null or total_pages > 0),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (
    percent_complete is not null
    or (pages_read is not null and total_pages is not null)
  ),
  check (
    pages_read is null
    or (total_pages is not null and pages_read <= total_pages)
  )
);

create table if not exists public.reader_group_draws (
  cycle_id uuid primary key references public.reader_group_cycles (id) on delete cascade,
  candidate_id uuid not null,
  drawn_by uuid not null references auth.users (id),
  drawn_at timestamptz not null default now(),
  foreign key (candidate_id, cycle_id)
    references public.reader_group_book_candidates (id, cycle_id)
);

create index if not exists community_posts_feed_idx
  on public.community_posts (created_at desc);
create index if not exists community_posts_author_id_idx
  on public.community_posts (author_id);
create index if not exists community_comments_post_idx
  on public.community_post_comments (post_id, created_at);
create index if not exists community_post_comments_author_id_idx
  on public.community_post_comments (author_id);
create index if not exists community_post_reactions_user_id_idx
  on public.community_post_reactions (user_id);
create index if not exists community_post_reports_reporter_id_idx
  on public.community_post_reports (reporter_id);
create index if not exists reader_group_cycles_group_month_idx
  on public.reader_group_cycles (group_id, cycle_month desc);
create index if not exists reader_group_cycles_opened_by_idx
  on public.reader_group_cycles (opened_by);
create index if not exists reader_group_cycles_selected_by_idx
  on public.reader_group_cycles (selected_by);
create index if not exists reader_group_candidates_cycle_idx
  on public.reader_group_book_candidates (cycle_id, nominated_at);
create index if not exists reader_group_draws_candidate_cycle_idx
  on public.reader_group_draws (candidate_id, cycle_id);
create index if not exists reader_group_draws_drawn_by_idx
  on public.reader_group_draws (drawn_by);
create index if not exists reader_group_members_user_group_idx
  on public.reader_group_members (user_id, group_id);
create index if not exists reader_group_nominations_candidate_cycle_idx
  on public.reader_group_nominations (candidate_id, cycle_id);
create index if not exists reader_group_nominations_cycle_candidate_idx
  on public.reader_group_nominations (cycle_id, candidate_id);
create index if not exists reader_group_nominations_user_id_idx
  on public.reader_group_nominations (user_id);
create index if not exists reader_group_progress_cycle_idx
  on public.reader_group_progress_updates (cycle_id, created_at desc);
create index if not exists reader_group_progress_updates_user_id_idx
  on public.reader_group_progress_updates (user_id);
create index if not exists reader_groups_created_by_idx
  on public.reader_groups (created_by);

alter table public.reader_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_reports enable row level security;
alter table public.reader_groups enable row level security;
alter table public.reader_group_members enable row level security;
alter table public.reader_group_cycles enable row level security;
alter table public.reader_group_book_candidates enable row level security;
alter table public.reader_group_nominations enable row level security;
alter table public.reader_group_progress_updates enable row level security;
alter table public.reader_group_draws enable row level security;

revoke all on table
  public.reader_profiles,
  public.community_posts,
  public.community_post_comments,
  public.community_post_reactions,
  public.community_post_reports,
  public.reader_groups,
  public.reader_group_members,
  public.reader_group_cycles,
  public.reader_group_book_candidates,
  public.reader_group_nominations,
  public.reader_group_progress_updates,
  public.reader_group_draws
from public, anon, authenticated;

grant select, insert, update on public.reader_profiles to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, delete on public.community_post_comments to authenticated;
grant select, insert, delete on public.community_post_reactions to authenticated;
grant insert on public.community_post_reports to authenticated;
grant select on public.reader_groups to authenticated;
grant select on public.reader_group_members to authenticated;
grant select on public.reader_group_cycles to authenticated;
grant select on public.reader_group_book_candidates to authenticated;
grant select on public.reader_group_nominations to authenticated;
grant select, insert, delete on public.reader_group_progress_updates to authenticated;
grant select on public.reader_group_draws to authenticated;

create or replace function public.is_reader_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.reader_group_members m
    where m.group_id = _group_id
      and m.user_id = (select auth.uid())
  );
$function$;

create or replace function public.is_reader_group_owner(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.reader_group_members m
    where m.group_id = _group_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$function$;

create or replace function public.is_reader_cycle_member(_cycle_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.reader_group_cycles c
    join public.reader_group_members m on m.group_id = c.group_id
    where c.id = _cycle_id
      and m.user_id = (select auth.uid())
  );
$function$;

revoke all on function public.is_reader_group_member(uuid) from public, anon, authenticated;
revoke all on function public.is_reader_group_owner(uuid) from public, anon, authenticated;
revoke all on function public.is_reader_cycle_member(uuid) from public, anon, authenticated;
grant execute on function public.is_reader_group_member(uuid) to authenticated;
grant execute on function public.is_reader_group_owner(uuid) to authenticated;
grant execute on function public.is_reader_cycle_member(uuid) to authenticated;

drop policy if exists reader_profiles_select_authenticated on public.reader_profiles;
create policy reader_profiles_select_authenticated
  on public.reader_profiles for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists reader_profiles_insert_self on public.reader_profiles;
create policy reader_profiles_insert_self
  on public.reader_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists reader_profiles_update_self on public.reader_profiles;
create policy reader_profiles_update_self
  on public.reader_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists community_posts_select_authenticated on public.community_posts;
create policy community_posts_select_authenticated
  on public.community_posts for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists community_posts_insert_self on public.community_posts;
create policy community_posts_insert_self
  on public.community_posts for insert to authenticated
  with check ((select auth.uid()) = author_id);
drop policy if exists community_posts_update_self on public.community_posts;
create policy community_posts_update_self
  on public.community_posts for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
drop policy if exists community_posts_delete_self on public.community_posts;
create policy community_posts_delete_self
  on public.community_posts for delete to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists community_comments_select_authenticated on public.community_post_comments;
create policy community_comments_select_authenticated
  on public.community_post_comments for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists community_comments_insert_self on public.community_post_comments;
create policy community_comments_insert_self
  on public.community_post_comments for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.community_posts p where p.id = post_id
    )
  );
drop policy if exists community_comments_delete_self on public.community_post_comments;
create policy community_comments_delete_self
  on public.community_post_comments for delete to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists community_reactions_select_authenticated on public.community_post_reactions;
create policy community_reactions_select_authenticated
  on public.community_post_reactions for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists community_reactions_insert_self on public.community_post_reactions;
create policy community_reactions_insert_self
  on public.community_post_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists community_reactions_delete_self on public.community_post_reactions;
create policy community_reactions_delete_self
  on public.community_post_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists community_reports_insert_self on public.community_post_reports;
create policy community_reports_insert_self
  on public.community_post_reports for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (
      select 1 from public.community_posts p where p.id = post_id
    )
  );

drop policy if exists reader_groups_select_members on public.reader_groups;
create policy reader_groups_select_members
  on public.reader_groups for select to authenticated
  using (public.is_reader_group_member(id));

drop policy if exists reader_group_members_select_members on public.reader_group_members;
create policy reader_group_members_select_members
  on public.reader_group_members for select to authenticated
  using (public.is_reader_group_member(group_id));

drop policy if exists reader_cycles_select_members on public.reader_group_cycles;
create policy reader_cycles_select_members
  on public.reader_group_cycles for select to authenticated
  using (public.is_reader_group_member(group_id));

drop policy if exists reader_candidates_select_members on public.reader_group_book_candidates;
create policy reader_candidates_select_members
  on public.reader_group_book_candidates for select to authenticated
  using (public.is_reader_cycle_member(cycle_id));

drop policy if exists reader_nominations_select_members on public.reader_group_nominations;
create policy reader_nominations_select_members
  on public.reader_group_nominations for select to authenticated
  using (public.is_reader_cycle_member(cycle_id));

drop policy if exists reader_progress_select_members on public.reader_group_progress_updates;
create policy reader_progress_select_members
  on public.reader_group_progress_updates for select to authenticated
  using (public.is_reader_cycle_member(cycle_id));
drop policy if exists reader_progress_insert_self on public.reader_group_progress_updates;
create policy reader_progress_insert_self
  on public.reader_group_progress_updates for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.is_reader_cycle_member(cycle_id)
    and exists (
      select 1
      from public.reader_group_cycles c
      where c.id = cycle_id
        and c.status = 'reading'
    )
  );
drop policy if exists reader_progress_delete_self on public.reader_group_progress_updates;
create policy reader_progress_delete_self
  on public.reader_group_progress_updates for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists reader_draws_select_members on public.reader_group_draws;
create policy reader_draws_select_members
  on public.reader_group_draws for select to authenticated
  using (public.is_reader_cycle_member(cycle_id));

create or replace function public.create_reader_group(p_name text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'O nome do grupo deve ter entre 2 e 60 caracteres'
      using errcode = '22023';
  end if;
  if char_length(v_description) > 500 then
    raise exception 'A descrição deve ter no máximo 500 caracteres'
      using errcode = '22023';
  end if;

  loop
    v_invite_code := upper(
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8) ||
      substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8)
    );
    exit when not exists (
      select 1 from public.reader_groups g where g.invite_code = v_invite_code
    );
  end loop;

  insert into public.reader_groups (name, description, invite_code, created_by)
  values (v_name, v_description, v_invite_code, v_user_id)
  returning id into v_group_id;

  insert into public.reader_group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$function$;

-- Returning NULL for an invalid code commits its failed-attempt increment.
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

create or replace function public.open_reader_cycle(
  p_group_id uuid,
  p_cycle_month date,
  p_book_title text default null,
  p_book_author text default null,
  p_book_isbn text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_cycle_id uuid;
  v_title text := nullif(btrim(coalesce(p_book_title, '')), '');
  v_author text := btrim(coalesce(p_book_author, ''));
  v_isbn text := nullif(upper(regexp_replace(coalesce(p_book_isbn, ''), '[^0-9X]', '', 'g')), '');
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;
  if not public.is_reader_group_owner(p_group_id) then
    raise exception 'Somente a pessoa responsável pelo grupo pode abrir o ciclo'
      using errcode = '42501';
  end if;
  if p_cycle_month is null
    or p_cycle_month <> date_trunc('month', p_cycle_month::timestamp)::date
    or p_cycle_month < date_trunc('month', current_date::timestamp)::date then
    raise exception 'Escolha o primeiro dia deste mês ou de um mês futuro'
      using errcode = '22023';
  end if;
  if v_title is not null and char_length(v_title) > 160 then
    raise exception 'O título do livro deve ter no máximo 160 caracteres'
      using errcode = '22023';
  end if;
  if char_length(v_author) > 120 or char_length(coalesce(v_isbn, '')) > 20 then
    raise exception 'Os dados do livro excedem o limite permitido'
      using errcode = '22023';
  end if;

  insert into public.reader_group_cycles (
    group_id, cycle_month, status, selected_title, selected_author,
    selected_isbn, opened_by, selected_by, selected_at
  )
  values (
    p_group_id, p_cycle_month,
    case when v_title is null then 'nominations' else 'reading' end,
    v_title, v_author, v_isbn, v_user_id,
    case when v_title is null then null else v_user_id end,
    case when v_title is null then null else now() end
  )
  returning id into v_cycle_id;

  return v_cycle_id;
end;
$function$;

create or replace function public.nominate_reader_book(
  p_cycle_id uuid,
  p_title text,
  p_author text default '',
  p_isbn text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_status text;
  v_title text := btrim(coalesce(p_title, ''));
  v_author text := btrim(coalesce(p_author, ''));
  v_isbn text := nullif(upper(regexp_replace(coalesce(p_isbn, ''), '[^0-9X]', '', 'g')), '');
  v_key text;
  v_candidate_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 160
    or char_length(v_author) > 120 or char_length(coalesce(v_isbn, '')) > 20 then
    raise exception 'Confira o título, autor e ISBN do livro'
      using errcode = '22023';
  end if;

  select c.group_id, c.status into v_group_id, v_status
  from public.reader_group_cycles c
  where c.id = p_cycle_id
  for update;

  if not found then
    raise exception 'Ciclo de leitura não encontrado' using errcode = '22023';
  end if;
  if v_status <> 'nominations' then
    raise exception 'As indicações deste ciclo já foram encerradas'
      using errcode = '22023';
  end if;
  if not public.is_reader_group_member(v_group_id) then
    raise exception 'Você não participa deste grupo' using errcode = '42501';
  end if;

  v_key := 'title:' ||
    lower(regexp_replace(v_title, '[[:space:]]+', ' ', 'g')) ||
    '|author:' ||
    lower(regexp_replace(v_author, '[[:space:]]+', ' ', 'g'));

  insert into public.reader_group_book_candidates (
    cycle_id, canonical_key, title, author, isbn
  )
  values (p_cycle_id, v_key, v_title, v_author, v_isbn)
  on conflict (cycle_id, canonical_key)
  do update set canonical_key = excluded.canonical_key
  returning id into v_candidate_id;

  insert into public.reader_group_nominations (candidate_id, cycle_id, user_id)
  values (v_candidate_id, p_cycle_id, v_user_id)
  on conflict (candidate_id, user_id) do nothing;

  return v_candidate_id;
end;
$function$;

create or replace function public.draw_reader_book(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_status text;
  v_candidate_id uuid;
  v_title text;
  v_author text;
  v_isbn text;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '28000';
  end if;

  select c.group_id, c.status into v_group_id, v_status
  from public.reader_group_cycles c
  where c.id = p_cycle_id
  for update;

  if not found then
    raise exception 'Ciclo de leitura não encontrado' using errcode = '22023';
  end if;
  if not public.is_reader_group_owner(v_group_id) then
    raise exception 'Somente a pessoa responsável pelo grupo pode fazer o sorteio'
      using errcode = '42501';
  end if;
  if v_status <> 'nominations' then
    raise exception 'Este ciclo já teve seu livro definido'
      using errcode = '22023';
  end if;

  select c.id, c.title, c.author, c.isbn
  into v_candidate_id, v_title, v_author, v_isbn
  from public.reader_group_book_candidates c
  join public.reader_group_nominations n
    on n.candidate_id = c.id and n.cycle_id = c.cycle_id
  where c.cycle_id = p_cycle_id
  order by random()
  limit 1;

  if not found then
    raise exception 'Indiquem ao menos um livro antes do sorteio'
      using errcode = '22023';
  end if;

  insert into public.reader_group_draws (cycle_id, candidate_id, drawn_by)
  values (p_cycle_id, v_candidate_id, v_user_id);

  update public.reader_group_cycles
  set status = 'reading',
      selected_title = v_title,
      selected_author = v_author,
      selected_isbn = v_isbn,
      selected_by = v_user_id,
      selected_at = now()
  where id = p_cycle_id;

  return v_candidate_id;
end;
$function$;

revoke all on function public.create_reader_group(text, text) from public, anon, authenticated;
revoke all on function public.join_reader_group(text) from public, anon, authenticated, service_role;
revoke all on function public.open_reader_cycle(uuid, date, text, text, text) from public, anon, authenticated;
revoke all on function public.nominate_reader_book(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.draw_reader_book(uuid) from public, anon, authenticated;
grant execute on function public.create_reader_group(text, text) to authenticated;
grant execute on function public.join_reader_group(text) to authenticated;
grant execute on function public.open_reader_cycle(uuid, date, text, text, text) to authenticated;
grant execute on function public.nominate_reader_book(uuid, text, text, text) to authenticated;
grant execute on function public.draw_reader_book(uuid) to authenticated;

-- Expose somente nomes escolhidos pelos leitores e dados explicitamente publicados.

create or replace function public.get_community_post_stats(p_post_ids uuid[])
returns table (
  post_id uuid,
  comment_count bigint,
  reaction_count bigint,
  reacted_by_user boolean
)
language sql
stable
security invoker
set search_path to ''
as $function$
  with requested_posts as (
    select distinct p.id
    from public.community_posts p
    where p.id = any(coalesce(p_post_ids, array[]::uuid[]))
  ),
  comment_stats as (
    select c.post_id, count(*)::bigint as total
    from public.community_post_comments c
    join requested_posts p on p.id = c.post_id
    group by c.post_id
  ),
  reaction_stats as (
    select
      r.post_id,
      count(*)::bigint as total,
      bool_or(r.user_id = (select auth.uid())) as reacted_by_user
    from public.community_post_reactions r
    join requested_posts p on p.id = r.post_id
    group by r.post_id
  )
  select
    p.id,
    coalesce(c.total, 0),
    coalesce(r.total, 0),
    coalesce(r.reacted_by_user, false)
  from requested_posts p
  left join comment_stats c on c.post_id = p.id
  left join reaction_stats r on r.post_id = p.id;
$function$;

revoke all on function public.get_community_post_stats(uuid[]) from public, anon;
grant execute on function public.get_community_post_stats(uuid[]) to authenticated;

create or replace function public.get_reader_group_dashboard(
  p_group_ids uuid[],
  p_cycles_per_group integer,
  p_progress_per_cycle integer
)
returns table (
  id uuid,
  group_id uuid,
  cycle_month date,
  status text,
  selected_title text,
  selected_author text,
  selected_isbn text,
  opened_by uuid,
  selected_by uuid,
  selected_at timestamptz,
  candidates jsonb,
  progress jsonb,
  progress_count bigint,
  total_cycle_count bigint
)
language sql
stable
security invoker
set search_path to ''
as $function$
  with bounds as (
    select
      least(greatest(coalesce(p_cycles_per_group, 6), 1), 6) as cycle_limit,
      least(greatest(coalesce(p_progress_per_cycle, 8), 1), 8) as progress_limit
  ),
  requested_groups as (
    select distinct ids.group_id
    from unnest(coalesce(p_group_ids, array[]::uuid[])) as ids(group_id)
  ),
  ranked_cycles as (
    select
      c.id,
      c.group_id,
      c.cycle_month,
      c.status,
      c.selected_title,
      c.selected_author,
      c.selected_isbn,
      c.opened_by,
      c.selected_by,
      c.selected_at,
      row_number() over (
        partition by c.group_id
        order by c.cycle_month desc, c.id desc
      ) as cycle_rank,
      count(*) over (partition by c.group_id)::bigint as total_cycle_count
    from public.reader_group_cycles c
    join requested_groups g on g.group_id = c.group_id
  ),
  recent_cycles as (
    select rc.*
    from ranked_cycles rc
    cross join bounds b
    where rc.cycle_rank <= b.cycle_limit
  ),
  candidate_stats as (
    select
      bc.id,
      bc.cycle_id,
      bc.title,
      bc.author,
      bc.isbn,
      bc.nominated_at,
      count(n.candidate_id)::bigint as nomination_count
    from public.reader_group_book_candidates bc
    join recent_cycles rc on rc.id = bc.cycle_id
    left join public.reader_group_nominations n
      on n.candidate_id = bc.id
      and n.cycle_id = bc.cycle_id
    group by bc.id, bc.cycle_id, bc.title, bc.author, bc.isbn, bc.nominated_at
  ),
  candidate_data as (
    select
      cs.cycle_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cs.id,
          'cycle_id', cs.cycle_id,
          'title', cs.title,
          'author', cs.author,
          'isbn', cs.isbn,
          'nominated_at', cs.nominated_at,
          'nomination_count', cs.nomination_count
        )
        order by cs.nominated_at asc, cs.id asc
      ) as candidates
    from candidate_stats cs
    group by cs.cycle_id
  ),
  ranked_progress as (
    select
      pu.id,
      pu.cycle_id,
      pu.user_id,
      pu.percent_complete,
      pu.pages_read,
      pu.total_pages,
      pu.note,
      pu.created_at,
      rp.display_name,
      row_number() over (
        partition by pu.cycle_id
        order by pu.created_at desc, pu.id desc
      ) as progress_rank,
      count(*) over (partition by pu.cycle_id)::bigint as progress_count
    from public.reader_group_progress_updates pu
    join recent_cycles rc on rc.id = pu.cycle_id
    left join public.reader_profiles rp on rp.user_id = pu.user_id
  ),
  progress_data as (
    select
      rp.cycle_id,
      max(rp.progress_count)::bigint as progress_count,
      jsonb_agg(
        jsonb_build_object(
          'id', rp.id,
          'cycle_id', rp.cycle_id,
          'user_id', rp.user_id,
          'percent_complete', rp.percent_complete,
          'pages_read', rp.pages_read,
          'total_pages', rp.total_pages,
          'note', rp.note,
          'created_at', rp.created_at,
          'reader_profiles', jsonb_build_object(
            'display_name', coalesce(rp.display_name, 'Leitor')
          )
        )
        order by rp.created_at desc, rp.id desc
      ) filter (where rp.progress_rank <= b.progress_limit) as progress
    from ranked_progress rp
    cross join bounds b
    group by rp.cycle_id
  )
  select
    rc.id,
    rc.group_id,
    rc.cycle_month,
    rc.status,
    rc.selected_title,
    rc.selected_author,
    rc.selected_isbn,
    rc.opened_by,
    rc.selected_by,
    rc.selected_at,
    coalesce(cd.candidates, '[]'::jsonb),
    coalesce(pd.progress, '[]'::jsonb),
    coalesce(pd.progress_count, 0)::bigint,
    rc.total_cycle_count
  from recent_cycles rc
  left join candidate_data cd on cd.cycle_id = rc.id
  left join progress_data pd on pd.cycle_id = rc.id
  order by rc.group_id, rc.cycle_month desc, rc.id desc;
$function$;

revoke all on function public.get_reader_group_dashboard(uuid[], integer, integer) from public, anon;
grant execute on function public.get_reader_group_dashboard(uuid[], integer, integer) to authenticated;


-- Cycle summaries are lightweight; details are read only when a member opens a cycle.

create or replace function public.get_reader_group_cycle_summaries(
  p_group_ids uuid[],
  p_cycles_per_group integer
)
returns table (
  id uuid,
  group_id uuid,
  cycle_month date,
  status text,
  selected_title text,
  selected_author text,
  selected_isbn text,
  opened_by uuid,
  selected_by uuid,
  selected_at timestamptz,
  candidate_count bigint,
  progress_count bigint,
  total_cycle_count bigint
)
language sql
stable
security invoker
set search_path to ''
as $function$
  with bounds as (
    select least(greatest(coalesce(p_cycles_per_group, 6), 1), 6) as cycle_limit
  ),
  requested_groups as (
    select distinct ids.group_id
    from unnest(coalesce(p_group_ids, array[]::uuid[])) as ids(group_id)
  ),
  ranked_cycles as (
    select
      c.id,
      c.group_id,
      c.cycle_month,
      c.status,
      c.selected_title,
      c.selected_author,
      c.selected_isbn,
      c.opened_by,
      c.selected_by,
      c.selected_at,
      row_number() over (
        partition by c.group_id
        order by c.cycle_month desc, c.id desc
      ) as cycle_rank,
      count(*) over (partition by c.group_id)::bigint as total_cycle_count
    from public.reader_group_cycles c
    join requested_groups g on g.group_id = c.group_id
  ),
  recent_cycles as (
    select rc.*
    from ranked_cycles rc
    cross join bounds b
    where rc.cycle_rank <= b.cycle_limit
  ),
  candidate_counts as (
    select bc.cycle_id, count(*)::bigint as total
    from public.reader_group_book_candidates bc
    join recent_cycles rc on rc.id = bc.cycle_id
    where rc.status = 'nominations'
    group by bc.cycle_id
  ),
  progress_counts as (
    select pu.cycle_id, count(*)::bigint as total
    from public.reader_group_progress_updates pu
    join recent_cycles rc on rc.id = pu.cycle_id
    where rc.status = 'reading'
    group by pu.cycle_id
  )
  select
    rc.id,
    rc.group_id,
    rc.cycle_month,
    rc.status,
    rc.selected_title,
    rc.selected_author,
    rc.selected_isbn,
    rc.opened_by,
    rc.selected_by,
    rc.selected_at,
    coalesce(cc.total, 0)::bigint,
    coalesce(pc.total, 0)::bigint,
    rc.total_cycle_count
  from recent_cycles rc
  left join candidate_counts cc on cc.cycle_id = rc.id
  left join progress_counts pc on pc.cycle_id = rc.id
  order by rc.group_id, rc.cycle_month desc, rc.id desc;
$function$;

revoke all on function public.get_reader_group_cycle_summaries(uuid[], integer) from public, anon;
grant execute on function public.get_reader_group_cycle_summaries(uuid[], integer) to authenticated;

create or replace function public.get_reader_group_cycle_details(p_cycle_id uuid)
returns table (
  cycle_id uuid,
  candidates jsonb,
  progress jsonb,
  progress_count bigint
)
language sql
stable
security invoker
set search_path to ''
as $function$
  with visible_cycle as (
    select c.id, c.status
    from public.reader_group_cycles c
    where c.id = p_cycle_id
  ),
  candidate_stats as (
    select
      bc.id,
      bc.cycle_id,
      bc.title,
      bc.author,
      bc.isbn,
      bc.nominated_at,
      count(n.candidate_id)::bigint as nomination_count
    from public.reader_group_book_candidates bc
    join visible_cycle vc on vc.id = bc.cycle_id and vc.status = 'nominations'
    left join public.reader_group_nominations n
      on n.candidate_id = bc.id
      and n.cycle_id = bc.cycle_id
    group by bc.id, bc.cycle_id, bc.title, bc.author, bc.isbn, bc.nominated_at
  ),
  candidate_data as (
    select
      cs.cycle_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cs.id,
          'cycle_id', cs.cycle_id,
          'title', cs.title,
          'author', cs.author,
          'isbn', cs.isbn,
          'nominated_at', cs.nominated_at,
          'nomination_count', cs.nomination_count
        )
        order by cs.nominated_at asc, cs.id asc
      ) as candidates
    from candidate_stats cs
    group by cs.cycle_id
  ),
  ranked_progress as (
    select
      pu.id,
      pu.cycle_id,
      pu.user_id,
      pu.percent_complete,
      pu.pages_read,
      pu.total_pages,
      pu.note,
      pu.created_at,
      rp.display_name,
      row_number() over (
        partition by pu.cycle_id
        order by pu.created_at desc, pu.id desc
      ) as progress_rank,
      count(*) over (partition by pu.cycle_id)::bigint as progress_count
    from public.reader_group_progress_updates pu
    join visible_cycle vc on vc.id = pu.cycle_id and vc.status = 'reading'
    left join public.reader_profiles rp on rp.user_id = pu.user_id
  ),
  progress_data as (
    select
      rp.cycle_id,
      max(rp.progress_count)::bigint as progress_count,
      jsonb_agg(
        jsonb_build_object(
          'id', rp.id,
          'cycle_id', rp.cycle_id,
          'user_id', rp.user_id,
          'percent_complete', rp.percent_complete,
          'pages_read', rp.pages_read,
          'total_pages', rp.total_pages,
          'note', rp.note,
          'created_at', rp.created_at,
          'reader_profiles', jsonb_build_object(
            'display_name', coalesce(rp.display_name, 'Leitor')
          )
        )
        order by rp.created_at desc, rp.id desc
      ) filter (where rp.progress_rank <= 8) as progress
    from ranked_progress rp
    group by rp.cycle_id
  )
  select
    vc.id,
    coalesce(cd.candidates, '[]'::jsonb),
    coalesce(pd.progress, '[]'::jsonb),
    coalesce(pd.progress_count, 0)::bigint
  from visible_cycle vc
  left join candidate_data cd on cd.cycle_id = vc.id
  left join progress_data pd on pd.cycle_id = vc.id;
$function$;

revoke all on function public.get_reader_group_cycle_details(uuid) from public, anon;
grant execute on function public.get_reader_group_cycle_details(uuid) to authenticated;
