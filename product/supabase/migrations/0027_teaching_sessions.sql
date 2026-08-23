begin;

create table public.teaching_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete restrict,
  discipline_id uuid null references public.teaching_disciplines(id) on delete set null,
  local_date date not null,
  planned_start_time time null,
  planned_end_time time null,
  planned_minutes integer null check (planned_minutes is null or planned_minutes between 1 and 1440),
  actual_minutes integer not null check (actual_minutes between 1 and 1440),
  evidence_note text null check (evidence_note is null or char_length(evidence_note) <= 4000),
  source_kind text not null check (source_kind in ('PROJECTED_OCCURRENCE','MANUAL')),
  projected_occurrence_logical_id text null check (projected_occurrence_logical_id is null or char_length(projected_occurrence_logical_id) <= 500),
  source_timetable_version_id uuid null,
  source_timetable_slot_id uuid null,
  source_calendar_state text null check (source_calendar_state is null or source_calendar_state in ('SCHOOL_DAY','NO_LESSONS','UNDETERMINED')),
  source_provenance text[] not null default '{}',
  supersedes_session_id uuid null references public.teaching_sessions(id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint teaching_sessions_planned_time_ck check (
    (planned_start_time is null and planned_end_time is null)
    or (planned_start_time is not null and planned_end_time is not null and planned_end_time > planned_start_time)
  ),
  constraint teaching_sessions_projected_source_ck check (
    (source_kind = 'MANUAL' and projected_occurrence_logical_id is null)
    or
    (source_kind = 'PROJECTED_OCCURRENCE' and projected_occurrence_logical_id is not null and source_calendar_state = 'SCHOOL_DAY')
  )
);

create unique index teaching_sessions_projected_occurrence_uq
  on public.teaching_sessions(workspace_id, academic_year_id, projected_occurrence_logical_id)
  where source_kind = 'PROJECTED_OCCURRENCE';

create unique index teaching_sessions_supersedes_once_uq
  on public.teaching_sessions(supersedes_session_id)
  where supersedes_session_id is not null;

create index idx_teaching_sessions_section_date
  on public.teaching_sessions(section_id, local_date desc, recorded_at desc);
create index idx_teaching_sessions_workspace_year
  on public.teaching_sessions(workspace_id, academic_year_id, local_date desc);
create index idx_teaching_sessions_recorded_by on public.teaching_sessions(recorded_by);

create table public.teaching_session_allocations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  minutes integer not null check (minutes between 1 and 1440),
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint teaching_session_allocations_target_uq unique (session_id, canonical_generation_id, block_id)
);

create index idx_teaching_session_allocations_session on public.teaching_session_allocations(session_id);
create index idx_teaching_session_allocations_block on public.teaching_session_allocations(canonical_generation_id, block_id);

create or replace function private.enforce_teaching_session_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace uuid;
  section_year uuid;
  year_start date;
  year_end date;
  discipline_workspace uuid;
  discipline_year uuid;
  superseded_workspace uuid;
  superseded_year uuid;
  superseded_section uuid;
begin
  select workspace_id, academic_year_id into section_workspace, section_year
  from public.annual_plan_sections where id = new.section_id;

  if section_workspace is null or section_workspace <> new.workspace_id or section_year <> new.academic_year_id then
    raise exception 'teaching session section is outside workspace/year';
  end if;

  select starts_on, ends_on into year_start, year_end
  from public.academic_years where id = new.academic_year_id and workspace_id = new.workspace_id;

  if year_start is null or new.local_date < year_start or new.local_date > year_end then
    raise exception 'teaching session date is outside academic year';
  end if;

  if new.discipline_id is not null then
    select workspace_id, academic_year_id into discipline_workspace, discipline_year
    from public.teaching_disciplines where id = new.discipline_id;
    if discipline_workspace is null or discipline_workspace <> new.workspace_id or discipline_year <> new.academic_year_id then
      raise exception 'teaching session discipline is outside workspace/year';
    end if;
  end if;

  if new.supersedes_session_id is not null then
    select workspace_id, academic_year_id, section_id
      into superseded_workspace, superseded_year, superseded_section
    from public.teaching_sessions where id = new.supersedes_session_id;
    if superseded_workspace is null
      or superseded_workspace <> new.workspace_id
      or superseded_year <> new.academic_year_id
      or superseded_section <> new.section_id then
      raise exception 'superseded teaching session is outside the same context';
    end if;
  end if;

  new.evidence_note := nullif(btrim(coalesce(new.evidence_note, '')), '');
  return new;
