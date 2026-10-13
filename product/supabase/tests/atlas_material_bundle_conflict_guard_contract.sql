-- DOC-ATLAS-BUNDLE-01 conflict-path fail-closed contract
-- A preexisting Atlas proposal must never gain trust merely because it shares a dedupe key.
-- Legitimate retries are idempotent only after the atomic RPC has already accepted the row.

begin;

create or replace function pg_temp.assert_true(ok boolean, label text)
returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'ATLAS MATERIAL BUNDLE CONFLICT FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end
$$;

create temporary table atlas_conflict_probe_results (
  probe text primary key,
  ok boolean not null,
  detail text null
) on commit drop;

grant select, insert, update on atlas_conflict_probe_results to authenticated;

insert into auth.users(id, email)
values ('00000000-0000-0000-0000-00000000a693', 'atlas-conflict-693@example.invalid');

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-0000-0000-00000000b693',
  'PERSONAL',
  'Atlas conflict behavioral fixture',
  '00000000-0000-0000-0000-00000000a693'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-0000-0000-00000000b693',
  '00000000-0000-0000-0000-00000000a693',
  'OWNER'
);

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
values (
  '00000000-0000-0000-0000-00000000c693',
  '00000000-0000-0000-0000-00000000b693',
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
  '00000000-0000-0000-0000-00000000d693',
  '00000000-0000-0000-0000-00000000b693',
  '00000000-0000-0000-0000-00000000c693',
  'SECONDA',
  'A',
  'DA_CONFERMARE',
  '00000000-0000-0000-0000-00000000a693'
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
  '00000000-0000-0000-0000-00000000e693',
  '00000000-0000-0000-0000-00000000b693',
  '00000000-0000-0000-0000-00000000c693',
  'GENERATED',
  'SYSTEM',
  'Canonical annual plan conflict fixture',
  'INDEXED',
  '00000000-0000-0000-0000-00000000a693'
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
  '00000000-0000-0000-0000-00000000f693',
  '00000000-0000-0000-0000-00000000e693',
  '00000000-0000-0000-0000-00000000b693',
  1,
  'SUCCEEDED',
  'atlas-conflict-contract',
  now()
);

-- Fixture a poisoned preexisting Atlas proposal. The conflict branch must never
-- silently accept this row when a later valid item arrives with the same key.
insert into public.lesson_design_extensions (
  workspace_id,
  academic_year_id,
  section_id,
  canonical_plan_asset_id,
  canonical_generation_id,
  block_id,
  projection_id,
  kind,
  status,
  insertion_position,
  anchor_step_id,
  title,
  body,
  cue,
  minutes,
  source_kind,
  source_ref,
  source_label,
  payload,
  created_by
) values (
  '00000000-0000-0000-0000-00000000b693'::uuid,
  '00000000-0000-0000-0000-00000000c693'::uuid,
  '00000000-0000-0000-0000-00000000d693'::uuid,
  '00000000-0000-0000-0000-00000000e693'::uuid,
  '00000000-0000-0000-0000-00000000f693'::uuid,
  'B01',
  'atlas-conflict-contract',
  'TEACHER_RESOURCE',
  'PROPOSED',
  'END',
  null,
  'Poisoned preexisting Atlas row',
  'This row must not be accepted by dedupe-key collision reuse.',
  null,
  null,
  'ATLAS',
  'atlas:conflict-poisoned',
  'Atlas conflict fixture',
  jsonb_build_object(
    'dedupeKey', 'atlas-bundle-conflict:poisoned',
    'atlasMaterialType', 'presentation',
    'publicUrl', 'javascript:alert(1)',
    'origin', 'atlas'
  ),
  '00000000-0000-0000-0000-00000000a693'::uuid
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000a693',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a693","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  auth.uid() = '00000000-0000-0000-0000-00000000a693'::uuid,
  '01 conflict probe executes as the authenticated workspace member'
);

do $$
declare
  saw_expected_failure boolean := false;
