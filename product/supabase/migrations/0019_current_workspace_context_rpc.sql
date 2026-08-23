begin;

create or replace function public.current_workspace_context()
returns table (
  workspace_id uuid,
  workspace_kind text,
  workspace_name text,
  owner_user_id uuid,
  workspace_role text,
  academic_year_id uuid,
  academic_year_label text,
  academic_year_starts_on date,
  academic_year_ends_on date,
  academic_year_is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.id,
    w.kind,
    w.name,
    w.owner_user_id,
    wm.role,
    ay.id,
    ay.label,
    ay.starts_on,
    ay.ends_on,
    ay.is_active
  from public.workspace_memberships wm
  join public.workspaces w on w.id = wm.workspace_id
  left join lateral (
    select a.id, a.label, a.starts_on, a.ends_on, a.is_active
    from public.academic_years a
    where a.workspace_id = w.id
      and a.is_active = true
    order by a.starts_on desc, a.created_at desc
    limit 1
  ) ay on true
  where wm.user_id = (select auth.uid())
  order by wm.created_at asc
  limit 1;
$$;

revoke all on function public.current_workspace_context() from public;
grant execute on function public.current_workspace_context() to authenticated;

commit;