end;
$$;

create trigger teaching_sessions_enforce_context
before insert on public.teaching_sessions
for each row execute function private.enforce_teaching_session_context();

create or replace function private.enforce_teaching_session_allocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_minutes integer;
  session_workspace uuid;
  session_year uuid;
  asset_workspace uuid;
  asset_year uuid;
  asset_generation uuid;
  generation_asset uuid;
  generation_workspace uuid;
  generation_status text;
  other_minutes integer;
begin
  select actual_minutes, workspace_id, academic_year_id
    into session_minutes, session_workspace, session_year
  from public.teaching_sessions
  where id = new.session_id
  for update;

  if session_minutes is null then
    raise exception 'teaching session not found';
  end if;

  select workspace_id, academic_year_id, current_generation_id
    into asset_workspace, asset_year, asset_generation
  from public.knowledge_assets where id = new.canonical_plan_asset_id;

  select asset_id, workspace_id, status
    into generation_asset, generation_workspace, generation_status
  from public.knowledge_processing_generations where id = new.canonical_generation_id;

  if asset_workspace is null
    or asset_workspace <> session_workspace
    or asset_year is distinct from session_year
    or asset_generation <> new.canonical_generation_id
    or generation_asset <> new.canonical_plan_asset_id
    or generation_workspace <> session_workspace
    or generation_status <> 'SUCCEEDED' then
    raise exception 'allocation canonical source is not the current successful generation for this session context';
  end if;

  select coalesce(sum(minutes), 0) into other_minutes
  from public.teaching_session_allocations
  where session_id = new.session_id
    and (tg_op <> 'UPDATE' or id <> new.id);

  if other_minutes + new.minutes > session_minutes then
    raise exception 'allocated minutes exceed actual teaching session minutes';
  end if;

  return new;
end;
$$;

create trigger teaching_session_allocations_enforce
before insert or update on public.teaching_session_allocations
for each row execute function private.enforce_teaching_session_allocation();

alter table public.teaching_sessions enable row level security;
alter table public.teaching_session_allocations enable row level security;

create policy teaching_sessions_select_member on public.teaching_sessions
for select to authenticated using (private.is_workspace_member(workspace_id));

create policy teaching_session_allocations_select_member on public.teaching_session_allocations
for select to authenticated using (
  exists (
    select 1 from public.teaching_sessions s
    where s.id = session_id and private.is_workspace_member(s.workspace_id)
  )
);

revoke all on public.teaching_sessions from anon, authenticated;
revoke all on public.teaching_session_allocations from anon, authenticated;
grant select on public.teaching_sessions to authenticated;
grant select on public.teaching_session_allocations to authenticated;

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
  allocation_count integer := 0;
  allocation_total integer := 0;
  allocation_block text;
  allocation_minutes integer;
  allocation_asset uuid;
  allocation_generation uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if target_actual_minutes is null or target_actual_minutes <= 0 then raise exception 'actual minutes required'; end if;
  if jsonb_typeof(target_allocations) <> 'array' or jsonb_array_length(target_allocations) = 0 then
    raise exception 'at least one canonical allocation is required';
  end if;

  for allocation in select value from jsonb_array_elements(target_allocations) loop
    allocation_count := allocation_count + 1;
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

comment on table public.teaching_sessions is 'Immutable evidence of teaching actually recorded by the teacher. Projected timetable occurrences are candidates only.';
comment on table public.teaching_session_allocations is 'Canonical minute allocations from one recorded TeachingSession to B01-B33. Cross-row trigger prevents allocating more than actual session time.';
comment on function public.record_teaching_session(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb) is 'Atomic T4 write boundary. Validates membership and allocations; never marks annual-plan blocks SVOLTO.';

commit;
