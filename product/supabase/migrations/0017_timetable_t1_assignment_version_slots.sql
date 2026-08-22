create table if not exists public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  discipline_id uuid not null references public.teaching_disciplines(id) on delete restrict,
  weekly_minutes integer not null default 120 check (weekly_minutes between 30 and 2400),
  status text not null default 'PROVISIONAL' check (status in ('PROVISIONAL','CONFIRMED')),
  source_note text null check (source_note is null or char_length(source_note) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_assignments_section_discipline_uq unique (section_id, discipline_id)
);

create table if not exists public.timetable_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','ARCHIVED')),
  effective_from date not null,
  effective_to date null,
  source_kind text not null default 'MANUAL' check (source_kind in ('MANUAL','INSTITUTION_DOCUMENT','IMPORT')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_versions_dates_ck check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists timetable_versions_one_draft_uq
  on public.timetable_versions(workspace_id, academic_year_id)
  where status = 'DRAFT';

create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  timetable_version_id uuid not null references public.timetable_versions(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 6),
  start_time time not null,
  end_time time not null,
  slot_kind text not null default 'LESSON' check (slot_kind in ('LESSON','DISPOSITION','RECEPTION','OTHER')),
  section_id uuid null references public.annual_plan_sections(id) on delete restrict,
  discipline_id uuid null references public.teaching_disciplines(id) on delete restrict,
  teaching_assignment_id uuid null references public.teaching_assignments(id) on delete restrict,
  room text null check (room is null or char_length(room) <= 80),
  note text null check (note is null or char_length(note) <= 1000),
  ordinal smallint null check (ordinal is null or ordinal between 1 and 20),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_slots_times_ck check (end_time > start_time),
  constraint timetable_slots_lesson_refs_ck check (
    (slot_kind = 'LESSON' and section_id is not null and discipline_id is not null and teaching_assignment_id is not null)
    or slot_kind <> 'LESSON'
  )
);

create index if not exists idx_teaching_assignments_workspace_year on public.teaching_assignments(workspace_id, academic_year_id);
create index if not exists idx_teaching_assignments_section on public.teaching_assignments(section_id);
create index if not exists idx_teaching_assignments_discipline on public.teaching_assignments(discipline_id);
create index if not exists idx_teaching_assignments_created_by on public.teaching_assignments(created_by);
create index if not exists idx_timetable_versions_workspace_year on public.timetable_versions(workspace_id, academic_year_id, status);
create index if not exists idx_timetable_versions_academic_year on public.timetable_versions(academic_year_id);
create index if not exists idx_timetable_versions_created_by on public.timetable_versions(created_by);
create index if not exists idx_timetable_slots_version_day on public.timetable_slots(timetable_version_id, weekday, start_time);
create index if not exists idx_timetable_slots_section on public.timetable_slots(section_id);
create index if not exists idx_timetable_slots_discipline on public.timetable_slots(discipline_id);
create index if not exists idx_timetable_slots_assignment on public.timetable_slots(teaching_assignment_id);
create index if not exists idx_timetable_slots_created_by on public.timetable_slots(created_by);

