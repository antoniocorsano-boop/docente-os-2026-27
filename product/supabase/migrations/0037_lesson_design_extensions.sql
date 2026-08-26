create table if not exists public.lesson_design_extensions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  projection_id text not null check (char_length(btrim(projection_id)) between 1 and 200),
  kind text not null check (kind in (
    'HOOK_QUOTE',
    'HOOK_EVENT',
    'HOOK_VIDEO',
    'HOOK_QUESTION',
    'TEACHER_RESOURCE',
    'STUDENT_RESOURCE',
    'FORMATIVE_CHECK'
  )),
  status text not null default 'PROPOSED' check (status in ('PROPOSED', 'ACCEPTED')),
  insertion_position text not null check (insertion_position in ('START', 'BEFORE_STEP', 'AFTER_STEP', 'END')),
  anchor_step_id text null check (anchor_step_id is null or anchor_step_id ~ '^S[0-9]{2,3}$'),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  cue text null check (cue is null or char_length(cue) <= 1000),
  minutes integer null check (minutes is null or minutes between 1 and 120),
  source_kind text not null check (source_kind in ('EDITORIAL_KNOWLEDGE', 'KNOWLEDGE', 'WEB', 'AI_TOOL', 'TEACHER')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  source_label text null check (source_label is null or char_length(source_label) <= 300),
  payload jsonb not null default '{}'::jsonb,
  accepted_by uuid null references auth.users(id) on delete set null,
  accepted_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_design_extension_anchor_ck check (
    (insertion_position in ('BEFORE_STEP', 'AFTER_STEP') and anchor_step_id is not null)
    or (insertion_position in ('START', 'END') and anchor_step_id is null)
  ),
  constraint lesson_design_extension_acceptance_ck check (
    (status = 'ACCEPTED' and accepted_by is not null and accepted_at is not null)
    or (status = 'PROPOSED' and accepted_by is null and accepted_at is null)
  )
);

create index if not exists idx_lesson_design_extensions_context
  on public.lesson_design_extensions(section_id, canonical_generation_id, block_id, projection_id, status, created_at);

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
    new.accepted_by := null;
    new.accepted_at := null;
  else
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.section_id <> old.section_id
      or new.canonical_plan_asset_id <> old.canonical_plan_asset_id
      or new.canonical_generation_id <> old.canonical_generation_id
      or new.block_id <> old.block_id
      or new.projection_id <> old.projection_id
      or new.kind <> old.kind
      or new.insertion_position <> old.insertion_position
      or new.anchor_step_id is distinct from old.anchor_step_id
      or new.title <> old.title
      or new.body <> old.body
      or new.cue is distinct from old.cue
      or new.minutes is distinct from old.minutes
      or new.source_kind <> old.source_kind
      or new.source_ref is distinct from old.source_ref
      or new.source_label is distinct from old.source_label
      or new.payload <> old.payload
      or new.created_by <> old.created_by then
      raise exception 'lesson design extension proposal is immutable';
    end if;
    new.created_at := old.created_at;

    if old.status = 'ACCEPTED' and new.status <> 'ACCEPTED' then
      raise exception 'accepted lesson design extension cannot return to PROPOSED';
    end if;
    if old.status = 'PROPOSED' and new.status = 'PROPOSED' then
      new.accepted_by := null;
      new.accepted_at := null;
    elsif old.status = 'PROPOSED' and new.status = 'ACCEPTED' then
      if new.accepted_by is null or new.accepted_at is null then
        raise exception 'lesson design extension acceptance requires actor and timestamp';
      end if;
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

create trigger lesson_design_extensions_enforce_invariants
before insert or update on public.lesson_design_extensions
for each row execute function private.enforce_lesson_design_extension_invariants();

create or replace function public.accept_lesson_design_extension(target_extension_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_workspace_id uuid;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  select e.workspace_id
    into target_workspace_id
  from public.lesson_design_extensions e
  where e.id = target_extension_id;

  if target_workspace_id is null then
    raise exception 'lesson design extension not found';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'lesson design extension is outside caller workspace';
  end if;

  update public.lesson_design_extensions
  set
    status = 'ACCEPTED',
    accepted_by = caller_id,
    accepted_at = now()
  where id = target_extension_id
    and status = 'PROPOSED';

  if not found then
    raise exception 'lesson design extension is not pending acceptance';
  end if;
end;
$$;

alter table public.lesson_design_extensions enable row level security;

create policy lesson_design_extensions_select_member
  on public.lesson_design_extensions
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy lesson_design_extensions_insert_member
  on public.lesson_design_extensions
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
    and status = 'PROPOSED'
  );

create policy lesson_design_extensions_delete_member
  on public.lesson_design_extensions
  for delete
  to authenticated
  using (private.is_workspace_member(workspace_id));

grant select, insert, delete on public.lesson_design_extensions to authenticated;
revoke update on public.lesson_design_extensions from authenticated;
revoke all on public.lesson_design_extensions from anon;

revoke all on function public.accept_lesson_design_extension(uuid) from public;
revoke all on function public.accept_lesson_design_extension(uuid) from anon;
grant execute on function public.accept_lesson_design_extension(uuid) to authenticated;

comment on table public.lesson_design_extensions is
  'Teacher-reviewed additions layered on a canonical Human Task lesson projection. The canonical projection is never rewritten.';
comment on function public.accept_lesson_design_extension(uuid) is
  'Explicit human acceptance boundary: only PROPOSED lesson additions can enter the effective teaching sequence.';
