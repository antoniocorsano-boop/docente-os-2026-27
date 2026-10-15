begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (102, '0102_cpri_binding_movement_and_revalidation')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- CPRI-01 Task 4: moving runtime authority is an explicit provisioning decision.
-- Historical generation-bound state is never rewritten or copied forward.
alter table public.canonical_plan_runtime_bindings
  add column if not exists authority_epoch bigint not null default 0
  check (authority_epoch >= 0);

-- Epoch 0 preserves all receipts created before governed movement. Once authority
-- moves, the epoch becomes part of approval identity without mutating history.
alter table public.lesson_preparation_receipts
  add column if not exists canonical_authority_epoch bigint
  generated always as (
    coalesce((approval_snapshot #>> '{context,canonicalAuthorityEpoch}')::bigint, 0)
  ) stored;

alter table public.lesson_preparation_receipts
  drop constraint if exists lesson_preparation_receipts_canonical_authority_epoch_ck;
alter table public.lesson_preparation_receipts
  add constraint lesson_preparation_receipts_canonical_authority_epoch_ck
  check (canonical_authority_epoch >= 0);

create table if not exists private.canonical_plan_runtime_binding_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  canonical_plan_code text not null check (canonical_plan_code in ('CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3')),
  old_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  old_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  old_authority_epoch bigint not null check (old_authority_epoch >= 0),
  new_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  new_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  new_authority_epoch bigint not null check (new_authority_epoch > old_authority_epoch),
  movement_intent text not null check (btrim(movement_intent) <> ''),
  impact_summary jsonb not null check (jsonb_typeof(impact_summary) = 'object'),
  executed_by text not null,
  moved_at timestamptz not null default now()
);

create index if not exists canonical_plan_runtime_binding_movements_context_idx
  on private.canonical_plan_runtime_binding_movements(
    workspace_id,
    academic_year_id,
    canonical_plan_code,
    moved_at desc
  );

revoke all on table private.canonical_plan_runtime_binding_movements
  from public, anon, authenticated, service_role;

create or replace function private.move_canonical_plan_runtime_binding(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_canonical_plan_code text,
  expected_asset_id uuid,
  expected_generation_id uuid,
  target_asset_id uuid,
  target_generation_id uuid,
  movement_intent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text := upper(btrim(target_canonical_plan_code));
  v_binding_id uuid;
  v_old_asset_id uuid;
  v_old_generation_id uuid;
  v_old_authority_epoch bigint;
  v_new_authority_epoch bigint;
  v_target_asset_workspace_id uuid;
  v_target_asset_academic_year_id uuid;
  v_target_generation_asset_id uuid;
  v_target_generation_workspace_id uuid;
  v_target_generation_status text;
  v_progress_count bigint;
  v_extension_count bigint;
  v_receipt_count bigint;
  v_allocation_count bigint;
  v_impact_summary jsonb;
  v_movement_id uuid;
begin
  if v_code not in ('CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3') then
    raise exception 'canonical plan code is not supported for governed movement';
  end if;

  if nullif(btrim(movement_intent), '') is null then
    raise exception 'canonical plan movement requires a non-empty intent';
  end if;

  select binding.id, binding.asset_id, binding.generation_id, binding.authority_epoch
    into v_binding_id, v_old_asset_id, v_old_generation_id, v_old_authority_epoch
  from public.canonical_plan_runtime_bindings binding
  where binding.workspace_id = target_workspace_id
    and binding.academic_year_id = target_academic_year_id
    and binding.canonical_plan_code = v_code
  for update;

  if v_binding_id is null then
    raise exception 'canonical plan runtime binding is missing for governed movement';
  end if;

  if v_old_asset_id is distinct from expected_asset_id
     or v_old_generation_id is distinct from expected_generation_id then
    raise exception 'canonical plan runtime binding changed since movement was prepared';
  end if;

  if target_asset_id = v_old_asset_id and target_generation_id = v_old_generation_id then
    raise exception 'canonical plan movement target must differ from current authority';
  end if;

  select asset.workspace_id, asset.academic_year_id
    into v_target_asset_workspace_id, v_target_asset_academic_year_id
  from public.knowledge_assets asset
  where asset.id = target_asset_id;

  if v_target_asset_workspace_id is null
     or v_target_asset_workspace_id <> target_workspace_id
     or v_target_asset_academic_year_id is distinct from target_academic_year_id then
    raise exception 'canonical plan movement target asset is outside the governed workspace/year';
  end if;

  select generation.asset_id, generation.workspace_id, generation.status
    into v_target_generation_asset_id, v_target_generation_workspace_id, v_target_generation_status
  from public.knowledge_processing_generations generation
  where generation.id = target_generation_id;

  if v_target_generation_asset_id is null
     or v_target_generation_asset_id <> target_asset_id
     or v_target_generation_workspace_id <> target_workspace_id then
    raise exception 'canonical plan movement target generation is outside the governed asset/workspace';
  end if;

  if v_target_generation_status <> 'SUCCEEDED' then
    raise exception 'canonical plan movement target generation must be SUCCEEDED';
  end if;

  select count(*)
    into v_progress_count
  from public.annual_plan_block_progress progress
  join public.annual_plan_sections section on section.id = progress.section_id
  where section.workspace_id = target_workspace_id
    and section.academic_year_id = target_academic_year_id
    and progress.canonical_plan_asset_id = v_old_asset_id
    and progress.canonical_generation_id = v_old_generation_id;

  select count(*)
    into v_extension_count
  from public.lesson_design_extensions extension
  where extension.workspace_id = target_workspace_id
    and extension.academic_year_id = target_academic_year_id
    and extension.canonical_plan_asset_id = v_old_asset_id
    and extension.canonical_generation_id = v_old_generation_id;

  select count(*)
    into v_receipt_count
  from public.lesson_preparation_receipts receipt
  where receipt.workspace_id = target_workspace_id
    and receipt.academic_year_id = target_academic_year_id
    and receipt.canonical_plan_asset_id = v_old_asset_id
    and receipt.canonical_generation_id = v_old_generation_id;

  select count(*)
    into v_allocation_count
  from public.teaching_session_allocations allocation
  join public.teaching_sessions session_row on session_row.id = allocation.session_id
  where session_row.workspace_id = target_workspace_id
    and session_row.academic_year_id = target_academic_year_id
    and allocation.canonical_plan_asset_id = v_old_asset_id
    and allocation.canonical_generation_id = v_old_generation_id;

  update public.canonical_plan_runtime_bindings binding
  set asset_id = target_asset_id,
      generation_id = target_generation_id,
      authority_epoch = binding.authority_epoch + 1
  where binding.id = v_binding_id
  returning binding.authority_epoch into v_new_authority_epoch;

  v_impact_summary := jsonb_build_object(
    'annualPlanBlockProgress', v_progress_count,
    'lessonDesignExtensions', v_extension_count,
    'lessonPreparationReceipts', v_receipt_count,
    'teachingSessionAllocations', v_allocation_count,
    'oldAuthorityEpoch', v_old_authority_epoch,
    'newAuthorityEpoch', v_new_authority_epoch,
    'revalidationRequired', true
  );

  insert into private.canonical_plan_runtime_binding_movements(
    workspace_id,
    academic_year_id,
    canonical_plan_code,
    old_asset_id,
    old_generation_id,
    old_authority_epoch,
    new_asset_id,
    new_generation_id,
    new_authority_epoch,
    movement_intent,
    impact_summary,
    executed_by
  ) values (
    target_workspace_id,
    target_academic_year_id,
    v_code,
    v_old_asset_id,
    v_old_generation_id,
    v_old_authority_epoch,
    target_asset_id,
    target_generation_id,
    v_new_authority_epoch,
    btrim(movement_intent),
    v_impact_summary,
    session_user::text
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movementId', v_movement_id,
    'canonicalPlanCode', v_code,
    'oldAssetId', v_old_asset_id,
    'oldGenerationId', v_old_generation_id,
    'oldAuthorityEpoch', v_old_authority_epoch,
    'newAssetId', target_asset_id,
    'newGenerationId', target_generation_id,
    'newAuthorityEpoch', v_new_authority_epoch,
    'impactSummary', v_impact_summary
  );
end;
$function$;

revoke all on function private.move_canonical_plan_runtime_binding(
  uuid, uuid, text, uuid, uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;

-- Preserve the certified ECO-02 implementation behind a private boundary. The
-- public wrapper below adds CPRI authority-epoch validation before legacy
-- idempotency can return a historical receipt.
alter function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) set schema private;

revoke all on function private.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.persist_eco02_lesson_preparation_receipt(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_canonical_plan_asset_id uuid,
  target_canonical_generation_id uuid,
  target_block_id text,
  target_projection_id text,
  target_curricolo_source_handoff_footprint_hash text,
  target_curricolo_baseline_fingerprint text,
  target_preparation_fingerprint text,
  target_approval_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_grade text;
  v_code text;
  v_current_asset_id uuid;
  v_current_generation_id uuid;
  v_current_authority_epoch bigint;
  v_snapshot_authority_epoch bigint;
begin
  select section.grade::text
    into v_grade
  from public.annual_plan_sections section
  where section.id = target_section_id
    and section.workspace_id = target_workspace_id
    and section.academic_year_id = target_academic_year_id;

  v_code := case v_grade
    when 'PRIMA' then 'CAN-PLAN-1'
    when 'SECONDA' then 'CAN-PLAN-2'
    when 'TERZA' then 'CAN-PLAN-3'
    else null
  end;

  if v_code is null then
    raise exception 'lesson preparation section cannot resolve a CPRI plan code';
  end if;

  select binding.asset_id, binding.generation_id, binding.authority_epoch
    into v_current_asset_id, v_current_generation_id, v_current_authority_epoch
  from public.canonical_plan_runtime_bindings binding
  where binding.workspace_id = target_workspace_id
    and binding.academic_year_id = target_academic_year_id
    and binding.canonical_plan_code = v_code;

  if v_current_asset_id is null
    or v_current_asset_id is distinct from target_canonical_plan_asset_id
    or v_current_generation_id is distinct from target_canonical_generation_id then
    raise exception 'lesson preparation approval is not current governed CPRI authority';
  end if;

  begin
    v_snapshot_authority_epoch := coalesce(
      nullif(target_approval_snapshot #>> '{context,canonicalAuthorityEpoch}', '')::bigint,
      0
    );
  exception when others then
    raise exception 'lesson preparation CPRI authority epoch is invalid';
  end;

  if v_snapshot_authority_epoch < 0
    or v_snapshot_authority_epoch is distinct from v_current_authority_epoch then
    raise exception 'lesson preparation CPRI authority epoch is stale';
  end if;

  return private.persist_eco02_lesson_preparation_receipt(
    target_workspace_id,
    target_academic_year_id,
    target_section_id,
    target_canonical_plan_asset_id,
    target_canonical_generation_id,
    target_block_id,
    target_projection_id,
    target_curricolo_source_handoff_footprint_hash,
    target_curricolo_baseline_fingerprint,
    target_preparation_fingerprint,
    target_approval_snapshot
  );
end;
$function$;

revoke all on function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) to authenticated;

comment on function private.move_canonical_plan_runtime_binding(
  uuid, uuid, text, uuid, uuid, uuid, uuid, text
) is
  'CPRI-01 provisioning-only authority movement. Requires exact expected old identity, validates target context/status, increments a monotonic authority epoch, records generation-bound impact, moves only the CPRI binding, and never copies or rewrites historical state.';

comment on table private.canonical_plan_runtime_binding_movements is
  'CPRI-01 immutable-by-runtime audit receipts for explicit canonical-plan authority movement, monotonic authority epochs, and required revalidation impact.';

comment on column public.canonical_plan_runtime_bindings.authority_epoch is
  'Monotonic CPRI authority epoch. Starts at 0 and increments exactly when governed runtime authority moves.';

comment on column public.lesson_preparation_receipts.canonical_authority_epoch is
  'Authority epoch captured from the immutable approval snapshot; historical pre-movement receipts resolve to epoch 0.';

comment on function public.persist_eco02_lesson_preparation_receipt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb
) is
  'CPRI-aware ECO-02 approval boundary. Rejects stale authority epochs before delegating to the preserved exact-state receipt implementation.';

select private.advance_runtime_schema_contract(
  '0102_cpri_binding_movement_and_revalidation'
);

commit;
