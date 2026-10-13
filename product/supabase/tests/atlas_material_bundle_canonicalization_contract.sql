-- DOC-ATLAS-BUNDLE-01 canonicalization/idempotency regression contract
-- Direct authenticated RPC inputs may contain surrounding whitespace, but persistence
-- and retry lookup must use one canonical representation for identity-bearing fields.

begin;

create temporary table atlas_canonicalization_probe_results (
  probe text primary key,
  ok boolean not null,
  detail text null
) on commit drop;

grant select, insert, update on atlas_canonicalization_probe_results to authenticated;

insert into auth.users(id, email)
values ('00000000-0000-0000-0000-00000000a694', 'atlas-canonicalization-694@example.invalid');

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-0000-0000-00000000b694',
  'PERSONAL',
  'Atlas canonicalization behavioral fixture',
  '00000000-0000-0000-0000-00000000a694'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-0000-0000-00000000b694',
  '00000000-0000-0000-0000-00000000a694',
  'OWNER'
);

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
values (
  '00000000-0000-0000-0000-00000000c694',
  '00000000-0000-0000-0000-00000000b694',
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
  '00000000-0000-0000-0000-00000000d694',
  '00000000-0000-0000-0000-00000000b694',
  '00000000-0000-0000-0000-00000000c694',
  'SECONDA',
  'A',
  'DA_CONFERMARE',
  '00000000-0000-0000-0000-00000000a694'
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
  '00000000-0000-0000-0000-00000000e694',
  '00000000-0000-0000-0000-00000000b694',
  '00000000-0000-0000-0000-00000000c694',
  'GENERATED',
  'SYSTEM',
  'Canonical annual plan canonicalization fixture',
  'INDEXED',
  '00000000-0000-0000-0000-00000000a694'
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
  '00000000-0000-0000-0000-00000000f694',
  '00000000-0000-0000-0000-00000000e694',
  '00000000-0000-0000-0000-00000000b694',
  1,
  'SUCCEEDED',
  'atlas-canonicalization-contract',
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000a694',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a694","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

-- P2 regression 1: a padded dedupe key must be canonicalized before persistence
-- so the identical retry resolves the already accepted row by the same key.
do $$
declare
  retry_error text := null;
  canonical_row_count integer := 0;
begin
  perform public.accept_atlas_material_bundle(
    '00000000-0000-0000-0000-00000000b694'::uuid,
    '00000000-0000-0000-0000-00000000c694'::uuid,
    '00000000-0000-0000-0000-00000000d694'::uuid,
    '00000000-0000-0000-0000-00000000e694'::uuid,
    '00000000-0000-0000-0000-00000000f694'::uuid,
    'B01',
    'atlas-dedupe-canonicalization',
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'TEACHER_RESOURCE',
        'insertionPosition', 'END',
        'title', 'Dedupe canonicalization material',
        'body', 'The retry must resolve the same accepted material.',
        'sourceRef', 'atlas:dedupe-canonicalization',
        'sourceLabel', 'Atlas canonicalization fixture',
        'payload', jsonb_build_object(
          'dedupeKey', '  atlas-bundle-canonicalization:dedupe  ',
          'atlasMaterialType', 'presentation',
          'atlasLocator', '/materials/dedupe-canonicalization',
          'origin', 'atlas'
        )
      )
    )
  );

  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b694'::uuid,
      '00000000-0000-0000-0000-00000000c694'::uuid,
      '00000000-0000-0000-0000-00000000d694'::uuid,
      '00000000-0000-0000-0000-00000000e694'::uuid,
      '00000000-0000-0000-0000-00000000f694'::uuid,
      'B01',
      'atlas-dedupe-canonicalization',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', 'Dedupe canonicalization material',
          'body', 'The retry must resolve the same accepted material.',
          'sourceRef', 'atlas:dedupe-canonicalization',
          'sourceLabel', 'Atlas canonicalization fixture',
          'payload', jsonb_build_object(
            'dedupeKey', '  atlas-bundle-canonicalization:dedupe  ',
            'atlasMaterialType', 'presentation',
            'atlasLocator', '/materials/dedupe-canonicalization',
            'origin', 'atlas'
          )
        )
      )
    );
  exception
    when others then
      retry_error := sqlerrm;
  end;

  select count(*)
    into canonical_row_count
  from public.lesson_design_extensions
  where workspace_id = '00000000-0000-0000-0000-00000000b694'::uuid
    and projection_id = 'atlas-dedupe-canonicalization'
    and payload ->> 'dedupeKey' = 'atlas-bundle-canonicalization:dedupe'
    and status = 'ACCEPTED';

  insert into atlas_canonicalization_probe_results(probe, ok, detail)
  values (
    'dedupe-key-canonicalization',
    retry_error is null and canonical_row_count = 1,
    concat_ws('; ', retry_error, 'canonical rows=' || canonical_row_count::text)
  );
