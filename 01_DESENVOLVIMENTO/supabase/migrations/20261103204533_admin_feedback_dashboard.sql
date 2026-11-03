-- Expose recent feedback only through an administrator-checked RPC.
-- The app_feedback table remains inaccessible for direct reads by users.

create or replace function public.get_admin_app_feedback()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_feedback jsonb;
begin
  if v_user_id is null or not exists (
    select 1
    from private.site_usage_admins as a
    where a.user_id = v_user_id
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', feedback.id,
        'category', feedback.category,
        'message', feedback.message,
        'created_at', feedback.created_at,
        'user_email', users.email
      ) order by feedback.created_at desc
    ),
    '[]'::jsonb
  )
  into v_feedback
  from (
    select f.id, f.user_id, f.category, f.message, f.created_at
    from public.app_feedback as f
    order by f.created_at desc
    limit 100
  ) as feedback
  left join auth.users as users on users.id = feedback.user_id;

  return v_feedback;
end;
$function$;

revoke all on function public.get_admin_app_feedback()
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_app_feedback() to authenticated;