begin
  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b693'::uuid,
      '00000000-0000-0000-0000-00000000c693'::uuid,
      '00000000-0000-0000-0000-00000000d693'::uuid,
      '00000000-0000-0000-0000-00000000e693'::uuid,
      '00000000-0000-0000-0000-00000000f693'::uuid,
      'B01',
      'atlas-conflict-contract',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', 'Safe incoming Atlas row',
          'body', 'A valid incoming item must not inherit a divergent preexisting row.',
          'sourceRef', 'atlas:conflict-safe',
          'sourceLabel', 'Atlas conflict fixture',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-conflict:poisoned',
            'atlasMaterialType', 'presentation',
            'atlasLocator', '/materials/conflict-safe',
            'origin', 'atlas'
          )
        )
      )
    );
  exception
    when others then
      if sqlerrm = 'Atlas material bundle conflict does not match incoming material' then
        saw_expected_failure := true;
      else
        raise;
      end if;
  end;

  if not saw_expected_failure then
    raise exception 'ATLAS MATERIAL BUNDLE CONFLICT FAIL: divergent preexisting row was accepted through conflict reuse';
  end if;
end
$$;

select pg_temp.assert_true(
  exists (
    select 1
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b693'::uuid
      and payload ->> 'dedupeKey' = 'atlas-bundle-conflict:poisoned'
      and status = 'PROPOSED'
      and payload ->> 'publicUrl' = 'javascript:alert(1)'
      and not (payload ? 'atlasLocator')
  ),
  '02 divergent preexisting row remains unaccepted after the rejected conflict'
);

-- A semantically identical row that was inserted outside the atomic Atlas RPC is
-- still untrusted. Equality of content is not provenance and must not promote it.
insert into public.lesson_design_extensions (
  workspace_id,
  academic_year_id,
  section_id,
  canonical_plan_asset_id,
  canonical_generation_id,
  block_id,
  projection_id,
  kind,
  status,
  insertion_position,
  anchor_step_id,
  title,
  body,
  cue,
  minutes,
  source_kind,
  source_ref,
  source_label,
  payload,
  created_by
) values (
  '00000000-0000-0000-0000-00000000b693'::uuid,
  '00000000-0000-0000-0000-00000000c693'::uuid,
  '00000000-0000-0000-0000-00000000d693'::uuid,
  '00000000-0000-0000-0000-00000000e693'::uuid,
  '00000000-0000-0000-0000-00000000f693'::uuid,
  'B01',
  'atlas-conflict-contract',
  'TEACHER_RESOURCE',
  'PROPOSED',
  'END',
  null,
  'Identical preexisting Atlas row',
  'Semantic equality must not authorize a preexisting pending proposal.',
  null,
  null,
  'ATLAS',
  'atlas:conflict-identical',
  'Atlas conflict fixture',
  jsonb_build_object(
    'dedupeKey', 'atlas-bundle-conflict:identical',
    'atlasMaterialType', 'presentation',
    'atlasLocator', '/materials/conflict-identical',
    'origin', 'atlas'
  ),
  '00000000-0000-0000-0000-00000000a693'::uuid
);

do $$
declare
  rejected_preexisting_proposed boolean := false;
  retry_error text := null;
