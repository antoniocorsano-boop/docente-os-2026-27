alter table public.lesson_design_extensions
  add column if not exists revision integer not null default 1,
  add column if not exists decision_history jsonb not null default '[]'::jsonb,
  add column if not exists modified_by uuid null references auth.users(id) on delete set null,
  add column if not exists modified_at timestamptz null,
  add column if not exists dismissed_by uuid null references auth.users(id) on delete set null,
  add column if not exists dismissed_at timestamptz null;

update public.lesson_design_extensions
set decision_history = jsonb_build_array(
  jsonb_build_object(
    'action', 'ACCEPTED',
    'actorId', accepted_by::text,
    'at', accepted_at,
    'revision', revision
  )
)
where status = 'ACCEPTED'
  and accepted_by is not null
  and accepted_at is not null
  and decision_history = '[]'::jsonb;

alter table public.lesson_design_extensions
  drop constraint if exists lesson_design_extensions_status_check,
  drop constraint if exists lesson_design_extension_acceptance_ck,
  drop constraint if exists lesson_design_extension_lifecycle_ck,
  drop constraint if exists lesson_design_extension_revision_ck,
  drop constraint if exists lesson_design_extension_history_ck;

alter table public.lesson_design_extensions
  add constraint lesson_design_extensions_status_check
    check (status in ('PROPOSED', 'MODIFIED', 'ACCEPTED', 'DISMISSED')),
  add constraint lesson_design_extension_revision_ck
    check (revision >= 1),
  add constraint lesson_design_extension_history_ck
    check (jsonb_typeof(decision_history) = 'array'),
  add constraint lesson_design_extension_lifecycle_ck check (
    (
      status = 'PROPOSED'
      and revision = 1
      and modified_by is null and modified_at is null
      and accepted_by is null and accepted_at is null
      and dismissed_by is null and dismissed_at is null
    )
    or (
      status = 'MODIFIED'
      and revision >= 2
      and modified_by is not null and modified_at is not null
      and accepted_by is null and accepted_at is null
      and dismissed_by is null and dismissed_at is null
    )
    or (
      status = 'ACCEPTED'
      and accepted_by is not null and accepted_at is not null
      and dismissed_by is null and dismissed_at is null
    )
    or (
      status = 'DISMISSED'
      and dismissed_by is not null and dismissed_at is not null
    )
  );

