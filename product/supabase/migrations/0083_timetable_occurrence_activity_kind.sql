begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (83, '0083_timetable_occurrence_activity_kind')
on conflict (version) do update
set migration_id = excluded.migration_id;

create table if not exists public.timetable_exceptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  local_date date not null,
  timetable_version_id uuid not null references public.timetable_versions(id) on delete cascade,
  timetable_slot_id uuid not null references public.timetable_slots(id) on delete cascade,
  kind text not null check (kind in ('ACTIVITY_KIND_CHANGED')),
  activity_kind text not null check (
    activity_kind in ('THEORY', 'DRAWING_PROJECT', 'PRACTICAL_LAB', 'ASSESSMENT', 'OTHER')
  ),
  source_kind text not null default 'TEACHER' check (source_kind in ('TEACHER', 'INSTITUTION', 'IMPORT')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_exceptions_occurrence_kind_uq
    unique (workspace_id, academic_year_id, local_date, timetable_slot_id, kind)
);

create index if not exists idx_timetable_exceptions_workspace_date
  on public.timetable_exceptions(workspace_id, academic_year_id, local_date);

create index if not exists idx_timetable_exceptions_slot_date
  on public.timetable_exceptions(timetable_slot_id, local_date);

create or replace function private.enforce_timetable_exception_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  slot_kind_value text;
  slot_weekday integer;
  version_workspace uuid;
  version_year uuid;
  version_status text;
  version_start date;
  version_end date;
  year_start date;
  year_end date;
begin
  select
    s.slot_kind,
    s.weekday,
    v.workspace_id,
    v.academic_year_id,
    v.status,
    v.effective_from,
    v.effective_to
  into
    slot_kind_value,
    slot_weekday,
    version_workspace,
    version_year,
    version_status,
    version_start,
    version_end
  from public.timetable_slots s
  join public.timetable_versions v on v.id = s.timetable_version_id
  where s.id = new.timetable_slot_id
    and v.id = new.timetable_version_id;

  if slot_kind_value is null then
    raise exception 'timetable exception source slot/version not found';
  end if;

  if version_workspace <> new.workspace_id or version_year <> new.academic_year_id then
    raise exception 'timetable exception is outside workspace/year';
  end if;

  if version_status = 'DRAFT' then
    raise exception 'single-date timetable exceptions require an in-force or historical version';
  end if;

  if new.local_date < version_start
    or (version_end is not null and new.local_date > version_end) then
    raise exception 'timetable exception date is outside version validity';
  end if;

  if extract(isodow from new.local_date)::integer <> slot_weekday then
    raise exception 'timetable exception date does not match slot weekday';
  end if;

  select starts_on, ends_on
  into year_start, year_end
  from public.academic_years
  where id = new.academic_year_id
    and workspace_id = new.workspace_id;

  if year_start is null or new.local_date < year_start or new.local_date > year_end then
    raise exception 'timetable exception date is outside academic year';
  end if;

  if new.kind = 'ACTIVITY_KIND_CHANGED' and slot_kind_value <> 'LESSON' then
    raise exception 'activity kind can be changed only for lesson slots';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists timetable_exceptions_enforce_context on public.timetable_exceptions;
create trigger timetable_exceptions_enforce_context
before insert or update on public.timetable_exceptions
for each row execute function private.enforce_timetable_exception_context();

alter table public.timetable_exceptions enable row level security;

drop policy if exists timetable_exceptions_select_member on public.timetable_exceptions;
create policy timetable_exceptions_select_member on public.timetable_exceptions
for select to authenticated
using (private.is_workspace_member(workspace_id));

revoke all on public.timetable_exceptions from anon, authenticated;
grant select on public.timetable_exceptions to authenticated;

