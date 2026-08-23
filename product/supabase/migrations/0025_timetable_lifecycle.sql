begin;

create unique index if not exists timetable_versions_one_active_uq
  on public.timetable_versions(workspace_id, academic_year_id)
  where status = 'ACTIVE';

create or replace function public.activate_timetable_version(p_version_id uuid)
returns table (
  active_version_id uuid,
  archived_version_id uuid,
  next_draft_version_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid;
  target public.timetable_versions%rowtype;
  previous_active public.timetable_versions%rowtype;
  next_draft_id uuid;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  select * into target
  from public.timetable_versions
  where id = p_version_id
  for update;

  if target.id is null then
    raise exception 'timetable version not found';
  end if;
  if target.status <> 'DRAFT' then
    raise exception 'only a draft timetable version can be activated';
  end if;

  select * into previous_active
  from public.timetable_versions
  where workspace_id = target.workspace_id
    and academic_year_id = target.academic_year_id
    and status = 'ACTIVE'
    and id <> target.id
  for update;

  if previous_active.id is not null then
    if target.effective_from <= previous_active.effective_from then
      raise exception 'new timetable must start after the current active timetable';
    end if;

    update public.timetable_versions
    set status = 'ARCHIVED',
        effective_to = target.effective_from - 1
    where id = previous_active.id;
  end if;

  update public.timetable_versions
  set status = 'ACTIVE',
      effective_to = null
  where id = target.id;

  insert into public.timetable_versions (
    workspace_id,
    academic_year_id,
    label,
    status,
    effective_from,
    effective_to,
    source_kind,
    source_ref,
    created_by
  ) values (
    target.workspace_id,
    target.academic_year_id,
    left(target.label || ' · prossima versione', 160),
    'DRAFT',
    target.effective_from,
    null,
    target.source_kind,
    target.source_ref,
    actor_id
  )
  returning id into next_draft_id;

  insert into public.timetable_slots (
    timetable_version_id,
    weekday,
    start_time,
    end_time,
    slot_kind,
    section_id,
    discipline_id,
    teaching_assignment_id,
    manual_class_label,
    presence_kind,
    room,
    note,
    ordinal,
    created_by
  )
  select
    next_draft_id,
    s.weekday,
    s.start_time,
    s.end_time,
    s.slot_kind,
    s.section_id,
    s.discipline_id,
    s.teaching_assignment_id,
    s.manual_class_label,
    s.presence_kind,
    s.room,
    s.note,
    s.ordinal,
    actor_id
  from public.timetable_slots s
  where s.timetable_version_id = target.id
  order by s.weekday, s.start_time, s.id;

  return query select target.id, previous_active.id, next_draft_id;
end;
$$;

revoke all on function public.activate_timetable_version(uuid) from public;
revoke all on function public.activate_timetable_version(uuid) from anon;
grant execute on function public.activate_timetable_version(uuid) to authenticated;

comment on function public.activate_timetable_version(uuid) is
  'Atomically activates one draft timetable, closes the previous active version, and creates an editable clone for future changes.';

commit;
