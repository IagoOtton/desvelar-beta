-- Cover foreign-key checks and the membership/feed queries used by the app.
create index if not exists community_post_comments_author_id_idx
  on public.community_post_comments (author_id);
create index if not exists community_post_reactions_user_id_idx
  on public.community_post_reactions (user_id);
create index if not exists community_post_reports_reporter_id_idx
  on public.community_post_reports (reporter_id);
create index if not exists community_posts_author_id_idx
  on public.community_posts (author_id);
create index if not exists group_members_user_group_idx
  on public.group_members (user_id, group_id);
create index if not exists groups_created_by_idx
  on public.groups (created_by);
create index if not exists reader_group_cycles_opened_by_idx
  on public.reader_group_cycles (opened_by);
create index if not exists reader_group_cycles_selected_by_idx
  on public.reader_group_cycles (selected_by);
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
create index if not exists reader_group_progress_updates_user_id_idx
  on public.reader_group_progress_updates (user_id);
create index if not exists reader_groups_created_by_idx
  on public.reader_groups (created_by);
create index if not exists shared_goals_created_by_idx
  on public.shared_goals (created_by);
create index if not exists shared_goals_group_created_at_idx
  on public.shared_goals (group_id, created_at desc);
create index if not exists shared_goals_created_at_idx
  on public.shared_goals (created_at desc);

-- A caller's identity is stable for the duration of a statement.
create or replace function public.is_group_creator(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.groups
    where id = _group_id
      and created_by = (select auth.uid())
  );
$function$;

create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.group_members
    where group_id = _group_id
      and user_id = (select auth.uid())
  );
$function$;

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

-- Cache auth.uid() once per statement instead of evaluating it per row.
alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles
  with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy groups_insert_creator on public.groups
  with check (created_by = (select auth.uid()));
alter policy groups_select_members on public.groups
  using (created_by = (select auth.uid()) or public.is_group_member(id));
alter policy groups_update_creator on public.groups
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

alter policy group_members_delete_self on public.group_members
  using (user_id = (select auth.uid()));

-- Merge the two permissive INSERT policies without changing their allowed rows.
drop policy if exists group_creator_insert_self_as_owner on public.group_members;
drop policy if exists group_members_insert_by_creator on public.group_members;
create policy group_members_insert_creator
  on public.group_members for insert to authenticated
  with check (
    public.is_group_creator(group_id)
    and (
      role = 'member'
      or (role = 'owner' and user_id = (select auth.uid()))
    )
  );

alter policy shared_goals_insert_members on public.shared_goals
  with check (
    public.is_group_member(group_id)
    and created_by = (select auth.uid())
  );
alter policy shared_goals_update_creator on public.shared_goals
  using (
    created_by = (select auth.uid())
    and public.is_group_member(group_id)
  )
  with check (
    created_by = (select auth.uid())
    and public.is_group_member(group_id)
  );
alter policy shared_goals_delete_creator on public.shared_goals
  using (
    created_by = (select auth.uid())
    and public.is_group_member(group_id)
  );
