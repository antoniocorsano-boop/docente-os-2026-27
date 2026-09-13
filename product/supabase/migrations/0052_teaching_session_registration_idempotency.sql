begin;

-- Manual TeachingSession writes need retry-safe semantics too. Projected occurrences
-- already have a canonical uniqueness constraint; this receipt extends the same
-- guarantee to a user submission without changing the public RPC signature.
create table public.teaching_session_registration_receipts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  registration_key uuid not null,
  request_signature text not null check (request_signature ~ '^[0-9a-f]{32}$'),
  session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (workspace_id, academic_year_id, section_id, recorded_by, registration_key),
  unique (session_id)
);

alter table public.teaching_session_registration_receipts enable row level security;
revoke all on public.teaching_session_registration_receipts from anon, authenticated;

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
  existing_session_id uuid;
  allocation jsonb;
  allocation_total integer := 0;
  allocation_block text;
  allocation_minutes integer;
  registration_marker_count integer := 0;
  registration_key_text text;
  registration_key uuid;
  computed_signature text;
  stored_signature text;
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
    if allocation_block !~ '^B(0[1-9]|[12][0-9]|3[0-3])$' or allocation_minutes <= 0 then
      raise exception 'invalid teaching session allocation';
    end if;
    allocation_total := allocation_total + allocation_minutes;
  end loop;

  if allocation_total > target_actual_minutes then
    raise exception 'allocated minutes exceed actual teaching session minutes';
  end if;

  select count(*), min(split_part(item, ':', 2))
    into registration_marker_count, registration_key_text
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where item like 'registration_key:%';

  if registration_marker_count > 1 then
    raise exception 'multiple teaching session registration keys are not allowed';
  end if;

  if registration_marker_count = 1 then
    begin
      registration_key := registration_key_text::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid teaching session registration key';
    end;

    computed_signature := md5(concat_ws(chr(31),
      actor::text,
      target_workspace_id::text,
      target_academic_year_id::text,
      target_section_id::text,
      coalesce(target_discipline_id::text, ''),
      target_local_date::text,
      coalesce(target_planned_start_time::text, ''),
      coalesce(target_planned_end_time::text, ''),
      coalesce(target_planned_minutes::text, ''),
      target_actual_minutes::text,
      coalesce(target_evidence_note, ''),
      target_source_kind,
      coalesce(target_projected_occurrence_logical_id, ''),
      coalesce(target_source_timetable_version_id::text, ''),
      coalesce(target_source_timetable_slot_id::text, ''),
      coalesce(target_source_calendar_state, ''),
      coalesce(target_source_provenance::text, '{}'),
      coalesce(target_supersedes_session_id::text, ''),
      target_allocations::text
    ));

    select r.session_id, r.request_signature
      into existing_session_id, stored_signature
    from public.teaching_session_registration_receipts r
    where r.workspace_id = target_workspace_id
      and r.academic_year_id = target_academic_year_id
      and r.section_id = target_section_id
      and r.recorded_by = actor
      and r.registration_key = registration_key;

    if existing_session_id is not null then
      if stored_signature <> computed_signature then
        raise exception 'teaching session registration key reused with different payload';
      end if;
      return existing_session_id;
    end if;
  end if;

  begin
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

    if registration_key is not null then
      insert into public.teaching_session_registration_receipts (
        workspace_id, academic_year_id, section_id, recorded_by,
        registration_key, request_signature, session_id
      ) values (
        target_workspace_id, target_academic_year_id, target_section_id, actor,
        registration_key, computed_signature, session_id
      );
    end if;

    return session_id;
  exception when unique_violation then
    if registration_key is null then
      raise;
    end if;

    select r.session_id, r.request_signature
      into existing_session_id, stored_signature
    from public.teaching_session_registration_receipts r
    where r.workspace_id = target_workspace_id
      and r.academic_year_id = target_academic_year_id
      and r.section_id = target_section_id
      and r.recorded_by = actor
      and r.registration_key = registration_key;

    if existing_session_id is null then
      raise;
    end if;
    if stored_signature <> computed_signature then
      raise exception 'teaching session registration key reused with different payload';
    end if;
    return existing_session_id;
  end;
end;
$$;

revoke all on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) from public, anon;
grant execute on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) to authenticated;

comment on table public.teaching_session_registration_receipts is
  'Internal idempotency receipts for authoritative TeachingSession writes. No direct authenticated access; record_teaching_session resolves retries atomically.';
comment on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) is
  'Atomic teaching evidence write boundary. Optional registration_key provenance makes manual retries idempotent; payload reuse with different content fails closed. Canonical allocations never auto-complete annual-plan blocks.';

commit;
