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