begin
  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b693'::uuid,
      '00000000-0000-0000-0000-00000000c693'::uuid,
      '00000000-0000-0000-0000-00000000d693'::uuid,
      '00000000-0000-0000-0000-00000000e693'::uuid,
      '00000000-0000-0000-0000-00000000f693'::uuid,
      'B01',
      'atlas-conflict-contract',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', 'Identical preexisting Atlas row',
          'body', 'Semantic equality must not authorize a preexisting pending proposal.',
          'sourceRef', 'atlas:conflict-identical',
          'sourceLabel', 'Atlas conflict fixture',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-conflict:identical',
            'atlasMaterialType', 'presentation',
            'atlasLocator', '/materials/conflict-identical',
            'origin', 'atlas'
          )
        )
      )
    );
  exception
    when others then
      if sqlerrm = 'Atlas material bundle conflict is not an accepted retry' then
        rejected_preexisting_proposed := true;
      else
        raise;
      end if;
  end;

  insert into atlas_conflict_probe_results(probe, ok, detail)
  values (
    'identical-preexisting-proposed',
    rejected_preexisting_proposed,
    case when rejected_preexisting_proposed then null else 'RPC accepted a preexisting PROPOSED row' end
  );

  -- First call creates and accepts the row. The trigger canonicalizes title/body.
  perform public.accept_atlas_material_bundle(
    '00000000-0000-0000-0000-00000000b693'::uuid,
    '00000000-0000-0000-0000-00000000c693'::uuid,
    '00000000-0000-0000-0000-00000000d693'::uuid,
    '00000000-0000-0000-0000-00000000e693'::uuid,
    '00000000-0000-0000-0000-00000000f693'::uuid,
    'B01',
    'atlas-conflict-contract',
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'TEACHER_RESOURCE',
        'insertionPosition', 'END',
        'title', '  Whitespace retry title  ',
        'body', '  Whitespace retry body  ',
        'sourceRef', '  atlas:whitespace-retry  ',
        'sourceLabel', '  Atlas conflict fixture  ',
        'payload', jsonb_build_object(
          'dedupeKey', 'atlas-bundle-conflict:whitespace-retry',
          'atlasMaterialType', 'presentation',
          'atlasLocator', '/materials/whitespace-retry',
          'origin', 'atlas'
        )
      )
    )
  );

  -- Exact retry of the same incoming payload must find the already ACCEPTED row
  -- and compare against the same canonical representation used by persistence.
  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b693'::uuid,
      '00000000-0000-0000-0000-00000000c693'::uuid,
      '00000000-0000-0000-0000-00000000d693'::uuid,
      '00000000-0000-0000-0000-00000000e693'::uuid,
      '00000000-0000-0000-0000-00000000f693'::uuid,
      'B01',
      'atlas-conflict-contract',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', '  Whitespace retry title  ',
          'body', '  Whitespace retry body  ',
          'sourceRef', '  atlas:whitespace-retry  ',
          'sourceLabel', '  Atlas conflict fixture  ',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-conflict:whitespace-retry',
            'atlasMaterialType', 'presentation',
            'atlasLocator', '/materials/whitespace-retry',
            'origin', 'atlas'
          )
        )
      )
    );
  exception
    when others then
      retry_error := sqlerrm;
  end;

  insert into atlas_conflict_probe_results(probe, ok, detail)
  values (
    'canonicalized-accepted-retry',
    retry_error is null,
    retry_error
  );
end
$$;

select pg_temp.assert_true(
  (select ok from atlas_conflict_probe_results where probe = 'identical-preexisting-proposed'),
  '03 semantically identical preexisting PROPOSED row is rejected as untrusted conflict provenance'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b693'::uuid
      and payload ->> 'dedupeKey' = 'atlas-bundle-conflict:identical'
      and status = 'PROPOSED'
  ),
  '04 rejected semantically identical preexisting row remains PROPOSED'
);

select pg_temp.assert_true(
  (select ok from atlas_conflict_probe_results where probe = 'canonicalized-accepted-retry'),
  '05 exact retry remains idempotent after trigger canonicalizes title/body/source metadata'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
      and bool_and(status = 'ACCEPTED')
      and bool_and(title = 'Whitespace retry title')
      and bool_and(body = 'Whitespace retry body')
    from public.lesson_design_extensions
    where workspace_id = '00000000-0000-0000-0000-00000000b693'::uuid
      and payload ->> 'dedupeKey' = 'atlas-bundle-conflict:whitespace-retry'
  ),
  '06 accepted retry keeps one canonicalized row'
);

rollback;

\echo 'ATLAS MATERIAL BUNDLE CONFLICT PASS: divergent and identical pending conflicts fail closed; accepted retries remain canonical and idempotent'