create or replace function private.enforce_lesson_design_extension_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace_id uuid;
  section_academic_year_id uuid;
  asset_workspace_id uuid;
  asset_academic_year_id uuid;
  generation_asset_id uuid;
  generation_workspace_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'PROPOSED' then
      raise exception 'lesson design extension must be inserted as PROPOSED';
    end if;
    new.revision := 1;
    new.decision_history := '[]'::jsonb;
    new.modified_by := null;
    new.modified_at := null;
    new.accepted_by := null;
    new.accepted_at := null;
    new.dismissed_by := null;
    new.dismissed_at := null;
  else
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.section_id <> old.section_id
      or new.canonical_plan_asset_id <> old.canonical_plan_asset_id
      or new.canonical_generation_id <> old.canonical_generation_id
      or new.block_id <> old.block_id
      or new.projection_id <> old.projection_id
      or new.kind <> old.kind
      or new.source_kind <> old.source_kind
      or new.source_ref is distinct from old.source_ref
      or new.source_label is distinct from old.source_label
      or new.payload <> old.payload
      or new.created_by <> old.created_by
      or new.created_at <> old.created_at then
      raise exception 'lesson design extension provenance is immutable';
    end if;

    if old.status = 'DISMISSED' then
      raise exception 'dismissed lesson design extension is immutable';
    end if;

    if jsonb_typeof(new.decision_history) <> 'array'
      or jsonb_array_length(new.decision_history) <> jsonb_array_length(old.decision_history) + 1 then
      raise exception 'lesson design extension decision history must append exactly one decision';
    end if;

    if new.status = 'MODIFIED' then
      if old.status not in ('PROPOSED', 'MODIFIED', 'ACCEPTED') then
        raise exception 'lesson design extension cannot be modified from current state';
      end if;
      if new.revision <> old.revision + 1
        or new.modified_by is null
        or new.modified_at is null
        or new.accepted_by is not null
        or new.accepted_at is not null
        or new.dismissed_by is not null
        or new.dismissed_at is not null then
        raise exception 'lesson design extension modification metadata is invalid';
      end if;
      if new.decision_history -> -1 ->> 'action' <> 'MODIFIED'
        or new.decision_history -> -1 ->> 'actorId' <> new.modified_by::text
        or (new.decision_history -> -1 ->> 'revision')::integer <> new.revision then
        raise exception 'lesson design extension modification history is invalid';
      end if;
    elsif new.status = 'ACCEPTED' then
      if old.status not in ('PROPOSED', 'MODIFIED') then
        raise exception 'lesson design extension cannot be accepted from current state';
      end if;
      if new.revision <> old.revision
        or new.insertion_position <> old.insertion_position
        or new.anchor_step_id is distinct from old.anchor_step_id
        or new.title <> old.title
        or new.body <> old.body
        or new.cue is distinct from old.cue
        or new.minutes is distinct from old.minutes
        or new.modified_by is distinct from old.modified_by
        or new.modified_at is distinct from old.modified_at
        or new.accepted_by is null
        or new.accepted_at is null
        or new.dismissed_by is not null
        or new.dismissed_at is not null then
        raise exception 'lesson design extension acceptance metadata is invalid';
      end if;
      if new.decision_history -> -1 ->> 'action' <> 'ACCEPTED'
        or new.decision_history -> -1 ->> 'actorId' <> new.accepted_by::text
        or (new.decision_history -> -1 ->> 'revision')::integer <> new.revision then
        raise exception 'lesson design extension acceptance history is invalid';
      end if;
    elsif new.status = 'DISMISSED' then
      if new.revision <> old.revision
        or new.insertion_position <> old.insertion_position
        or new.anchor_step_id is distinct from old.anchor_step_id
        or new.title <> old.title
        or new.body <> old.body
        or new.cue is distinct from old.cue
        or new.minutes is distinct from old.minutes
        or new.modified_by is distinct from old.modified_by
        or new.modified_at is distinct from old.modified_at
        or new.accepted_by is distinct from old.accepted_by
        or new.accepted_at is distinct from old.accepted_at
        or new.dismissed_by is null
        or new.dismissed_at is null then
        raise exception 'lesson design extension dismissal metadata is invalid';
      end if;
      if new.decision_history -> -1 ->> 'action' <> 'DISMISSED'
        or new.decision_history -> -1 ->> 'actorId' <> new.dismissed_by::text
        or (new.decision_history -> -1 ->> 'revision')::integer <> new.revision then
        raise exception 'lesson design extension dismissal history is invalid';
      end if;
    else
      raise exception 'lesson design extension update requires an explicit lifecycle decision';
    end if;
  end if;

  select s.workspace_id, s.academic_year_id
    into section_workspace_id, section_academic_year_id
  from public.annual_plan_sections s
  where s.id = new.section_id;

  select a.workspace_id, a.academic_year_id
    into asset_workspace_id, asset_academic_year_id
  from public.knowledge_assets a
  where a.id = new.canonical_plan_asset_id;

  select g.asset_id, g.workspace_id
    into generation_asset_id, generation_workspace_id
  from public.knowledge_processing_generations g
  where g.id = new.canonical_generation_id
    and g.status = 'SUCCEEDED';

  if section_workspace_id is null
    or asset_workspace_id is null
    or generation_asset_id is null then
    raise exception 'lesson design extension references missing section, asset, or successful generation';
  end if;

  if section_workspace_id <> new.workspace_id
    or section_academic_year_id <> new.academic_year_id then
    raise exception 'lesson design extension section is outside context';
  end if;

  if asset_workspace_id <> new.workspace_id
    or generation_workspace_id <> new.workspace_id
    or generation_asset_id <> new.canonical_plan_asset_id then
    raise exception 'lesson design extension canonical source is outside context';
  end if;

  if asset_academic_year_id is not null and asset_academic_year_id <> new.academic_year_id then
    raise exception 'lesson design extension canonical source belongs to a different academic year';
  end if;

  new.projection_id := btrim(new.projection_id);
  new.title := btrim(new.title);
  new.body := btrim(new.body);
  new.cue := nullif(btrim(coalesce(new.cue, '')), '');
  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  new.source_label := nullif(btrim(coalesce(new.source_label, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.accept_lesson_design_extension(target_extension_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_workspace_id uuid;
  target_status text;
  target_revision integer;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  select e.workspace_id, e.status, e.revision
    into target_workspace_id, target_status, target_revision
  from public.lesson_design_extensions e
  where e.id = target_extension_id;

  if target_workspace_id is null then
    raise exception 'lesson design extension not found';
  end if;
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'lesson design extension is outside caller workspace';
  end if;
  if target_status = 'ACCEPTED' then
    return;
  end if;
  if target_status not in ('PROPOSED', 'MODIFIED') then
    raise exception 'lesson design extension is not pending acceptance';
  end if;

  update public.lesson_design_extensions
  set
    status = 'ACCEPTED',
    accepted_by = caller_id,
    accepted_at = now(),
    dismissed_by = null,
    dismissed_at = null,
    decision_history = decision_history || jsonb_build_array(
      jsonb_build_object(
        'action', 'ACCEPTED',
        'actorId', caller_id::text,
        'at', now(),
        'revision', target_revision
      )
    )
  where id = target_extension_id
    and status in ('PROPOSED', 'MODIFIED');
end;
$$;

create or replace function public.revise_lesson_design_extension(
  target_extension_id uuid,
  new_insertion_position text,
  new_anchor_step_id text,
  new_title text,
  new_body text,
  new_cue text,
  new_minutes integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_workspace_id uuid;
  target_status text;
  next_revision integer;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  select e.workspace_id, e.status, e.revision + 1
    into target_workspace_id, target_status, next_revision
  from public.lesson_design_extensions e
  where e.id = target_extension_id;

  if target_workspace_id is null then
    raise exception 'lesson design extension not found';
  end if;
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'lesson design extension is outside caller workspace';
  end if;
  if target_status = 'DISMISSED' then
    raise exception 'dismissed lesson design extension is immutable';
  end if;

  update public.lesson_design_extensions
  set
    status = 'MODIFIED',
    insertion_position = new_insertion_position,
    anchor_step_id = new_anchor_step_id,
    title = new_title,
    body = new_body,
    cue = new_cue,
    minutes = new_minutes,
    revision = next_revision,
    modified_by = caller_id,
    modified_at = now(),
    accepted_by = null,
    accepted_at = null,
    dismissed_by = null,
    dismissed_at = null,
    decision_history = decision_history || jsonb_build_array(
      jsonb_build_object(
        'action', 'MODIFIED',
        'actorId', caller_id::text,
        'at', now(),
        'revision', next_revision
      )
    )
  where id = target_extension_id
    and status in ('PROPOSED', 'MODIFIED', 'ACCEPTED');
end;
$$;

create or replace function public.dismiss_lesson_design_extension(target_extension_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_workspace_id uuid;
  target_status text;
  target_revision integer;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  select e.workspace_id, e.status, e.revision
    into target_workspace_id, target_status, target_revision
  from public.lesson_design_extensions e
  where e.id = target_extension_id;

  if target_workspace_id is null then
    raise exception 'lesson design extension not found';
  end if;
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'lesson design extension is outside caller workspace';
  end if;
  if target_status = 'DISMISSED' then
    return;
  end if;

  update public.lesson_design_extensions
  set
    status = 'DISMISSED',
    dismissed_by = caller_id,
    dismissed_at = now(),
    decision_history = decision_history || jsonb_build_array(
      jsonb_build_object(
        'action', 'DISMISSED',
        'actorId', caller_id::text,
        'at', now(),
        'revision', target_revision
      )
    )
  where id = target_extension_id
    and status <> 'DISMISSED';
end;
$$;

drop policy if exists lesson_design_extensions_delete_member on public.lesson_design_extensions;
revoke delete on public.lesson_design_extensions from authenticated;

revoke all on function public.accept_lesson_design_extension(uuid) from public;
revoke all on function public.accept_lesson_design_extension(uuid) from anon;
grant execute on function public.accept_lesson_design_extension(uuid) to authenticated;

revoke all on function public.revise_lesson_design_extension(uuid, text, text, text, text, text, integer) from public;
revoke all on function public.revise_lesson_design_extension(uuid, text, text, text, text, text, integer) from anon;
grant execute on function public.revise_lesson_design_extension(uuid, text, text, text, text, text, integer) to authenticated;

revoke all on function public.dismiss_lesson_design_extension(uuid) from public;
revoke all on function public.dismiss_lesson_design_extension(uuid) from anon;
grant execute on function public.dismiss_lesson_design_extension(uuid) to authenticated;

comment on function public.accept_lesson_design_extension(uuid) is
  'Idempotent explicit human acceptance boundary. Only PROPOSED or MODIFIED lesson additions become effective.';
comment on function public.revise_lesson_design_extension(uuid, text, text, text, text, text, integer) is
  'Teacher revision boundary. Preserves proposal provenance, increments revision, and requires re-acceptance before use.';
comment on function public.dismiss_lesson_design_extension(uuid) is
  'Idempotent dismissal boundary. Preserves the proposal and its decision history while removing it from the effective lesson.';
