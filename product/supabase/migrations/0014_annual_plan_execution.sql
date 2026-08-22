create table if not exists public.annual_plan_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  grade text not null check (grade in ('PRIMA','SECONDA','TERZA')),
  section_code text not null check (section_code ~ '^[A-Z0-9-]{1,4}$'),
  status text not null default 'DA_CONFERMARE' check (status in ('PROVVISORIA','DA_CONFERMARE','CONFERMATA')),
  source_note text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  confirmed_by uuid null references auth.users(id) on delete set null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annual_plan_sections_confirmation_ck check (
    (status = 'CONFERMATA' and confirmed_by is not null and confirmed_at is not null)
    or (status <> 'CONFERMATA' and confirmed_by is null and confirmed_at is null)
  ),
  constraint annual_plan_sections_workspace_year_grade_section_uq
    unique (workspace_id, academic_year_id, grade, section_code)
);

create index if not exists idx_annual_plan_sections_workspace_year
  on public.annual_plan_sections(workspace_id, academic_year_id, grade);

create table if not exists public.annual_plan_block_progress (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  status text not null default 'PIANIFICATO' check (status in ('PIANIFICATO','SVOLTO','RECUPERATO','RIMODULATO','ANNULLATO')),
  executed_on date null,
  evidence_note text null check (evidence_note is null or char_length(evidence_note) <= 4000),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annual_plan_block_progress_section_generation_block_uq
    unique (section_id, canonical_generation_id, block_id)
);

create index if not exists idx_annual_plan_progress_section
  on public.annual_plan_block_progress(section_id, canonical_generation_id, block_id);

create or replace function private.enforce_annual_plan_section_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.grade <> old.grade
      or new.section_code <> old.section_code then
      raise exception 'annual plan section identity is immutable';
    end if;
    if new.created_by <> old.created_by then
      raise exception 'annual plan section created_by is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  if new.status = 'CONFERMATA' then
    if tg_op = 'INSERT' or old.status is distinct from 'CONFERMATA' then
      new.confirmed_by := auth.uid();
      new.confirmed_at := now();
    end if;
  else
    new.confirmed_by := null;
    new.confirmed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger annual_plan_sections_enforce_invariants
before insert or update on public.annual_plan_sections
for each row execute function private.enforce_annual_plan_section_invariants();

create or replace function private.enforce_annual_plan_progress_invariants()
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
  if tg_op = 'UPDATE' then
    if new.section_id <> old.section_id
      or new.canonical_plan_asset_id <> old.canonical_plan_asset_id
      or new.canonical_generation_id <> old.canonical_generation_id
      or new.block_id <> old.block_id then
      raise exception 'annual plan progress identity is immutable';
    end if;
    new.created_at := old.created_at;
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
    raise exception 'annual plan progress references missing section, asset, or successful generation';
  end if;

  if section_workspace_id <> asset_workspace_id
    or section_workspace_id <> generation_workspace_id
    or generation_asset_id <> new.canonical_plan_asset_id then
    raise exception 'annual plan progress canonical source does not belong to section workspace/asset';
  end if;

  if asset_academic_year_id is not null and asset_academic_year_id <> section_academic_year_id then
    raise exception 'annual plan progress canonical source belongs to a different academic year';
  end if;

  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger annual_plan_progress_enforce_invariants
before insert or update on public.annual_plan_block_progress
for each row execute function private.enforce_annual_plan_progress_invariants();

alter table public.annual_plan_sections enable row level security;
alter table public.annual_plan_block_progress enable row level security;

create policy annual_plan_sections_select_member
  on public.annual_plan_sections
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy annual_plan_sections_insert_member
  on public.annual_plan_sections
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.academic_years ay
      where ay.id = academic_year_id
        and ay.workspace_id = annual_plan_sections.workspace_id
    )
  );

create policy annual_plan_sections_update_member
  on public.annual_plan_sections
  for update
  to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.academic_years ay
      where ay.id = academic_year_id
        and ay.workspace_id = annual_plan_sections.workspace_id
    )
  );

create policy annual_plan_progress_select_member
  on public.annual_plan_block_progress
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  );

create policy annual_plan_progress_insert_member
  on public.annual_plan_block_progress
  for insert
  to authenticated
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  );

create policy annual_plan_progress_update_member
  on public.annual_plan_block_progress
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  )
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  );

create policy annual_plan_progress_delete_member
  on public.annual_plan_block_progress
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  );

grant select, insert, update on public.annual_plan_sections to authenticated;
grant select, insert, update, delete on public.annual_plan_block_progress to authenticated;
revoke all on public.annual_plan_sections from anon;
revoke all on public.annual_plan_block_progress from anon;

comment on table public.annual_plan_sections is
  'Concrete class/section execution contexts for a canonical annual teaching plan.';
comment on table public.annual_plan_block_progress is
  'Execution state for B01-B33, pinned to the canonical plan asset and successful KB generation used at the time.';
