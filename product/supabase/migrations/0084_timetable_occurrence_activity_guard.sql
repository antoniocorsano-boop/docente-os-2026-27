begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (84, '0084_timetable_occurrence_activity_guard')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function private.lock_teaching_session_timetable_slot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source_timetable_slot_id is not null then
    perform 1
    from public.timetable_slots
    where id = new.source_timetable_slot_id
    for update;

    if not found then
      raise exception 'teaching session timetable slot not found';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists teaching_sessions_lock_timetable_slot on public.teaching_sessions;
create trigger teaching_sessions_lock_timetable_slot
before insert on public.teaching_sessions
for each row execute function private.lock_teaching_session_timetable_slot();

create or replace function private.guard_timetable_activity_exception()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_workspace_id uuid;
  target_academic_year_id uuid;
  target_local_date date;
  target_timetable_slot_id uuid;
  calendar_day_kind text;
begin
  target_workspace_id := new.workspace_id;
  target_academic_year_id := new.academic_year_id;
  target_local_date := new.local_date;
  target_timetable_slot_id := new.timetable_slot_id;

  perform 1
  from public.timetable_slots
  where id = target_timetable_slot_id
  for update;

  if not found then
    raise exception 'timetable exception source slot not found';
  end if;

  select day_kind
    into calendar_day_kind
  from public.calendar_days
  where workspace_id = target_workspace_id
    and academic_year_id = target_academic_year_id
    and local_date = target_local_date;

  if calendar_day_kind in ('SUSPENSION', 'HOLIDAY', 'CLOSURE') then
    raise exception 'lesson occurrence is suppressed by school calendar';
  end if;

  if exists (
    select 1
    from public.teaching_sessions ts
    where ts.workspace_id = target_workspace_id
      and ts.academic_year_id = target_academic_year_id
      and ts.local_date = target_local_date
      and ts.source_timetable_slot_id = target_timetable_slot_id
  ) then
    raise exception 'recorded lesson occurrence is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists timetable_exceptions_atomic_guard on public.timetable_exceptions;
create trigger timetable_exceptions_atomic_guard
before insert or update on public.timetable_exceptions
for each row execute function private.guard_timetable_activity_exception();

comment on function private.lock_teaching_session_timetable_slot() is
  'Serializes TeachingSession registration with single-date timetable activity changes by locking the shared timetable slot row.';
comment on function private.guard_timetable_activity_exception() is
  'Serializes single-date activity inserts/updates with TeachingSession registration and rejects calendar-suppressed or already-recorded occurrences. Deletes are intentionally left to the guarded RPC or FK cascades.';

select private.advance_runtime_schema_contract('0084_timetable_occurrence_activity_guard');

commit;
