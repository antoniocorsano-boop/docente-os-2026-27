begin;

create or replace function public.annual_plan_execution_snapshot(
  target_workspace_id uuid,
  target_academic_year_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = (select auth.uid())
    ) then jsonb_build_object('sections', '[]'::jsonb, 'progress', '[]'::jsonb)
    else jsonb_build_object(
      'sections', coalesce((
        select jsonb_agg(to_jsonb(s) order by s.grade, s.section_code)
        from public.annual_plan_sections s
        where s.workspace_id = target_workspace_id
          and s.academic_year_id = target_academic_year_id
      ), '[]'::jsonb),
      'progress', coalesce((
        select jsonb_agg(to_jsonb(p) order by p.block_id)
        from public.annual_plan_block_progress p
        join public.annual_plan_sections s on s.id = p.section_id
        where s.workspace_id = target_workspace_id
          and s.academic_year_id = target_academic_year_id
      ), '[]'::jsonb)
    )
  end;
$$;

revoke all on function public.annual_plan_execution_snapshot(uuid, uuid) from public;
grant execute on function public.annual_plan_execution_snapshot(uuid, uuid) to authenticated;

commit;
