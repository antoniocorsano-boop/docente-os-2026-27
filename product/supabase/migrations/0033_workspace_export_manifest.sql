create or replace function public.workspace_export_manifest()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  select wm.workspace_id, wm.role
    into v_workspace_id, v_role
  from public.workspace_memberships wm
  where wm.user_id = v_user_id
  order by case wm.role when 'OWNER' then 0 when 'ADMIN' then 1 else 2 end, wm.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'Workspace membership required';
  end if;

  if v_role <> 'OWNER' then
    raise exception 'Workspace owner required';
  end if;

  return jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', now(),
    'identity', jsonb_build_object('userId', v_user_id, 'workspaceId', v_workspace_id, 'role', v_role),
    'data', jsonb_build_object(
      'workspaces', coalesce((select jsonb_agg(to_jsonb(t)) from public.workspaces t where t.id = v_workspace_id), '[]'::jsonb),
      'workspace_memberships', coalesce((select jsonb_agg(to_jsonb(t)) from public.workspace_memberships t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'academic_years', coalesce((select jsonb_agg(to_jsonb(t)) from public.academic_years t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'teacher_workspace_settings', coalesce((select jsonb_agg(to_jsonb(t)) from public.teacher_workspace_settings t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'teaching_disciplines', coalesce((select jsonb_agg(to_jsonb(t)) from public.teaching_disciplines t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'annual_plan_sections', coalesce((select jsonb_agg(to_jsonb(t)) from public.annual_plan_sections t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'annual_plan_block_progress', coalesce((select jsonb_agg(to_jsonb(t)) from public.annual_plan_block_progress t join public.annual_plan_sections s on s.id = t.section_id where s.workspace_id = v_workspace_id), '[]'::jsonb),
      'teaching_assignments', coalesce((select jsonb_agg(to_jsonb(t)) from public.teaching_assignments t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'timetable_versions', coalesce((select jsonb_agg(to_jsonb(t)) from public.timetable_versions t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'timetable_slots', coalesce((select jsonb_agg(to_jsonb(t)) from public.timetable_slots t join public.timetable_versions v on v.id = t.timetable_version_id where v.workspace_id = v_workspace_id), '[]'::jsonb),
      'calendar_days', coalesce((select jsonb_agg(to_jsonb(t)) from public.calendar_days t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'calendar_events', coalesce((select jsonb_agg(to_jsonb(t)) from public.calendar_events t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'teaching_sessions', coalesce((select jsonb_agg(to_jsonb(t)) from public.teaching_sessions t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'teaching_session_allocations', coalesce((select jsonb_agg(to_jsonb(t)) from public.teaching_session_allocations t join public.teaching_sessions s on s.id = t.session_id where s.workspace_id = v_workspace_id), '[]'::jsonb),
      'planner_tasks', coalesce((select jsonb_agg(to_jsonb(t)) from public.planner_tasks t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'assistant_write_proposals', coalesce((select jsonb_agg(to_jsonb(t)) from public.assistant_write_proposals t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_assets', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_assets t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_documents', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_documents t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_processing_generations', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_processing_generations t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_ingestion_runs', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_ingestion_runs t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_units', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_units t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'knowledge_links', coalesce((select jsonb_agg(to_jsonb(t)) from public.knowledge_links t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'authored_documents', coalesce((select jsonb_agg(to_jsonb(t)) from public.authored_documents t where t.workspace_id = v_workspace_id), '[]'::jsonb),
      'authored_document_versions', coalesce((select jsonb_agg(to_jsonb(t)) from public.authored_document_versions t join public.authored_documents d on d.id = t.document_id where d.workspace_id = v_workspace_id), '[]'::jsonb),
      'experience_feedback', coalesce((select jsonb_agg(to_jsonb(t)) from public.experience_feedback t where t.workspace_id = v_workspace_id), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.workspace_export_manifest() from public;
revoke all on function public.workspace_export_manifest() from anon;
grant execute on function public.workspace_export_manifest() to authenticated;