create or replace function public.set_timetable_occurrence_activity_kind(
  p_timetable_slot_id uuid,
  p_local_date date,
  p_activity_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  slot_kind_value text;
  slot_weekday integer;
  slot_activity_kind text;
  source_version_id uuid;
  source_workspace_id uuid;
  source_academic_year_id uuid;
  version_status text;
  version_start date;
  version_end date;
  year_start date;
  year_end date;
  requested_activity_kind text := nullif(btrim(coalesce(p_activity_kind, '')), '');
  effective_default text;
  override_id uuid;
begin
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  select
    s.slot_kind,
    s.weekday,
    s.activity_kind,
    v.id,
    v.workspace_id,
    v.academic_year_id,
    v.status,
    v.effective_from,
    v.effective_to
  into
    slot_kind_value,
    slot_weekday,
    slot_activity_kind,
    source_version_id,
    source_workspace_id,
    source_academic_year_id,
    version_status,
    version_start,
    version_end
  from public.timetable_slots s
  join public.timetable_versions v on v.id = s.timetable_version_id
  where s.id = p_timetable_slot_id;

  if source_version_id is null then
    raise exception 'timetable slot not found';
  end if;

  if not private.is_workspace_member(source_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  if slot_kind_value <> 'LESSON' then
    raise exception 'activity kind can be changed only for lesson slots';
  end if;

  if version_status = 'DRAFT' then
    raise exception 'single-date activity changes require an in-force or historical timetable';
  end if;

  if p_local_date < version_start
    or (version_end is not null and p_local_date > version_end) then
    raise exception 'occurrence date is outside timetable version validity';
  end if;

  if extract(isodow from p_local_date)::integer <> slot_weekday then
    raise exception 'occurrence date does not match timetable slot weekday';
  end if;

  select starts_on, ends_on
  into year_start, year_end
  from public.academic_years
  where id = source_academic_year_id
    and workspace_id = source_workspace_id;

  if year_start is null or p_local_date < year_start or p_local_date > year_end then
    raise exception 'occurrence date is outside academic year';
  end if;

  if exists (
    select 1
    from public.teaching_sessions ts
    where ts.workspace_id = source_workspace_id
      and ts.academic_year_id = source_academic_year_id
      and ts.local_date = p_local_date
      and ts.source_timetable_slot_id = p_timetable_slot_id
  ) then
    raise exception 'recorded lesson occurrence is immutable';
  end if;

  effective_default := coalesce(slot_activity_kind, 'THEORY');

  if requested_activity_kind is null or requested_activity_kind = effective_default then
    delete from public.timetable_exceptions
    where workspace_id = source_workspace_id
      and academic_year_id = source_academic_year_id
      and local_date = p_local_date
      and timetable_slot_id = p_timetable_slot_id
      and kind = 'ACTIVITY_KIND_CHANGED';

    return jsonb_build_object(
      'activityKind', effective_default,
      'overridden', false
    );
  end if;

  if requested_activity_kind not in ('THEORY', 'DRAWING_PROJECT', 'PRACTICAL_LAB', 'ASSESSMENT', 'OTHER') then
    raise exception 'unsupported timetable activity kind';
  end if;

  insert into public.timetable_exceptions (
    workspace_id,
    academic_year_id,
    local_date,
    timetable_version_id,
    timetable_slot_id,
    kind,
    activity_kind,
    source_kind,
    source_ref,
    created_by
  ) values (
    source_workspace_id,
    source_academic_year_id,
    p_local_date,
    source_version_id,
    p_timetable_slot_id,
    'ACTIVITY_KIND_CHANGED',
    requested_activity_kind,
    'TEACHER',
    null,
    actor_id
  )
  on conflict (workspace_id, academic_year_id, local_date, timetable_slot_id, kind)
  do update set
    timetable_version_id = excluded.timetable_version_id,
    activity_kind = excluded.activity_kind,
    source_kind = excluded.source_kind,
    source_ref = excluded.source_ref,
    updated_at = now()
  returning id into override_id;

  return jsonb_build_object(
    'id', override_id,
    'activityKind', requested_activity_kind,
    'overridden', true
  );
end;
$$;

revoke all on function public.set_timetable_occurrence_activity_kind(uuid,date,text) from public;
revoke all on function public.set_timetable_occurrence_activity_kind(uuid,date,text) from anon;
grant execute on function public.set_timetable_occurrence_activity_kind(uuid,date,text) to authenticated;

comment on table public.timetable_exceptions is
  'Teacher-visible single-date deviations from a recurring timetable pattern. These rows never rewrite the recurring slot.';
comment on function public.set_timetable_occurrence_activity_kind(uuid,date,text) is
  'Sets or clears the teacher-authored activity kind for one concrete lesson occurrence without modifying the recurring timetable slot. Recorded lesson occurrences are immutable.';

select private.advance_runtime_schema_contract('0083_timetable_occurrence_activity_kind');

commit;
