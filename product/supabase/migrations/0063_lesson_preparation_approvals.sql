begin;

-- Reconcile the already deployed lesson-preparation receipt contract with the
-- teacher-first exact-state approval boundary. Fresh databases create the
-- canonical table here; existing databases are upgraded in place.
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
  updated_at timestamptz not null default now()
);

alter table public.lesson_preparation_receipts
  add column if not exists curriculum_source_handoff_footprint_hash text,
  add column if not exists curriculum_baseline_fingerprint text,
  add column if not exists preparation_fingerprint text,
  add column if not exists approval_snapshot jsonb;

alter table public.lesson_preparation_receipts
  drop constraint if exists lesson_preparation_receipts_context_uq,
  drop constraint if exists lesson_preparation_receipts_approval_fields_check,
  drop constraint if exists lesson_preparation_receipts_approval_snapshot_check;

alter table public.lesson_preparation_receipts
  add constraint lesson_preparation_receipts_approval_fields_check check (
    (
      preparation_fingerprint is null
      and curriculum_source_handoff_footprint_hash is null
      and curriculum_baseline_fingerprint is null
      and approval_snapshot is null
    )
    or
    (
      preparation_fingerprint ~ '^[0-9a-f]{64}$'
      and curriculum_source_handoff_footprint_hash ~ '^[0-9a-f]{8}$'
      and curriculum_baseline_fingerprint ~ '^[0-9a-f]{64}$'
      and approval_snapshot is not null
    )
  ),
  add constraint lesson_preparation_receipts_approval_snapshot_check check (
    approval_snapshot is null
    or (
      jsonb_typeof(approval_snapshot) = 'object'
      and approval_snapshot->>'schemaVersion' = '1'
    )
  );

drop index if exists public.lesson_preparation_receipts_receipt_uq;
create unique index lesson_preparation_receipts_receipt_uq
  on public.lesson_preparation_receipts(
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    preparation_fingerprint
  )
  where preparation_fingerprint is not null;

drop index if exists public.idx_lesson_preparation_receipts_latest;
create index idx_lesson_preparation_receipts_latest
  on public.lesson_preparation_receipts(
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    confirmed_at desc
  );

drop trigger if exists lesson_preparation_receipts_enforce_invariants
  on public.lesson_preparation_receipts;
drop function if exists private.enforce_lesson_preparation_receipt_invariants();

create or replace function private.validate_lesson_preparation_receipt_insert()
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

  if not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = new.workspace_id
      and membership.user_id = new.confirmed_by
  ) then
    raise exception 'lesson preparation receipt confirmer is outside workspace';
  end if;

  if new.preparation_fingerprint is null
    or new.curriculum_source_handoff_footprint_hash is null
    or new.curriculum_baseline_fingerprint is null
    or new.approval_snapshot is null then
    raise exception 'exact-state approval fields are required for new lesson preparation receipts';
  end if;

  if new.design_fingerprint <> new.preparation_fingerprint then
    raise exception 'legacy design fingerprint must mirror exact preparation fingerprint';
  end if;

  if new.approval_snapshot#>>'{context,workspaceId}' <> new.workspace_id::text
    or new.approval_snapshot#>>'{context,academicYearId}' <> new.academic_year_id::text
    or new.approval_snapshot#>>'{context,sectionId}' <> new.section_id::text
    or new.approval_snapshot#>>'{context,canonicalPlanAssetId}' <> new.canonical_plan_asset_id::text
    or new.approval_snapshot#>>'{context,canonicalGenerationId}' <> new.canonical_generation_id::text
    or new.approval_snapshot#>>'{context,blockId}' <> new.block_id
    or new.approval_snapshot#>>'{context,projectionId}' <> new.projection_id
    or new.approval_snapshot#>>'{curriculum,sourceHandoffFootprintHash}' <> new.curriculum_source_handoff_footprint_hash
    or new.approval_snapshot#>>'{curriculum,baselineFingerprint}' <> new.curriculum_baseline_fingerprint then
    raise exception 'lesson preparation receipt snapshot is outside exact approved context';
  end if;

  new.projection_id := btrim(new.projection_id);
  new.design_fingerprint := btrim(new.design_fingerprint);
  new.confirmed_at := coalesce(new.confirmed_at, now());
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := new.created_at;
  return new;
end;
$$;

create or replace function private.prevent_lesson_preparation_receipt_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'lesson preparation receipts are append-only';
end;
$$;

drop trigger if exists lesson_preparation_receipts_validate_insert
  on public.lesson_preparation_receipts;
create trigger lesson_preparation_receipts_validate_insert
before insert on public.lesson_preparation_receipts
for each row execute function private.validate_lesson_preparation_receipt_insert();

drop trigger if exists lesson_preparation_receipts_append_only
  on public.lesson_preparation_receipts;
create trigger lesson_preparation_receipts_append_only
before update or delete on public.lesson_preparation_receipts
for each row execute function private.prevent_lesson_preparation_receipt_mutation();

alter table public.lesson_preparation_receipts enable row level security;

drop policy if exists lesson_preparation_receipts_insert_member
  on public.lesson_preparation_receipts;
drop policy if exists lesson_preparation_receipts_update_member
  on public.lesson_preparation_receipts;
drop policy if exists lesson_preparation_receipts_delete_member
  on public.lesson_preparation_receipts;
drop policy if exists lesson_preparation_receipts_select_member
  on public.lesson_preparation_receipts;

create policy lesson_preparation_receipts_select_member
  on public.lesson_preparation_receipts
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

revoke all on public.lesson_preparation_receipts from public, anon, authenticated, service_role;
grant select on public.lesson_preparation_receipts to authenticated;
grant select, insert on public.lesson_preparation_receipts to service_role;

comment on table public.lesson_preparation_receipts is
  'Canonical append-only teacher approval receipts for an exact effective lesson preparation. Authenticated clients may read workspace receipts only; server-side persistence derives and validates exact-state evidence before insert.';

commit;
