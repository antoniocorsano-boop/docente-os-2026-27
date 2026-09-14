begin;

-- TE-1A public-boundary null hardening.
-- Move the already-certified implementation behind the private schema and expose
-- a narrow public wrapper that rejects SQL NULL before any JSON inspection.
alter function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) set schema private;

revoke all on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) from public, anon, authenticated;

create or replace function public.record_teaching_session_with_evidence(
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
  target_allocations jsonb,
  target_observations jsonb,
  target_evidence_references jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_observations is null or jsonb_typeof(target_observations) <> 'array' then
    raise exception 'teaching observations must be an array';
  end if;
  if target_evidence_references is null or jsonb_typeof(target_evidence_references) <> 'array' then
    raise exception 'teaching evidence references must be an array';
  end if;

  return private.record_teaching_session_with_evidence(
    target_workspace_id,
    target_academic_year_id,
    target_section_id,
    target_discipline_id,
    target_local_date,
    target_planned_start_time,
    target_planned_end_time,
    target_planned_minutes,
    target_actual_minutes,
    target_evidence_note,
    target_source_kind,
    target_projected_occurrence_logical_id,
    target_source_timetable_version_id,
    target_source_timetable_slot_id,
    target_source_calendar_state,
    target_source_provenance,
    target_supersedes_session_id,
    target_allocations,
    target_observations,
    target_evidence_references
  );
end;
$$;

revoke all on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) from public, anon;
grant execute on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) to authenticated;

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation: atomic TeachingSession + Observation/Evidence persistence with replay/concurrency hardening. Direct authenticated execution is revoked.';
comment on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Public TE-1A RPC wrapper. Rejects SQL NULL and non-array Observation/Evidence payloads before invoking the private atomic implementation.';

commit;
