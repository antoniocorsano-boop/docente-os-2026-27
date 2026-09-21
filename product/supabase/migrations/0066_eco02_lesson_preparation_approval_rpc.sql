create table if not exists private.eco02_lesson_preparation_scopes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null,
  projection_id text not null,
  curriculum_handoff_footprint_hash text not null check (curriculum_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  allowed_projection jsonb not null check (jsonb_typeof(allowed_projection) = 'object'),
  enabled boolean not null default true,
  configured_at timestamptz not null default now(),
  primary key (section_id, block_id, projection_id)
);

revoke all on private.eco02_lesson_preparation_scopes from public, anon, authenticated;

create or replace function public.persist_eco02_lesson_preparation_receipt(
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
  target_approval_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  configured_scope private.eco02_lesson_preparation_scopes%rowtype;
  section_workspace_id uuid;
  section_academic_year_id uuid;
  asset_workspace_id uuid;
  asset_academic_year_id uuid;
  generation_asset_id uuid;
  generation_workspace_id uuid;
  current_curriculum public.annual_plan_curriculum_adoptions%rowtype;
  existing_row public.lesson_preparation_receipts%rowtype;
  accepted_extensions jsonb;
  accepted_extension_count integer;
  candidate jsonb;
  checklist jsonb;
begin
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  select *
    into configured_scope
  from private.eco02_lesson_preparation_scopes s
  where s.workspace_id = target_workspace_id
    and s.academic_year_id = target_academic_year_id
    and s.section_id = target_section_id
    and s.canonical_plan_asset_id = target_canonical_plan_asset_id
    and s.canonical_generation_id = target_canonical_generation_id
    and s.block_id = target_block_id
    and s.projection_id = target_projection_id
    and s.curriculum_handoff_footprint_hash = target_curriculum_source_handoff_footprint_hash
    and s.enabled = true;

  if configured_scope.section_id is null then
    raise exception 'ECO-02 lesson preparation scope is not enabled';
  end if;

  select s.workspace_id, s.academic_year_id
    into section_workspace_id, section_academic_year_id
  from public.annual_plan_sections s
  where s.id = target_section_id;

  if section_workspace_id <> target_workspace_id
    or section_academic_year_id <> target_academic_year_id then
    raise exception 'lesson preparation section is outside configured context';
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
    raise exception 'lesson preparation canonical source is missing or not current';
  end if;

  if asset_workspace_id <> target_workspace_id
    or generation_workspace_id <> target_workspace_id
    or generation_asset_id <> target_canonical_plan_asset_id
    or (asset_academic_year_id is not null and asset_academic_year_id <> target_academic_year_id) then
    raise exception 'lesson preparation canonical source is outside configured context';
  end if;

  if target_curriculum_baseline_fingerprint !~ '^[0-9a-f]{64}$'
    or target_preparation_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'lesson preparation fingerprints are invalid';
  end if;

  if jsonb_typeof(target_approval_snapshot) <> 'object'
    or target_approval_snapshot->>'schemaVersion' <> '1' then
    raise exception 'lesson preparation approval snapshot is invalid';
  end if;

  if target_approval_snapshot#>>'{context,workspaceId}' <> target_workspace_id::text
    or target_approval_snapshot#>>'{context,academicYearId}' <> target_academic_year_id::text
    or target_approval_snapshot#>>'{context,sectionId}' <> target_section_id::text
    or target_approval_snapshot#>>'{context,canonicalPlanAssetId}' <> target_canonical_plan_asset_id::text
    or target_approval_snapshot#>>'{context,canonicalGenerationId}' <> target_canonical_generation_id::text
    or target_approval_snapshot#>>'{context,blockId}' <> target_block_id
    or target_approval_snapshot#>>'{context,projectionId}' <> target_projection_id
    or target_approval_snapshot#>>'{canonicalPlan,assetId}' <> target_canonical_plan_asset_id::text
    or target_approval_snapshot#>>'{canonicalPlan,generationId}' <> target_canonical_generation_id::text then
    raise exception 'lesson preparation approval snapshot is outside configured context';
  end if;

  if target_approval_snapshot#>'{lesson,projection}' <> configured_scope.allowed_projection then
    raise exception 'lesson projection does not match the configured ECO-02 pilot projection';
  end if;

  select *
    into current_curriculum
  from public.annual_plan_curriculum_adoptions a
  where a.section_id = target_section_id
    and a.discipline_ref = 'technology'
    and a.authority_quarantined_at is null
  order by a.accepted_at desc, a.applied_at desc
  limit 1;

  if current_curriculum.id is null then
    raise exception 'current Arena curriculum baseline is required before lesson approval';
  end if;

  if current_curriculum.source_handoff_footprint_hash <> target_curriculum_source_handoff_footprint_hash
    or current_curriculum.curriculum_state <> 'PROVISIONAL_COMPLETE'
    or current_curriculum.alignment_authority <> 'PROVISIONAL_BASELINE'
    or current_curriculum.requires_revalidation_on_approval is not true
    or current_curriculum.curriculum_coverage->>'status' <> 'SATISFIED'
    or current_curriculum.curriculum_coverage->>'authority' <> 'PROVISIONAL_BASELINE'
    or coalesce((current_curriculum.curriculum_coverage->>'requiresRevalidationOnApproval')::boolean, false) is not true
    or coalesce((current_curriculum.curricular_context->>'completeForPlanning')::boolean, false) is not true
    or coalesce((current_curriculum.curricular_context#>>'{transitionRemodulation,usableForPlanning}')::boolean, false) is not true then
    raise exception 'current Arena curriculum baseline is not ready for provisional lesson approval';
  end if;

  if target_approval_snapshot#>>'{curriculum,baselineFingerprint}' <> target_curriculum_baseline_fingerprint
    or target_approval_snapshot#>>'{curriculum,curriculumState}' <> current_curriculum.curriculum_state
    or target_approval_snapshot#>>'{curriculum,alignmentAuthority}' <> current_curriculum.alignment_authority
    or (target_approval_snapshot#>>'{curriculum,acceptedAt}')::timestamptz <> current_curriculum.accepted_at
    or target_approval_snapshot#>>'{curriculum,sourceHandoffFootprintHash}' <> current_curriculum.source_handoff_footprint_hash
    or target_approval_snapshot#>'{curriculum,curricularContext}' <> current_curriculum.curricular_context
    or target_approval_snapshot#>'{curriculum,curriculumCoverage}' <> current_curriculum.curriculum_coverage
    or target_approval_snapshot#>'{curriculum,reviewedFramework}' <> current_curriculum.reviewed_framework then
    raise exception 'lesson preparation curriculum snapshot is stale or inconsistent';
  end if;

  accepted_extensions := coalesce(target_approval_snapshot#>'{lesson,acceptedExtensions}', '[]'::jsonb);
  if jsonb_typeof(accepted_extensions) <> 'array' then
    raise exception 'lesson preparation accepted extensions snapshot is invalid';
  end if;

  select count(*)
    into accepted_extension_count
  from public.lesson_design_extensions e
  where e.workspace_id = target_workspace_id
    and e.academic_year_id = target_academic_year_id
    and e.section_id = target_section_id
    and e.canonical_plan_asset_id = target_canonical_plan_asset_id
    and e.canonical_generation_id = target_canonical_generation_id
    and e.block_id = target_block_id
    and e.projection_id = target_projection_id
    and e.status = 'ACCEPTED';

  if jsonb_array_length(accepted_extensions) <> accepted_extension_count then
    raise exception 'accepted lesson design extensions changed; reload before approval';
  end if;

  if (
    select count(distinct item->>'id')
    from jsonb_array_elements(accepted_extensions) item
  ) <> jsonb_array_length(accepted_extensions) then
    raise exception 'accepted lesson design extension snapshot contains duplicates';
  end if;

  for candidate in
    select value
    from jsonb_array_elements(accepted_extensions)
  loop
    if not exists (
      select 1
      from public.lesson_design_extensions e
      where e.id::text = candidate->>'id'
        and e.workspace_id = target_workspace_id
        and e.academic_year_id = target_academic_year_id
        and e.section_id = target_section_id
        and e.canonical_plan_asset_id = target_canonical_plan_asset_id
        and e.canonical_generation_id = target_canonical_generation_id
        and e.block_id = target_block_id
        and e.projection_id = target_projection_id
        and e.status = 'ACCEPTED'
        and e.revision = (candidate->>'revision')::integer
        and e.kind = candidate->>'kind'
        and e.insertion_position = candidate->>'insertionPosition'
        and e.anchor_step_id is not distinct from candidate->>'anchorStepId'
        and e.title = candidate->>'title'
        and e.body = candidate->>'body'
        and e.cue is not distinct from candidate->>'cue'
        and e.minutes is not distinct from (candidate->>'minutes')::integer
        and e.source_kind = candidate->>'sourceKind'
        and e.source_ref is not distinct from candidate->>'sourceRef'
        and e.source_label is not distinct from candidate->>'sourceLabel'
        and e.payload = coalesce(candidate->'payload', '{}'::jsonb)
        and e.accepted_by::text = candidate->>'acceptedBy'
        and e.accepted_at = (candidate->>'acceptedAt')::timestamptz
    ) then
      raise exception 'accepted lesson design extension changed; reload before approval';
    end if;
  end loop;

  select *
    into existing_row
  from public.lesson_preparation_receipts r
  where r.workspace_id = target_workspace_id
    and r.academic_year_id = target_academic_year_id
    and r.section_id = target_section_id
    and r.canonical_generation_id = target_canonical_generation_id
    and r.block_id = target_block_id
    and r.projection_id = target_projection_id
    and r.preparation_fingerprint = target_preparation_fingerprint
  limit 1;

  if existing_row.id is not null then
    if existing_row.curriculum_baseline_fingerprint <> target_curriculum_baseline_fingerprint
      or existing_row.curriculum_source_handoff_footprint_hash <> target_curriculum_source_handoff_footprint_hash
      or existing_row.approval_snapshot <> target_approval_snapshot then
      raise exception 'idempotency conflict for lesson preparation approval';
    end if;
    return to_jsonb(existing_row);
  end if;

  checklist := jsonb_build_array(
    jsonb_build_object(
      'key', 'curriculum',
      'status', 'CONFIRMED',
      'fingerprint', target_curriculum_baseline_fingerprint
    ),
    jsonb_build_object(
      'key', 'projection',
      'status', 'CONFIRMED',
      'projectionId', target_projection_id
    ),
    jsonb_build_object(
      'key', 'accepted-design',
      'status', 'CONFIRMED',
      'acceptedExtensionCount', accepted_extension_count
    )
  );

  insert into public.lesson_preparation_receipts (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_plan_asset_id,
    canonical_generation_id,
    block_id,
    projection_id,
    checklist_snapshot,
    design_fingerprint,
    curriculum_source_handoff_footprint_hash,
    curriculum_baseline_fingerprint,
    preparation_fingerprint,
    approval_snapshot,
    confirmed_by
  ) values (
    target_workspace_id,
    target_academic_year_id,
    target_section_id,
    target_canonical_plan_asset_id,
    target_canonical_generation_id,
    target_block_id,
    target_projection_id,
    checklist,
    target_preparation_fingerprint,
    target_curriculum_source_handoff_footprint_hash,
    target_curriculum_baseline_fingerprint,
    target_preparation_fingerprint,
    target_approval_snapshot,
    actor_id
  )
  returning * into existing_row;

  return to_jsonb(existing_row);
exception
  when unique_violation then
    select *
      into existing_row
    from public.lesson_preparation_receipts r
    where r.workspace_id = target_workspace_id
      and r.academic_year_id = target_academic_year_id
      and r.section_id = target_section_id
      and r.canonical_generation_id = target_canonical_generation_id
      and r.block_id = target_block_id
      and r.projection_id = target_projection_id
      and r.preparation_fingerprint = target_preparation_fingerprint
    limit 1;
    if existing_row.id is null then
      raise;
    end if;
    return to_jsonb(existing_row);
end;
$$;

revoke all on function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) from public, anon;

grant execute on function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) to authenticated;

comment on table private.eco02_lesson_preparation_scopes is
  'Server-governed exact pilot scopes for ECO-02 lesson preparation approval. Client roles cannot inspect or mutate the allowlist.';

comment on function public.persist_eco02_lesson_preparation_receipt is
  'DB-enforced ECO-02 exact-state lesson preparation approval. Validates the current provisional Arena baseline, canonical lesson projection, accepted lesson extensions, workspace membership, and append-only receipt context without a Render admin secret.';
