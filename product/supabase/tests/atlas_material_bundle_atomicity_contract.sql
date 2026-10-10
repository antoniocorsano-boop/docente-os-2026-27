-- DOC-ATLAS-BUNDLE-01 atomicity and idempotency contract
-- Behavioral qualification against an isolated disposable database.
-- This deliberately does not define resource replacement semantics.

begin;

create or replace function pg_temp.assert_true(ok boolean, label text)
returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'ATLAS MATERIAL BUNDLE FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end
$$;

select pg_temp.assert_true(
  to_regprocedure('public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)') is not null,
  '01 governed Atlas material bundle boundary installed'
);

select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  '02 authenticated teacher can execute the Atlas material bundle boundary'
);

insert into auth.users(id, email)
values ('00000000-0000-0000-0000-00000000a692', 'atlas-bundle-692@example.invalid');

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-0000-0000-00000000b692',
  'PERSONAL',
  'Atlas bundle behavioral fixture',
  '00000000-0000-0000-0000-00000000a692'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-0000-0000-00000000b692',
  '00000000-0000-0000-0000-00000000a692',
  'OWNER'
);

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
values (
  '00000000-0000-0000-0000-00000000c692',
  '00000000-0000-0000-0000-00000000b692',
  '2026/27',
  '2026-09-01',
  '2027-08-31',
  true
);

insert into public.annual_plan_sections(
  id,
  workspace_id,
  academic_year_id,
  grade,
  section_code,
  status,
  created_by
) values (
  '00000000-0000-0000-0000-00000000d692',
  '00000000-0000-0000-0000-00000000b692',
  '00000000-0000-0000-0000-00000000c692',
  'SECONDA',
  'A',
  'DA_CONFERMARE',
  '00000000-0000-0000-0000-00000000a692'
);

insert into public.knowledge_assets(
  id,
  workspace_id,
  academic_year_id,
  asset_kind,
  source_provider,
  original_name,
  processing_status,
  created_by
) values (
  '00000000-0000-0000-0000-00000000e692',
  '00000000-0000-0000-0000-00000000b692',
  '00000000-0000-0000-0000-00000000c692',
  'GENERATED',
  'SYSTEM',
  'Canonical annual plan fixture',
  'INDEXED',
  '00000000-0000-0000-0000-00000000a692'
);

insert into public.knowledge_processing_generations(
  id,
  asset_id,
  workspace_id,
  generation_no,
  status,
  processor_label,
  finished_at
) values (
  '00000000-0000-0000-0000-00000000f692',
  '00000000-0000-0000-0000-00000000e692',
  '00000000-0000-0000-0000-00000000b692',
  1,
  'SUCCEEDED',
  'atlas-bundle-contract',
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000a692',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a692","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  auth.uid() = '00000000-0000-0000-0000-00000000a692'::uuid,
  '03 behavioral fixture executes as the authenticated workspace member'
);

do $$
declare
  saw_expected_failure boolean := false;
begin
  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b692'::uuid,
      '00000000-0000-0000-0000-00000000c692'::uuid,
      '00000000-0000-0000-0000-00000000d692'::uuid,
      '00000000-0000-0000-0000-00000000e692'::uuid,
      '00000000-0000-0000-0000-00000000f692'::uuid,
      'B01',
      'atlas-bundle-contract',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', 'Atomic rollback teacher resource',
          'body', 'The first item is valid and would be accepted before the second item fails.',
          'sourceRef', 'https://atlas.example.invalid/materials/rollback-teacher',
          'sourceLabel', 'Atlas rollback fixture',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-rollback:teacher',
            'atlasMaterialType', 'PDF',
            'publicUrl', 'https://atlas.example.invalid/materials/rollback-teacher'
          )
        ),
        jsonb_build_object(
          'kind', 'HOOK_QUOTE',
          'insertionPosition', 'END',
          'title', 'Invalid non-material item',
          'body', 'This item must make the whole bundle fail.',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-rollback:invalid'
          )
        )
      )
    );
  exception
    when others then
      if sqlerrm = 'Atlas material bundle item kind must be a material resource' then
        saw_expected_failure := true;
      else
        raise;
      end if;
  end;

  if not saw_expected_failure then
    raise exception 'ATLAS MATERIAL BUNDLE FAIL: rollback probe did not reject the invalid second item';
  end if;
end
$$;

select pg_temp.assert_true(
  (
    select count(*)
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
      and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
      and payload ->> 'dedupeKey' like 'atlas-bundle-rollback:%'
  ) = 0,
  '04 failure on the second item rolls back the already-processed first item'
);

