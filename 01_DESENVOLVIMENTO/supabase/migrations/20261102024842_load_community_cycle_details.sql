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