create or replace function private.enforce_teaching_assignment_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace uuid;
  section_year uuid;
  discipline_workspace uuid;
  discipline_year uuid;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id or new.academic_year_id <> old.academic_year_id
      or new.section_id <> old.section_id or new.discipline_id <> old.discipline_id
      or new.created_by <> old.created_by then
      raise exception 'teaching assignment identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select workspace_id, academic_year_id into section_workspace, section_year
  from public.annual_plan_sections where id = new.section_id;
  select workspace_id, academic_year_id into discipline_workspace, discipline_year
  from public.teaching_disciplines where id = new.discipline_id and is_active = true;

  if section_workspace is null or discipline_workspace is null then
    raise exception 'teaching assignment requires existing section and active discipline';
  end if;
  if new.workspace_id <> section_workspace or new.workspace_id <> discipline_workspace
    or new.academic_year_id <> section_year or new.academic_year_id <> discipline_year then
    raise exception 'teaching assignment context mismatch';
  end if;

  new.source_note := nullif(btrim(coalesce(new.source_note, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger teaching_assignments_enforce_invariants
before insert or update on public.teaching_assignments
for each row execute function private.enforce_teaching_assignment_invariants();

create or replace function private.enforce_timetable_version_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace uuid;
  year_start date;
  year_end date;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id or new.academic_year_id <> old.academic_year_id
      or new.created_by <> old.created_by then
      raise exception 'timetable version context identity is immutable';
    end if;
    if old.status <> 'DRAFT' and (new.effective_from <> old.effective_from or new.source_kind <> old.source_kind or new.source_ref is distinct from old.source_ref) then
      raise exception 'non-draft timetable version source/effective start is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select workspace_id, starts_on, ends_on into year_workspace, year_start, year_end
  from public.academic_years where id = new.academic_year_id;
  if year_workspace is null or year_workspace <> new.workspace_id then
    raise exception 'timetable version academic year is outside workspace';
  end if;
  if new.effective_from < year_start or new.effective_from > year_end
    or (new.effective_to is not null and new.effective_to > year_end) then
    raise exception 'timetable version effective dates outside academic year';
  end if;

  new.label := btrim(new.label);
  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger timetable_versions_enforce_invariants
before insert or update on public.timetable_versions
for each row execute function private.enforce_timetable_version_invariants();

create or replace function private.enforce_timetable_slot_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  version_workspace uuid;
  version_year uuid;
  version_status text;
  assignment_workspace uuid;
  assignment_year uuid;
  assignment_section uuid;
  assignment_discipline uuid;
begin
  select workspace_id, academic_year_id, status into version_workspace, version_year, version_status
  from public.timetable_versions where id = new.timetable_version_id;

  if version_workspace is null then raise exception 'timetable version not found'; end if;
  if version_status <> 'DRAFT' then raise exception 'only draft timetable versions can be edited'; end if;

  if tg_op = 'UPDATE' then
    if new.timetable_version_id <> old.timetable_version_id or new.created_by <> old.created_by then
      raise exception 'timetable slot version/creator is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  if new.slot_kind = 'LESSON' then
    select workspace_id, academic_year_id, section_id, discipline_id
      into assignment_workspace, assignment_year, assignment_section, assignment_discipline
    from public.teaching_assignments where id = new.teaching_assignment_id;
    if assignment_workspace is null
      or assignment_workspace <> version_workspace or assignment_year <> version_year
      or assignment_section <> new.section_id or assignment_discipline <> new.discipline_id then
      raise exception 'lesson slot assignment/context mismatch';
    end if;
  else
    new.section_id := null;
    new.discipline_id := null;
    new.teaching_assignment_id := null;
  end if;

  if exists (
    select 1 from public.timetable_slots s
    where s.timetable_version_id = new.timetable_version_id
      and s.weekday = new.weekday
      and s.id <> coalesce(new.id, gen_random_uuid())
      and s.start_time < new.end_time and s.end_time > new.start_time
  ) then
    raise exception 'timetable slot overlaps an existing slot';
  end if;

  new.room := nullif(btrim(coalesce(new.room, '')), '');
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger timetable_slots_enforce_invariants
before insert or update on public.timetable_slots
for each row execute function private.enforce_timetable_slot_invariants();

create or replace function private.guard_timetable_slot_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare version_status text;
begin
  select status into version_status from public.timetable_versions where id = old.timetable_version_id;
  if version_status <> 'DRAFT' then raise exception 'only draft timetable versions can be edited'; end if;
  return old;
end;
$$;
create trigger timetable_slots_guard_delete before delete on public.timetable_slots
for each row execute function private.guard_timetable_slot_delete();

alter table public.teaching_assignments enable row level security;
alter table public.timetable_versions enable row level security;
alter table public.timetable_slots enable row level security;

create policy teaching_assignments_select_member on public.teaching_assignments for select to authenticated using (private.is_workspace_member(workspace_id));
create policy teaching_assignments_insert_member on public.teaching_assignments for insert to authenticated with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy teaching_assignments_update_member on public.teaching_assignments for update to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy timetable_versions_select_member on public.timetable_versions for select to authenticated using (private.is_workspace_member(workspace_id));
create policy timetable_versions_insert_member on public.timetable_versions for insert to authenticated with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy timetable_versions_update_member on public.timetable_versions for update to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));

create policy timetable_slots_select_member on public.timetable_slots for select to authenticated using (
  exists (select 1 from public.timetable_versions v where v.id = timetable_version_id and private.is_workspace_member(v.workspace_id))
);
create policy timetable_slots_insert_member on public.timetable_slots for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (select 1 from public.timetable_versions v where v.id = timetable_version_id and private.is_workspace_member(v.workspace_id))
);
create policy timetable_slots_update_member on public.timetable_slots for update to authenticated using (
  exists (select 1 from public.timetable_versions v where v.id = timetable_version_id and private.is_workspace_member(v.workspace_id))
) with check (
  exists (select 1 from public.timetable_versions v where v.id = timetable_version_id and private.is_workspace_member(v.workspace_id))
);
create policy timetable_slots_delete_member on public.timetable_slots for delete to authenticated using (
  exists (select 1 from public.timetable_versions v where v.id = timetable_version_id and private.is_workspace_member(v.workspace_id))
);

grant select, insert, update on public.teaching_assignments to authenticated;
grant select, insert, update on public.timetable_versions to authenticated;
grant select, insert, update, delete on public.timetable_slots to authenticated;
revoke all on public.teaching_assignments from anon;
revoke all on public.timetable_versions from anon;
revoke all on public.timetable_slots from anon;

comment on table public.teaching_assignments is 'Annual teacher workload links between one section and one active discipline; source data for timetable construction.';
comment on table public.timetable_versions is 'Versioned timetable configurations with effective dates; T1 starts with DRAFT versions.';
comment on table public.timetable_slots is 'Recurring weekly timetable pattern for one draft timetable version.';