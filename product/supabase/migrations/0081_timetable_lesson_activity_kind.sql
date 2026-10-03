-- Timetable lesson activity kind: lightweight, teacher-authored classification used by the grid micro-icon.
-- Existing lesson slots default to THEORY at read time; the column stays nullable for backwards compatibility.

alter table public.timetable_slots
  add column if not exists activity_kind text;

alter table public.timetable_slots
  drop constraint if exists timetable_slots_activity_kind_ck;

alter table public.timetable_slots
  add constraint timetable_slots_activity_kind_ck check (
    activity_kind is null
    or activity_kind in ('THEORY', 'DRAWING_PROJECT', 'PRACTICAL_LAB', 'ASSESSMENT', 'OTHER')
  );

comment on column public.timetable_slots.activity_kind is
  'Teacher-authored lesson activity classification for compact timetable semantics; null outside ordinary lessons.';