select public.accept_atlas_material_bundle(
  '00000000-0000-0000-0000-00000000b692'::uuid,
  '00000000-0000-0000-0000-00000000c692'::uuid,
  '00000000-0000-0000-0000-00000000d692'::uuid,
  '00000000-0000-0000-0000-00000000e692'::uuid,
  '00000000-0000-0000-0000-00000000f692'::uuid,
  'B01',
  'atlas-bundle-contract',
  jsonb_build_array(
    jsonb_build_object(
      'kind', 'TEACHER_RESOURCE',
      'insertionPosition', 'END',
      'title', 'Idempotent teacher resource',
      'body', 'Teacher-facing Atlas resource for the idempotency probe.',
      'sourceRef', 'https://atlas.example.invalid/materials/idempotent-teacher',
      'sourceLabel', 'Atlas idempotency fixture',
      'payload', jsonb_build_object(
        'dedupeKey', 'atlas-bundle-idempotency:teacher',
        'atlasMaterialType', 'PDF',
        'publicUrl', 'https://atlas.example.invalid/materials/idempotent-teacher'
      )
    ),
    jsonb_build_object(
      'kind', 'STUDENT_RESOURCE',
      'insertionPosition', 'END',
      'title', 'Idempotent student resource',
      'body', 'Student-facing Atlas resource for the idempotency probe.',
      'sourceRef', 'https://atlas.example.invalid/materials/idempotent-student',
      'sourceLabel', 'Atlas idempotency fixture',
      'payload', jsonb_build_object(
        'dedupeKey', 'atlas-bundle-idempotency:student',
        'atlasMaterialType', 'WEB',
        'publicUrl', 'https://atlas.example.invalid/materials/idempotent-student'
      )
    )
  )
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
      and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
      and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%'
  ) = 2,
  '05 valid two-item bundle persists exactly two material resources'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
      and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
      and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%'
      and (
        status <> 'ACCEPTED'
        or source_kind <> 'ATLAS'
        or accepted_by <> '00000000-0000-0000-0000-00000000a692'::uuid
      )
  ),
  '06 valid bundle rows are accepted Atlas resources owned by the teacher decision'
);

do $$
declare
  before_ids uuid[];
  after_ids uuid[];
begin
  select array_agg(id order by payload ->> 'dedupeKey')
    into before_ids
  from public.lesson_design_extensions
  where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
    and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
    and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%';

  if coalesce(cardinality(before_ids), 0) <> 2 then
    raise exception 'ATLAS MATERIAL BUNDLE FAIL: expected two ids before retry';
  end if;

  perform public.accept_atlas_material_bundle(
    '00000000-0000-0000-0000-00000000b692'::uuid,
    '00000000-0000-0000-0000-00000000c692'::uuid,
    '00000000-0000-0000-0000-00000000d692'::uuid,
    '00000000-0000-0000-0000-00000000e692'::uuid,
    '00000000-0000-0000-0000-00000000f692'::uuid,
    'B01',
    'atlas-bundle-contract',
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'TEACHER_RESOURCE',
        'insertionPosition', 'END',
        'title', 'Idempotent teacher resource',
        'body', 'Teacher-facing Atlas resource for the idempotency probe.',
        'sourceRef', 'https://atlas.example.invalid/materials/idempotent-teacher',
        'sourceLabel', 'Atlas idempotency fixture',
        'payload', jsonb_build_object(
          'dedupeKey', 'atlas-bundle-idempotency:teacher',
          'atlasMaterialType', 'PDF',
          'publicUrl', 'https://atlas.example.invalid/materials/idempotent-teacher'
        )
      ),
      jsonb_build_object(
        'kind', 'STUDENT_RESOURCE',
        'insertionPosition', 'END',
        'title', 'Idempotent student resource',
        'body', 'Student-facing Atlas resource for the idempotency probe.',
        'sourceRef', 'https://atlas.example.invalid/materials/idempotent-student',
        'sourceLabel', 'Atlas idempotency fixture',
        'payload', jsonb_build_object(
          'dedupeKey', 'atlas-bundle-idempotency:student',
          'atlasMaterialType', 'WEB',
          'publicUrl', 'https://atlas.example.invalid/materials/idempotent-student'
        )
      )
    )
  );

  select array_agg(id order by payload ->> 'dedupeKey')
    into after_ids
  from public.lesson_design_extensions
  where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
    and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
    and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%';

  if before_ids is distinct from after_ids then
    raise exception 'ATLAS MATERIAL BUNDLE FAIL: identical retry changed the persisted resource identities';
  end if;
end
$$;

select pg_temp.assert_true(
  (
    select count(*)
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
      and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
      and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%'
  ) = 2,
  '07 identical retry does not create duplicate material resources'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b692'::uuid
      and section_id = '00000000-0000-0000-0000-00000000d692'::uuid
      and payload ->> 'dedupeKey' like 'atlas-bundle-idempotency:%'
      and jsonb_array_length(decision_history) <> 1
  ),
  '08 identical retry does not append a second acceptance decision'
);

rollback;

\echo 'ATLAS MATERIAL BUNDLE PASS: rollback atomicity and identical-retry idempotency qualified'
