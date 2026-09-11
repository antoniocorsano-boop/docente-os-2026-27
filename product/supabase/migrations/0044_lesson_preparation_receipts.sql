create table if not exists public.lesson_preparation_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  projection_id text not null check (char_length(btrim(projection_id)) between 1 and 200),
  checklist_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist_snapshot) = 'array'),
  design_fingerprint text not null check (char_length(design_fingerprint) between 1 and 12000),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_preparation_receipts_context_uq unique (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id
  )
);

create index if not exists idx_lesson_preparation_receipts_day_lookup
  on public.lesson_preparation_receipts(workspace_id, academic_year_id, section_id, block_id, projection_id);

create or replace function private.enforce_lesson_preparation_receipt_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace_id uuid;
  section_academic_year_id uuid;
  generation_asset_id uuid;
  generation_workspace_id uuid;
begin
  select s.workspace_id, s.academic_year_id
    into section_workspace_id, section_academic_year_id
  from public.annual_plan_sections s
  where s.id = new.section_id;

  select g.asset_id, g.workspace_id
    into generation_asset_id, generation_workspace_id
  from public.knowledge_processing_generations g
  where g.id = new.canonical_generation_id
    and g.status = 'SUCCEEDED';

  if section_workspace_id is null or generation_asset_id is null then
    raise exception 'lesson preparation receipt references missing section or successful generation';
  end if;

  if section_workspace_id <> new.workspace_id
    or section_academic_year_id <> new.academic_year_id then
    raise exception 'lesson preparation receipt section is outside context';
  end if;

  if generation_workspace_id <> new.workspace_id
    or generation_asset_id <> new.canonical_plan_asset_id then
    raise exception 'lesson preparation receipt canonical source is outside context';
  end if;

  if new.confirmed_by <> auth.uid() then
    raise exception 'lesson preparation receipt must be confirmed by the current user';
  end if;

  new.projection_id := btrim(new.projection_id);
  new.design_fingerprint := btrim(new.design_fingerprint);
  new.confirmed_at := now();
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger lesson_preparation_receipts_enforce_invariants
before insert or update on public.lesson_preparation_receipts
for each row execute function private.enforce_lesson_preparation_receipt_invariants();

alter table public.lesson_preparation_receipts enable row level security;

create policy lesson_preparation_receipts_select_member
  on public.lesson_preparation_receipts
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy lesson_preparation_receipts_insert_member
  on public.lesson_preparation_receipts
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and confirmed_by = (select auth.uid())
  );

create policy lesson_preparation_receipts_update_member
  on public.lesson_preparation_receipts
  for update
  to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and confirmed_by = (select auth.uid())
  );

create policy lesson_preparation_receipts_delete_member
  on public.lesson_preparation_receipts
  for delete
  to authenticated
  using (private.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.lesson_preparation_receipts to authenticated;
revoke all on public.lesson_preparation_receipts from anon;

comment on table public.lesson_preparation_receipts is
  'Human confirmation that the current lesson projection and accepted design state were checked for preparation. Any projection/design change invalidates readiness at application level.';
