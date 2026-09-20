begin;

create table public.lesson_preparation_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  projection_id text not null check (char_length(trim(projection_id)) > 0),
  curriculum_source_handoff_footprint_hash text not null check (curriculum_source_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  curriculum_baseline_fingerprint text not null check (curriculum_baseline_fingerprint ~ '^[0-9a-f]{64}$'),
  preparation_fingerprint text not null check (preparation_fingerprint ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot->>'schemaVersion' = '1'
  ),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  constraint lesson_preparation_approvals_receipt_uq unique (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    preparation_fingerprint
  )
);

create index idx_lesson_preparation_approvals_latest
  on public.lesson_preparation_approvals(
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    approved_at desc
  );

alter table public.lesson_preparation_approvals enable row level security;

create policy lesson_preparation_approvals_select_member
  on public.lesson_preparation_approvals
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

revoke all on public.lesson_preparation_approvals from public, anon, authenticated;
grant select on public.lesson_preparation_approvals to authenticated;

create or replace function public.approve_lesson_preparation(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_canonical_plan_asset_id uuid,
  target_canonical_generation_id uuid,
  target_block_id text,
  target_projection_id text,
  target_curriculum_source_handoff_footprint_hash text,
  target_curriculum_baseline_fingerprint text,
  target_preparation_fingerprint text,
  target_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  generation_asset_id uuid;
  generation_workspace_id uuid;
  asset_workspace_id uuid;
  asset_academic_year_id uuid;
  current_curriculum record;
  receipt jsonb;
begin
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  if not exists (
    select 1
    from public.annual_plan_sections s
    where s.id = target_section_id
      and s.workspace_id = target_workspace_id
      and s.academic_year_id = target_academic_year_id
  ) then
    raise exception 'lesson preparation section is outside the active workspace/year';
  end if;

  select a.workspace_id, a.academic_year_id
    into asset_workspace_id, asset_academic_year_id
  from public.knowledge_assets a
  where a.id = target_canonical_plan_asset_id;

  select g.asset_id, g.workspace_id
    into generation_asset_id, generation_workspace_id
  from public.knowledge_processing_generations g
  where g.id = target_canonical_generation_id
    and g.status = 'SUCCEEDED';

  if asset_workspace_id is null or generation_asset_id is null then
    raise exception 'lesson preparation canonical plan source is missing';
  end if;

  if asset_workspace_id <> target_workspace_id
    or generation_workspace_id <> target_workspace_id
    or generation_asset_id <> target_canonical_plan_asset_id then
    raise exception 'lesson preparation canonical plan source is outside context';
  end if;

  if asset_academic_year_id is not null
    and asset_academic_year_id <> target_academic_year_id then
    raise exception 'lesson preparation canonical plan source belongs to a different academic year';
  end if;

  select
    a.source_handoff_footprint_hash,
    a.curriculum_state,
    a.alignment_authority,
    a.requires_revalidation_on_approval,
    a.curriculum_coverage,
    a.curricular_context
  into current_curriculum
  from public.annual_plan_curriculum_adoptions a
  where a.section_id = target_section_id
    and a.discipline_ref = 'technology'
  order by a.accepted_at desc, a.applied_at desc
  limit 1;

  if current_curriculum.source_handoff_footprint_hash is null then
    raise exception 'current Arena curriculum baseline is required before lesson approval';
  end if;

  if current_curriculum.source_handoff_footprint_hash <> target_curriculum_source_handoff_footprint_hash then
    raise exception 'Arena curriculum baseline changed; reload and revalidate before approval';
  end if;

  if current_curriculum.curriculum_state <> 'APPROVED'
    or current_curriculum.alignment_authority <> 'APPROVED_INSTITUTIONAL'
    or current_curriculum.requires_revalidation_on_approval <> false
    or coalesce(current_curriculum.curricular_context->>'completeForPlanning', 'false') <> 'true'
    or coalesce(current_curriculum.curriculum_coverage->>'status', '') <> 'SATISFIED' then
    raise exception 'current Arena curriculum baseline requires approval or teacher revalidation before lesson approval';
  end if;

  if target_projection_id is null or char_length(trim(target_projection_id)) = 0 then
    raise exception 'lesson projection id is required';
  end if;

  if target_curriculum_baseline_fingerprint !~ '^[0-9a-f]{64}$'
    or target_preparation_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'lesson preparation fingerprints are invalid';
  end if;

  if jsonb_typeof(target_snapshot) <> 'object'
    or target_snapshot->>'schemaVersion' <> '1'
    or target_snapshot#>>'{context,workspaceId}' <> target_workspace_id::text
    or target_snapshot#>>'{context,academicYearId}' <> target_academic_year_id::text
    or target_snapshot#>>'{context,sectionId}' <> target_section_id::text
    or target_snapshot#>>'{context,canonicalPlanAssetId}' <> target_canonical_plan_asset_id::text
    or target_snapshot#>>'{context,canonicalGenerationId}' <> target_canonical_generation_id::text
    or target_snapshot#>>'{context,blockId}' <> target_block_id
    or target_snapshot#>>'{context,projectionId}' <> target_projection_id
    or target_snapshot#>>'{canonicalPlan,assetId}' <> target_canonical_plan_asset_id::text
    or target_snapshot#>>'{canonicalPlan,generationId}' <> target_canonical_generation_id::text
    or target_snapshot#>>'{curriculum,sourceHandoffFootprintHash}' <> target_curriculum_source_handoff_footprint_hash
    or target_snapshot#>>'{curriculum,baselineFingerprint}' <> target_curriculum_baseline_fingerprint then
    raise exception 'lesson preparation snapshot is not bound to the approved context';
  end if;

  insert into public.lesson_preparation_approvals (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_plan_asset_id,
    canonical_generation_id,
    block_id,
    projection_id,
    curriculum_source_handoff_footprint_hash,
    curriculum_baseline_fingerprint,
    preparation_fingerprint,
    snapshot,
    approved_by
  ) values (
    target_workspace_id,
    target_academic_year_id,
    target_section_id,
    target_canonical_plan_asset_id,
    target_canonical_generation_id,
    upper(target_block_id),
    trim(target_projection_id),
    target_curriculum_source_handoff_footprint_hash,
    target_curriculum_baseline_fingerprint,
    target_preparation_fingerprint,
    target_snapshot,
    actor_id
  )
  on conflict (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    preparation_fingerprint
  ) do nothing;

  select to_jsonb(a)
    into receipt
  from public.lesson_preparation_approvals a
  where a.workspace_id = target_workspace_id
    and a.academic_year_id = target_academic_year_id
    and a.section_id = target_section_id
    and a.canonical_generation_id = target_canonical_generation_id
    and a.block_id = upper(target_block_id)
    and a.projection_id = trim(target_projection_id)
    and a.preparation_fingerprint = target_preparation_fingerprint
  order by a.approved_at desc
  limit 1;

  if receipt is null then
    raise exception 'lesson preparation approval receipt was not persisted';
  end if;

  if receipt->>'curriculum_baseline_fingerprint' <> target_curriculum_baseline_fingerprint
    or receipt->>'curriculum_source_handoff_footprint_hash' <> target_curriculum_source_handoff_footprint_hash then
    raise exception 'idempotency conflict for lesson preparation approval';
  end if;

  return receipt;
end;
$$;

revoke all on function public.approve_lesson_preparation(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.approve_lesson_preparation(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) to authenticated;

comment on table public.lesson_preparation_approvals is
  'Append-only teacher approval receipts for an exact effective lesson preparation. A receipt becomes stale by fingerprint comparison when curriculum, canonical projection, or accepted lesson design changes.';

comment on function public.approve_lesson_preparation(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) is
  'Explicit teacher boundary for Approva e procedi. Validates active workspace, canonical plan source and current Arena curriculum baseline before writing an immutable approval receipt.';

commit;
