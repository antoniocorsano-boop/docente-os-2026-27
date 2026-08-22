alter table public.timetable_slots
  add column if not exists manual_class_label text null,
  add column if not exists presence_kind text null;

alter table public.timetable_slots
  drop constraint if exists timetable_slots_slot_kind_check;

alter table public.timetable_slots
  add constraint timetable_slots_slot_kind_check
  check (slot_kind in ('LESSON','CLASS_PRESENCE','DISPOSITION','RECEPTION','OTHER'));

alter table public.timetable_slots
  drop constraint if exists timetable_slots_lesson_refs_ck;

alter table public.timetable_slots
  add constraint timetable_slots_context_ck check (
    (
      slot_kind = 'LESSON'
      and section_id is not null
      and discipline_id is not null
      and teaching_assignment_id is not null
      and manual_class_label is null
      and presence_kind is null
    )
    or (
      slot_kind = 'CLASS_PRESENCE'
      and section_id is null
      and discipline_id is null
      and teaching_assignment_id is null
      and manual_class_label is not null
      and char_length(btrim(manual_class_label)) between 1 and 12
      and presence_kind in ('SUBSTITUTION','CO_TEACHING','SUPERVISION','PROJECT','OTHER')
    )
    or (
      slot_kind in ('DISPOSITION','RECEPTION','OTHER')
      and section_id is null
      and discipline_id is null
      and teaching_assignment_id is null
      and manual_class_label is null
      and presence_kind is null
    )
  );

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
    new.manual_class_label := null;
    new.presence_kind := null;
  elsif new.slot_kind = 'CLASS_PRESENCE' then
    new.section_id := null;
    new.discipline_id := null;
    new.teaching_assignment_id := null;
    new.manual_class_label := upper(nullif(regexp_replace(btrim(coalesce(new.manual_class_label, '')), '\s+', '', 'g'), ''));
    if new.manual_class_label is null then
      raise exception 'class presence requires manual class label';
    end if;
    if new.presence_kind not in ('SUBSTITUTION','CO_TEACHING','SUPERVISION','PROJECT','OTHER') then
      raise exception 'class presence requires supported presence kind';
    end if;
  else
    new.section_id := null;
    new.discipline_id := null;
    new.teaching_assignment_id := null;
    new.manual_class_label := null;
    new.presence_kind := null;
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
