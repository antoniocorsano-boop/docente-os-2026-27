begin;

-- A teaching session is authoritative evidence of what happened in class.
-- Canonical B01-B33 allocations are optional: diagnostic, welcoming, recovery,
-- cross-cutting and otherwise pre-canonical sessions must remain recordable
-- without inventing a plan binding.
create or replace function public.record_teaching_session(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_discipline_id uuid,
  target_local_date date,
  target_planned_start_time time,
  target_planned_end_time time,
  target_planned_minutes integer,
  target_actual_minutes integer,
  target_evidence_note text,
  target_source_kind text,
  target_projected_occurrence_logical_id text,
  target_source_timetable_version_id uuid,
  target_source_timetable_slot_id uuid,
  target_source_calendar_state text,
  target_source_provenance text[],
  target_supersedes_session_id uuid,
  target_allocations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  session_id uuid;
  allocation jsonb;
  allocation_total integer := 0;
  allocation_block text;
  allocation_minutes integer;
  allocation_asset uuid;
  allocation_generation uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if target_actual_minutes is null or target_actual_minutes <= 0 then raise exception 'actual minutes required'; end if;
  if jsonb_typeof(target_allocations) <> 'array' then
    raise exception 'teaching session allocations must be an array';
  end if;

  for allocation in select value from jsonb_array_elements(target_allocations) loop
    allocation_block := allocation->>'block_id';
    allocation_minutes := (allocation->>'minutes')::integer;
    allocation_asset := (allocation->>'canonical_plan_asset_id')::uuid;
    allocation_generation := (allocation->>'canonical_generation_id')::uuid;
    if allocation_block !~ '^B(0[1-9]|[12][0-9]|3[0-3])$' or allocation_minutes <= 0 then
      raise exception 'invalid teaching session allocation';
    end if;
    allocation_total := allocation_total + allocation_minutes;
  end loop;

  if allocation_total > target_actual_minutes then
    raise exception 'allocated minutes exceed actual teaching session minutes';
  end if;

  insert into public.teaching_sessions (
    workspace_id, academic_year_id, section_id, discipline_id, local_date,
    planned_start_time, planned_end_time, planned_minutes, actual_minutes,
    evidence_note, source_kind, projected_occurrence_logical_id,
    source_timetable_version_id, source_timetable_slot_id, source_calendar_state,
    source_provenance, supersedes_session_id, recorded_by
  ) values (
    target_workspace_id, target_academic_year_id, target_section_id, target_discipline_id, target_local_date,
    target_planned_start_time, target_planned_end_time, target_planned_minutes, target_actual_minutes,
    target_evidence_note, target_source_kind, target_projected_occurrence_logical_id,
    target_source_timetable_version_id, target_source_timetable_slot_id, target_source_calendar_state,
    coalesce(target_source_provenance, '{}'), target_supersedes_session_id, actor
  ) returning id into session_id;

  for allocation in select value from jsonb_array_elements(target_allocations) loop
    insert into public.teaching_session_allocations (
      session_id, block_id, minutes, canonical_plan_asset_id, canonical_generation_id
    ) values (
      session_id,
      allocation->>'block_id',
      (allocation->>'minutes')::integer,
      (allocation->>'canonical_plan_asset_id')::uuid,
      (allocation->>'canonical_generation_id')::uuid
    );
  end loop;

  return session_id;
end;
$$;

revoke all on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) from public, anon;
grant execute on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) to authenticated;

comment on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) is
  'Atomic teaching evidence write boundary. Canonical allocations are optional so diagnostic/pre-canonical sessions remain recordable; when provided they are validated and never auto-complete annual-plan blocks.';

commit;
