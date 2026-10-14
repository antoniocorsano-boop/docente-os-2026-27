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

-- This is the Task 4 RED assertion. A is not knowledge_assets.current_generation_id
-- anymore, but it is still the governed CPRI source and therefore must remain valid
-- for a new TeachingSession allocation until an explicit binding movement occurs.
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

rollback;