end
$$;

-- P2 regression 2: the context projection id must be canonicalized once and reused
-- for insert and accepted-retry lookup.
do $$
declare
  retry_error text := null;
  canonical_row_count integer := 0;
begin
  perform public.accept_atlas_material_bundle(
    '00000000-0000-0000-0000-00000000b694'::uuid,
    '00000000-0000-0000-0000-00000000c694'::uuid,
    '00000000-0000-0000-0000-00000000d694'::uuid,
    '00000000-0000-0000-0000-00000000e694'::uuid,
    '00000000-0000-0000-0000-00000000f694'::uuid,
    'B01',
    '  atlas-projection-canonicalization  ',
    jsonb_build_array(
      jsonb_build_object(
        'kind', 'TEACHER_RESOURCE',
        'insertionPosition', 'END',
        'title', 'Projection canonicalization material',
        'body', 'The retry must resolve the same canonical projection.',
        'sourceRef', 'atlas:projection-canonicalization',
        'sourceLabel', 'Atlas canonicalization fixture',
        'payload', jsonb_build_object(
          'dedupeKey', 'atlas-bundle-canonicalization:projection',
          'atlasMaterialType', 'presentation',
          'atlasLocator', '/materials/projection-canonicalization',
          'origin', 'atlas'
        )
      )
    )
  );

  begin
    perform public.accept_atlas_material_bundle(
      '00000000-0000-0000-0000-00000000b694'::uuid,
      '00000000-0000-0000-0000-00000000c694'::uuid,
      '00000000-0000-0000-0000-00000000d694'::uuid,
      '00000000-0000-0000-0000-00000000e694'::uuid,
      '00000000-0000-0000-0000-00000000f694'::uuid,
      'B01',
      '  atlas-projection-canonicalization  ',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'TEACHER_RESOURCE',
          'insertionPosition', 'END',
          'title', 'Projection canonicalization material',
          'body', 'The retry must resolve the same canonical projection.',
          'sourceRef', 'atlas:projection-canonicalization',
          'sourceLabel', 'Atlas canonicalization fixture',
          'payload', jsonb_build_object(
            'dedupeKey', 'atlas-bundle-canonicalization:projection',
            'atlasMaterialType', 'presentation',
            'atlasLocator', '/materials/projection-canonicalization',
            'origin', 'atlas'
          )
        )
      )
    );
  exception
    when others then
      retry_error := sqlerrm;
  end;

  select count(*)
    into canonical_row_count
  from public.lesson_design_extensions
  where workspace_id = '00000000-0000-0000-0000-00000000b694'::uuid
    and projection_id = 'atlas-projection-canonicalization'
    and payload ->> 'dedupeKey' = 'atlas-bundle-canonicalization:projection'
    and status = 'ACCEPTED';

  insert into atlas_canonicalization_probe_results(probe, ok, detail)
  values (
    'projection-id-canonicalization',
    retry_error is null and canonical_row_count = 1,
    concat_ws('; ', retry_error, 'canonical rows=' || canonical_row_count::text)
  );
end
$$;

do $$
declare
  failures text;
begin
  select string_agg(probe || ': ' || coalesce(detail, 'failed'), ' | ' order by probe)
    into failures
  from atlas_canonicalization_probe_results
  where not ok;

  if failures is not null then
    raise exception 'ATLAS MATERIAL BUNDLE CANONICALIZATION FAIL: %', failures;
  end if;
end
$$;

rollback;

\echo 'ATLAS MATERIAL BUNDLE CANONICALIZATION PASS: padded dedupe keys and projection IDs remain canonical and retry-idempotent'
