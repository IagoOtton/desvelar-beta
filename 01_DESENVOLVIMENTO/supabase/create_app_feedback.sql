create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category text not null
    check (category in ('usability', 'bug', 'idea', 'other')),
  message text not null
    check (char_length(trim(message)) between 10 and 1500),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_user_id_idx
  on public.app_feedback (user_id);

alter table public.app_feedback enable row level security;

revoke all privileges on table public.app_feedback from anon, authenticated;
grant insert on table public.app_feedback to authenticated;

drop policy if exists app_feedback_insert_authenticated
  on public.app_feedback;

create policy app_feedback_insert_authenticated
  on public.app_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
