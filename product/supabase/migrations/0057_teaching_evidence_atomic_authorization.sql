begin;

-- TE-1A atomic provenance authorization hardening.
-- The public TeachingSession RPC must never accept the reserved atomic marker
-- unless the call is currently executing inside the TE-1A composite boundary.
-- A private transaction-scoped authorization row makes that condition explicit
-- without changing the public TeachingSession signature used by existing callers.

create table if not exists private.teaching_evidence_atomic_authorizations (
  transaction_id bigint not null,
  actor_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (transaction_id, actor_id)
);

revoke all on private.teaching_evidence_atomic_authorizations from public, anon, authenticated;

-- Preserve the already-certified TeachingSession implementation behind private.
alter function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) set schema private;

revoke all on function private.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) from public, anon, authenticated;

-- Public compatibility wrapper. Normal TeachingSession callers keep the same RPC;
-- only the TE-1A reserved provenance marker requires private transaction authority.
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
  atomic_marker_count integer := 0;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  select count(*)
    into atomic_marker_count
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where left(item, 25) = 'teaching_evidence_atomic:';

  if atomic_marker_count > 0 and not exists (
    select 1
    from private.teaching_evidence_atomic_authorizations a
    where a.transaction_id = txid_current()
      and a.actor_id = actor
  ) then
    raise exception 'teaching evidence atomic provenance marker is reserved';
  end if;

  return private.record_teaching_session(
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
    target_allocations
  );
end;
$$;

revoke all on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) from public, anon;
grant execute on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) to authenticated;

-- Re-wrap TE-1A so only this public composite can authorize the reserved marker
-- while its private implementation executes. The authorization is removed on
-- success and on handled failure; an outer transaction rollback also removes it.
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
declare
  actor uuid := auth.uid();
  receipt jsonb;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if target_observations is null or jsonb_typeof(target_observations) <> 'array' then
    raise exception 'teaching observations must be an array';
  end if;
  if target_evidence_references is null or jsonb_typeof(target_evidence_references) <> 'array' then
    raise exception 'teaching evidence references must be an array';
  end if;

  insert into private.teaching_evidence_atomic_authorizations(transaction_id, actor_id)
  values (txid_current(), actor)
  on conflict do nothing;

  begin
    receipt := private.record_teaching_session_with_evidence(
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

    delete from private.teaching_evidence_atomic_authorizations
    where transaction_id = txid_current()
      and actor_id = actor;

    return receipt;
  exception when others then
    delete from private.teaching_evidence_atomic_authorizations
    where transaction_id = txid_current()
      and actor_id = actor;
    raise;
  end;
end;
$$;

revoke all on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) from public, anon;
grant execute on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) to authenticated;

comment on table private.teaching_evidence_atomic_authorizations is
  'Internal transaction-scoped authority proving that the TE-1A composite, not a direct caller, is using the reserved atomic provenance marker.';
comment on function private.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) is
  'Private canonical TeachingSession implementation. Public callers must use public.record_teaching_session, which rejects forged TE-1A atomic provenance.';
comment on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) is
  'Public TeachingSession RPC compatibility wrapper. Reserved teaching_evidence_atomic provenance is accepted only while a private TE-1A transaction authorization is active.';
comment on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Public TE-1A composite. Establishes private transaction authority for the reserved atomic marker, delegates atomically, and removes the authority before returning.';

commit;
