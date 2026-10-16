\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.cpri_assert_true(ok boolean, label text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'CPRI-01 behavior FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

insert into auth.users(id, email)
values ('00000000-0000-4000-8000-000000000a01', 'cpri-task4@example.invalid')
on conflict (id) do nothing;

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-4000-8000-000000000a10',
  'PERSONAL',
  'CPRI Task 4 fixture',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a01',
  'OWNER'
);

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
values (
  '00000000-0000-4000-8000-000000000a11',
  '00000000-0000-4000-8000-000000000a10',
  '2026/2027 CPRI Task 4',
  '2026-09-01',
  '2027-08-31',
  false
);

insert into public.annual_plan_sections(
  id, workspace_id, academic_year_id, grade, section_code, created_by
)
values (
  '00000000-0000-4000-8000-000000000a12',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  'PRIMA',
  'CPRI',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.knowledge_assets(
  id, workspace_id, academic_year_id, asset_kind, source_provider,
  original_name, processing_status, created_by
)
values (
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  'GENERATED',
  'SYSTEM',
  'CPRI Task 4 canonical plan',
  'INDEXED',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.knowledge_processing_generations(
  id, asset_id, workspace_id, generation_no, status, processor_label, finished_at
)
values
  (
    '00000000-0000-4000-8000-000000000a21',
    '00000000-0000-4000-8000-000000000a20',
    '00000000-0000-4000-8000-000000000a10',
    1,
    'SUCCEEDED',
    'cpri-task4-a',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000a22',
    '00000000-0000-4000-8000-000000000a20',
    '00000000-0000-4000-8000-000000000a10',
    2,
    'SUCCEEDED',
    'cpri-task4-b',
    now()
  );

update public.knowledge_assets
set current_generation_id = '00000000-0000-4000-8000-000000000a21'
where id = '00000000-0000-4000-8000-000000000a20';

insert into public.canonical_plan_runtime_bindings(
  workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
)
values (
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  'CAN-PLAN-1',
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a21'
);

-- Reprocessing advances the Knowledge asset current pointer to B. CPRI deliberately
-- remains pinned to A until an explicit governed movement is accepted.
update public.knowledge_assets
set current_generation_id = '00000000-0000-4000-8000-000000000a22'
where id = '00000000-0000-4000-8000-000000000a20';

select pg_temp.cpri_assert_true(
  (
    select generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
    from public.canonical_plan_runtime_bindings
    where workspace_id = '00000000-0000-4000-8000-000000000a10'::uuid
      and academic_year_id = '00000000-0000-4000-8000-000000000a11'::uuid
      and canonical_plan_code = 'CAN-PLAN-1'
  ),
  '01 reprocessing does not implicitly move CPRI from A to B'
);

insert into public.teaching_sessions(
  id, workspace_id, academic_year_id, section_id, discipline_id,
  local_date, actual_minutes, evidence_note, source_kind,
  source_provenance, recorded_by
)
values (
  '00000000-0000-4000-8000-000000000a30',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  '00000000-0000-4000-8000-000000000a12',
  null,
  '2026-10-14',
  60,
  'CPRI pinned generation compatibility probe',
  'MANUAL',
  array['CPRI-01-TASK4'],
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.teaching_session_allocations(
  id, session_id, block_id, minutes, canonical_plan_asset_id, canonical_generation_id
)
values (
  '00000000-0000-4000-8000-000000000a31',
  '00000000-0000-4000-8000-000000000a30',
  'B01',
  60,
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a21'
);

select pg_temp.cpri_assert_true(
  exists (
    select 1
    from public.teaching_session_allocations allocation
    where allocation.id = '00000000-0000-4000-8000-000000000a31'::uuid
      and allocation.canonical_plan_asset_id = '00000000-0000-4000-8000-000000000a20'::uuid
      and allocation.canonical_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
  ),
  '02 TeachingSession allocation follows governed CPRI A even when asset current generation is B'
);

-- Generation-bound historical state exists on A before the governed move.
insert into public.annual_plan_block_progress(
  id, section_id, canonical_plan_asset_id, canonical_generation_id,
  block_id, status, executed_on, evidence_note, updated_by
)
values (
  '00000000-0000-4000-8000-000000000a40',
  '00000000-0000-4000-8000-000000000a12',
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a21',
  'B01',
  'SVOLTO',
  '2026-10-14',
  'Historical progress on generation A',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.lesson_design_extensions(
  id, workspace_id, academic_year_id, section_id,
  canonical_plan_asset_id, canonical_generation_id, block_id, projection_id,
  kind, insertion_position, title, body, source_kind, created_by
)
values (
  '00000000-0000-4000-8000-000000000a41',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  '00000000-0000-4000-8000-000000000a12',
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a21',
  'B01',
  'CPRI-TASK4-B01',
  'HOOK_QUESTION',
  'START',
  'Historical extension on A',
  'This extension must remain generation-bound historical state.',
  'TEACHER',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.lesson_preparation_receipts(
  id, workspace_id, academic_year_id, section_id,
  canonical_plan_asset_id, canonical_generation_id, block_id, projection_id,
  checklist_snapshot, design_fingerprint,
  curriculum_source_handoff_footprint_hash, curriculum_baseline_fingerprint,
  preparation_fingerprint, approval_snapshot, confirmed_by
)
values (
  '00000000-0000-4000-8000-000000000a42',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  '00000000-0000-4000-8000-000000000a12',
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a21',
  'B01',
  'CPRI-TASK4-B01',
  '[]'::jsonb,
  repeat('c', 64),
  'deadbeef',
  repeat('b', 64),
  repeat('c', 64),
  jsonb_build_object(
    'schemaVersion', '1',
    'context', jsonb_build_object(
      'workspaceId', '00000000-0000-4000-8000-000000000a10',
      'academicYearId', '00000000-0000-4000-8000-000000000a11',
      'sectionId', '00000000-0000-4000-8000-000000000a12',
      'canonicalPlanAssetId', '00000000-0000-4000-8000-000000000a20',
      'canonicalGenerationId', '00000000-0000-4000-8000-000000000a21',
      'blockId', 'B01',
      'projectionId', 'CPRI-TASK4-B01'
    ),
    'curriculum', jsonb_build_object(
      'sourceHandoffFootprintHash', 'deadbeef',
      'baselineFingerprint', repeat('b', 64)
    )
  ),
  '00000000-0000-4000-8000-000000000a01'
);

-- RED: this governed movement primitive does not exist before Task 4 movement GREEN.
select private.move_canonical_plan_runtime_binding(
  '00000000-0000-4000-8000-000000000a10'::uuid,
  '00000000-0000-4000-8000-000000000a11'::uuid,
  'CAN-PLAN-1',
  '00000000-0000-4000-8000-000000000a20'::uuid,
  '00000000-0000-4000-8000-000000000a21'::uuid,
  '00000000-0000-4000-8000-000000000a20'::uuid,
  '00000000-0000-4000-8000-000000000a22'::uuid,
  'CPRI-01 Task 4 explicit A to B revalidation probe'
);

select pg_temp.cpri_assert_true(
  (
    select generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
    from public.canonical_plan_runtime_bindings
    where workspace_id = '00000000-0000-4000-8000-000000000a10'::uuid
      and academic_year_id = '00000000-0000-4000-8000-000000000a11'::uuid
      and canonical_plan_code = 'CAN-PLAN-1'
  ),
  '03 governed movement switches runtime CPRI authority from A to B'
);

select pg_temp.cpri_assert_true(
  exists (
    select 1 from public.teaching_session_allocations
    where id = '00000000-0000-4000-8000-000000000a31'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
  )
  and exists (
    select 1 from public.annual_plan_block_progress
    where id = '00000000-0000-4000-8000-000000000a40'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
  )
  and exists (
    select 1 from public.lesson_design_extensions
    where id = '00000000-0000-4000-8000-000000000a41'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
  )
  and exists (
    select 1 from public.lesson_preparation_receipts
    where id = '00000000-0000-4000-8000-000000000a42'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
  ),
  '04 movement preserves generation-A historical evidence unchanged'
);

select pg_temp.cpri_assert_true(
  not exists (
    select 1 from public.annual_plan_block_progress
    where section_id = '00000000-0000-4000-8000-000000000a12'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
  )
  and not exists (
    select 1 from public.lesson_design_extensions
    where section_id = '00000000-0000-4000-8000-000000000a12'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
  )
  and not exists (
    select 1 from public.lesson_preparation_receipts
    where section_id = '00000000-0000-4000-8000-000000000a12'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
  ),
  '05 movement does not copy progress, extensions, or approval receipts onto B'
);

select pg_temp.cpri_assert_true(
  exists (
    select 1
    from private.canonical_plan_runtime_binding_movements movement
    where movement.workspace_id = '00000000-0000-4000-8000-000000000a10'::uuid
      and movement.academic_year_id = '00000000-0000-4000-8000-000000000a11'::uuid
      and movement.canonical_plan_code = 'CAN-PLAN-1'
      and movement.old_generation_id = '00000000-0000-4000-8000-000000000a21'::uuid
      and movement.new_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
      and (movement.impact_summary->>'annualPlanBlockProgress')::integer = 1
      and (movement.impact_summary->>'lessonDesignExtensions')::integer = 1
      and (movement.impact_summary->>'lessonPreparationReceipts')::integer = 1
      and (movement.impact_summary->>'teachingSessionAllocations')::integer = 1
      and (movement.impact_summary->>'revalidationRequired')::boolean is true
  ),
  '06 movement persists auditable old/new identity and impact classification before future work'
);

select pg_temp.cpri_assert_true(
  not exists (
    select 1
    from public.lesson_preparation_receipts
    where workspace_id = '00000000-0000-4000-8000-000000000a10'::uuid
      and academic_year_id = '00000000-0000-4000-8000-000000000a11'::uuid
      and section_id = '00000000-0000-4000-8000-000000000a12'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
      and block_id = 'B01'
  ),
  '07 current preparation on B requires revalidation; approval on A is not reinterpreted'
);

insert into public.teaching_sessions(
  id, workspace_id, academic_year_id, section_id, discipline_id,
  local_date, actual_minutes, evidence_note, source_kind,
  source_provenance, recorded_by
)
values (
  '00000000-0000-4000-8000-000000000a32',
  '00000000-0000-4000-8000-000000000a10',
  '00000000-0000-4000-8000-000000000a11',
  '00000000-0000-4000-8000-000000000a12',
  null,
  '2026-10-15',
  60,
  'CPRI post-movement authority probe',
  'MANUAL',
  array['CPRI-01-TASK4-MOVED'],
  '00000000-0000-4000-8000-000000000a01'
);

do $stale_a_blocked$
declare
  blocked boolean := false;
begin
  begin
    insert into public.teaching_session_allocations(
      session_id, block_id, minutes, canonical_plan_asset_id, canonical_generation_id
    ) values (
      '00000000-0000-4000-8000-000000000a32',
      'B01',
      60,
      '00000000-0000-4000-8000-000000000a20',
      '00000000-0000-4000-8000-000000000a21'
    );
  exception when others then
    blocked := true;
  end;

  if not blocked then
    raise exception 'CPRI-01 behavior FAIL: stale generation A remained writable after move to B';
  end if;
end;
$stale_a_blocked$;

insert into public.teaching_session_allocations(
  id, session_id, block_id, minutes, canonical_plan_asset_id, canonical_generation_id
)
values (
  '00000000-0000-4000-8000-000000000a33',
  '00000000-0000-4000-8000-000000000a32',
  'B01',
  60,
  '00000000-0000-4000-8000-000000000a20',
  '00000000-0000-4000-8000-000000000a22'
);

select pg_temp.cpri_assert_true(
  exists (
    select 1 from public.teaching_session_allocations
    where id = '00000000-0000-4000-8000-000000000a33'::uuid
      and canonical_generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
  ),
  '08 new authoritative work after movement uses governed generation B'
);

-- Cross-context targets are never eligible movement destinations.
insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-4000-8000-000000000b10',
  'PERSONAL',
  'CPRI foreign context fixture',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000b10',
  '00000000-0000-4000-8000-000000000a01',
  'OWNER'
);

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
values (
  '00000000-0000-4000-8000-000000000b11',
  '00000000-0000-4000-8000-000000000b10',
  '2026/2027 foreign CPRI context',
  '2026-09-01',
  '2027-08-31',
  false
);

insert into public.knowledge_assets(
  id, workspace_id, academic_year_id, asset_kind, source_provider,
  original_name, processing_status, created_by
)
values (
  '00000000-0000-4000-8000-000000000b20',
  '00000000-0000-4000-8000-000000000b10',
  '00000000-0000-4000-8000-000000000b11',
  'GENERATED',
  'SYSTEM',
  'Foreign CPRI plan',
  'INDEXED',
  '00000000-0000-4000-8000-000000000a01'
);

insert into public.knowledge_processing_generations(
  id, asset_id, workspace_id, generation_no, status, processor_label, finished_at
)
values (
  '00000000-0000-4000-8000-000000000b21',
  '00000000-0000-4000-8000-000000000b20',
  '00000000-0000-4000-8000-000000000b10',
  1,
  'SUCCEEDED',
  'cpri-task4-foreign',
  now()
);

do $cross_context_blocked$
declare
  blocked boolean := false;
begin
  begin
    perform private.move_canonical_plan_runtime_binding(
      '00000000-0000-4000-8000-000000000a10'::uuid,
      '00000000-0000-4000-8000-000000000a11'::uuid,
      'CAN-PLAN-1',
      '00000000-0000-4000-8000-000000000a20'::uuid,
      '00000000-0000-4000-8000-000000000a22'::uuid,
      '00000000-0000-4000-8000-000000000b20'::uuid,
      '00000000-0000-4000-8000-000000000b21'::uuid,
      'CPRI-01 must reject cross-context movement'
    );
  exception when others then
    blocked := true;
  end;

  if not blocked then
    raise exception 'CPRI-01 behavior FAIL: cross-context movement was accepted';
  end if;
end;
$cross_context_blocked$;

select pg_temp.cpri_assert_true(
  (
    select generation_id = '00000000-0000-4000-8000-000000000a22'::uuid
    from public.canonical_plan_runtime_bindings
    where workspace_id = '00000000-0000-4000-8000-000000000a10'::uuid
      and academic_year_id = '00000000-0000-4000-8000-000000000a11'::uuid
      and canonical_plan_code = 'CAN-PLAN-1'
  ),
  '09 blocked cross-context movement leaves governed binding on B'
);

rollback;
