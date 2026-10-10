\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(ok boolean, label text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'DOC-TPL lifecycle FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

create or replace function pg_temp.expect_failure(statement text, label text, expected_fragment text)
returns void
language plpgsql
as $$
begin
  begin
    execute statement;
    raise exception 'DOC_TPL_UNEXPECTED_SUCCESS: %', label;
  exception
    when others then
      if position('DOC_TPL_UNEXPECTED_SUCCESS:' in sqlerrm) = 1 then
        raise;
      end if;
      if position(expected_fragment in sqlerrm) = 0 then
        raise exception 'DOC-TPL lifecycle FAIL: % (expected error containing %, got %)',
          label, expected_fragment, sqlerrm;
      end if;
      raise notice 'PASS: %', label;
  end;
end;
$$;

create or replace function pg_temp.family_schema(target_version integer)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'kind', 'FINAL_REPORT',
    'name', 'Relazione finale del docente',
    'version', target_version,
    'sourceRevisionRefs', '[]'::jsonb,
    'sections', jsonb_build_array(jsonb_build_object(
      'key', 'IDENTITY',
      'label', 'Intestazione',
      'purpose', 'Identificare il documento professionale',
      'required', true,
      'repeatable', false,
      'renderRole', 'KEY_VALUE',
      'fields', jsonb_build_array(jsonb_build_object(
        'key', 'class.label',
        'label', 'Classe',
        'type', 'TEXT_SHORT',
        'required', true,
        'cardinality', 'ONE',
        'valuePolicy', 'TEACHER_INPUT',
        'privacyClass', 'PROFESSIONAL_CONTEXT'
      ))
    ))
  );
$$;

create or replace function pg_temp.base_profile(target_version integer)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'version', target_version,
    'identityProfile', jsonb_build_object(
      'institutionName', 'I.C. Calvario-Covotta – don Lorenzo Milani',
      'logoAssetRef', null
    ),
    'headerProfile', jsonb_build_object('lines', jsonb_build_array('Istituto Comprensivo')),
    'footerProfile', jsonb_build_object('lines', '[]'::jsonb),
    'typographyProfile', jsonb_build_object(
      'bodyFontFamily', 'Arial',
      'headingFontFamily', 'Arial',
      'baseFontSizePt', 11,
      'lineHeight', 1.3
    ),
    'pageGeometryProfile', jsonb_build_object(
      'format', 'A4',
      'orientation', 'PORTRAIT',
      'marginTopMm', 18,
      'marginRightMm', 18,
      'marginBottomMm', 18,
      'marginLeftMm', 18
    ),
    'commonTableProfile', jsonb_build_object(
      'headerWeight', 'BOLD',
      'cellPaddingMm', 2,
      'repeatHeader', true
    ),
    'signatureProfile', jsonb_build_object(
      'showLocation', true,
      'showDate', true,
      'label', 'Il docente'
    ),
    'accessibilityProfile', jsonb_build_object(
      'minimumFontSizePt', 10,
      'highContrast', true,
      'tableHeadersRequired', true
    ),
    'sourceRevisionRefs', '[]'::jsonb
  );
$$;

insert into auth.users(id, email)
values
  ('00000000-0000-4000-8000-000000000901', 'doc-tpl-owner@example.invalid'),
  ('00000000-0000-4000-8000-000000000902', 'doc-tpl-admin@example.invalid'),
  ('00000000-0000-4000-8000-000000000903', 'doc-tpl-member@example.invalid'),
  ('00000000-0000-4000-8000-000000000904', 'doc-tpl-outsider@example.invalid')
on conflict (id) do nothing;

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-4000-8000-000000000910',
  'PERSONAL',
  'DOC-TPL lifecycle fixture',
  '00000000-0000-4000-8000-000000000901'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000910', '00000000-0000-4000-8000-000000000901', 'OWNER'),
  ('00000000-0000-4000-8000-000000000910', '00000000-0000-4000-8000-000000000902', 'ADMIN'),
  ('00000000-0000-4000-8000-000000000910', '00000000-0000-4000-8000-000000000903', 'MEMBER');

set role authenticated;

-- OWNER creates, reviews and activates both independent streams.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000901","aal":"aal2"}', false);
select public.create_document_template(
  '00000000-0000-4000-8000-000000000910'::uuid,
  'FINAL_REPORT',
  'Relazione finale'
) as family_id \gset
select pg_temp.assert_true(
  public.save_document_template_version(:'family_id'::uuid, 0, pg_temp.family_schema(1), '{}'::uuid[]) = 1,
  'OWNER saves family version 1'
);
select public.record_document_template_quality_review(
  :'family_id'::uuid, 1, 'PASS', '[]'::jsonb, 'Trusted family quality fixture'
);
select public.activate_document_template_version(:'family_id'::uuid, 1, true);
select pg_temp.assert_true(
  (select status = 'ACTIVE' and active_version_no = 1 from public.document_templates where id = :'family_id'::uuid),
  'OWNER activates family exact version'
);

select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000910'::uuid,
  'Veste istituzionale'
) as base_id \gset
select pg_temp.assert_true(
  public.save_institutional_base_version(:'base_id'::uuid, 0, pg_temp.base_profile(1), '{}'::uuid[]) = 1,
  'OWNER saves institutional base version 1'
);
select public.record_institutional_base_quality_review(
  :'base_id'::uuid, 1, 'PASS', '[]'::jsonb, 'Trusted base quality fixture'
);
select public.activate_institutional_base_version(:'base_id'::uuid, 1, true);
select pg_temp.assert_true(
  (select status = 'ACTIVE' and active_version_no = 1 from public.institutional_bases where id = :'base_id'::uuid),
  'OWNER activates institutional base exact version'
);

-- MEMBER may read but may not exercise lifecycle authority.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000903","aal":"aal2"}', false);
select pg_temp.assert_true(
  (select count(*) = 1 from public.document_templates where id = :'family_id'::uuid),
  'MEMBER can inspect family identity'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.institutional_bases where id = :'base_id'::uuid),
  'MEMBER can inspect institutional base identity'
);
select pg_temp.expect_failure(
  format('select public.block_document_template(%L::uuid,%L)', :'family_id', 'Member must not govern family'),
  'MEMBER cannot block family',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.block_institutional_base(%L::uuid,%L)', :'base_id', 'Member must not govern base'),
  'MEMBER cannot block institutional base',
  'institutional lifecycle authority required'
);

-- A non-member must not cross the workspace boundary.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000904","aal":"aal2"}', false);
select pg_temp.expect_failure(
  format('select public.block_document_template(%L::uuid,%L)', :'family_id', 'Outsider attempt'),
  'non-member cannot mutate family lifecycle',
  'template not available'
);
select pg_temp.expect_failure(
  format('select public.block_institutional_base(%L::uuid,%L)', :'base_id', 'Outsider attempt'),
  'non-member cannot mutate base lifecycle',
  'institutional base not available'
);

-- ADMIN can block; BLOCKED must reject save/review mutations until clearBlock.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000902","aal":"aal2"}', false);
select public.block_document_template(:'family_id'::uuid, 'Revisione istituzionale della famiglia');
select pg_temp.assert_true(
  (select status = 'BLOCKED' from public.document_templates where id = :'family_id'::uuid),
  'ADMIN blocks family'
);
select pg_temp.expect_failure(
  format(
    'select public.save_document_template_version(%L::uuid,1,%L::jsonb,''{}''::uuid[])',
    :'family_id', pg_temp.family_schema(2)::text
  ),
  'BLOCKED family rejects saveVersion',
  'BLOCKED'
);
select pg_temp.expect_failure(
  format(
    'select public.record_document_template_quality_review(%L::uuid,1,''PASS'',''[]''::jsonb,%L)',
    :'family_id', 'Blocked review attempt'
  ),
  'BLOCKED family rejects quality review',
  'BLOCKED'
);
select public.clear_document_template_block(:'family_id'::uuid, 'Rilievi family corretti');
select pg_temp.assert_true(
  (select status = 'REVIEW_REQUIRED' from public.document_templates where id = :'family_id'::uuid),
  'clearBlock returns family to REVIEW_REQUIRED without implicit activation'
);

select public.block_institutional_base(:'base_id'::uuid, 'Revisione istituzionale della veste');
select pg_temp.assert_true(
  (select status = 'BLOCKED' from public.institutional_bases where id = :'base_id'::uuid),
  'ADMIN blocks institutional base'
);
select pg_temp.expect_failure(
  format(
    'select public.save_institutional_base_version(%L::uuid,1,%L::jsonb,''{}''::uuid[])',
    :'base_id', pg_temp.base_profile(2)::text
  ),
  'BLOCKED institutional base rejects saveVersion',
  'BLOCKED'
);
select pg_temp.expect_failure(
  format(
    'select public.record_institutional_base_quality_review(%L::uuid,1,''PASS'',''[]''::jsonb,%L)',
    :'base_id', 'Blocked base review attempt'
  ),
  'BLOCKED institutional base rejects quality review',
  'BLOCKED'
);
select public.clear_institutional_base_block(:'base_id'::uuid, 'Rilievi veste corretti');
select pg_temp.assert_true(
  (select status = 'REVIEW_REQUIRED' from public.institutional_bases where id = :'base_id'::uuid),
  'clearBlock returns institutional base to REVIEW_REQUIRED without implicit activation'
);

-- OWNER may reactivate the reviewed version; ADMIN may then retire it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000901","aal":"aal2"}', false);
select public.activate_document_template_version(:'family_id'::uuid, 1, true);
select public.activate_institutional_base_version(:'base_id'::uuid, 1, true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000902","aal":"aal2"}', false);
select public.retire_document_template(:'family_id'::uuid, 'Famiglia sostituita');
select public.retire_institutional_base(:'base_id'::uuid, 'Veste sostituita');
select pg_temp.assert_true(
  (select status = 'RETIRED' and active_version_no is null from public.document_templates where id = :'family_id'::uuid),
  'retire makes family terminal and clears active pointer'
);
select pg_temp.assert_true(
  (select status = 'RETIRED' and active_version_no is null from public.institutional_bases where id = :'base_id'::uuid),
  'retire makes institutional base terminal and clears active pointer'
);
select pg_temp.assert_true(
  (select actor_workspace_role = 'ADMIN' from public.document_template_lifecycle_decisions where template_id = :'family_id'::uuid and action = 'RETIRE' order by decided_at desc, id desc limit 1),
  'family lifecycle evidence records trusted ADMIN role'
);
select pg_temp.assert_true(
  (select actor_workspace_role = 'ADMIN' from public.institutional_base_lifecycle_decisions where base_id = :'base_id'::uuid and action = 'RETIRE' order by decided_at desc, id desc limit 1),
  'base lifecycle evidence records trusted ADMIN role'
);

-- RETIRED is terminal for every mutating operation on both streams.
select pg_temp.expect_failure(
  format('select public.save_document_template_version(%L::uuid,1,%L::jsonb,''{}''::uuid[])', :'family_id', pg_temp.family_schema(2)::text),
  'RETIRED family rejects saveVersion', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.record_document_template_quality_review(%L::uuid,1,''PASS'',''[]''::jsonb,%L)', :'family_id', 'Retired review'),
  'RETIRED family rejects quality review', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.activate_document_template_version(%L::uuid,1,true)', :'family_id'),
  'RETIRED family rejects activate', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.block_document_template(%L::uuid,%L)', :'family_id', 'Retired block'),
  'RETIRED family rejects block', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.clear_document_template_block(%L::uuid,%L)', :'family_id', 'Retired clear'),
  'RETIRED family rejects clearBlock', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.retire_document_template(%L::uuid,%L)', :'family_id', 'Repeated retire'),
  'RETIRED family rejects repeated retire', 'RETIRED'
);

select pg_temp.expect_failure(
  format('select public.save_institutional_base_version(%L::uuid,1,%L::jsonb,''{}''::uuid[])', :'base_id', pg_temp.base_profile(2)::text),
  'RETIRED base rejects saveVersion', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.record_institutional_base_quality_review(%L::uuid,1,''PASS'',''[]''::jsonb,%L)', :'base_id', 'Retired base review'),
  'RETIRED base rejects quality review', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.activate_institutional_base_version(%L::uuid,1,true)', :'base_id'),
  'RETIRED base rejects activate', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.block_institutional_base(%L::uuid,%L)', :'base_id', 'Retired base block'),
  'RETIRED base rejects block', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.clear_institutional_base_block(%L::uuid,%L)', :'base_id', 'Retired base clear'),
  'RETIRED base rejects clearBlock', 'RETIRED'
);
select pg_temp.expect_failure(
  format('select public.retire_institutional_base(%L::uuid,%L)', :'base_id', 'Repeated base retire'),
  'RETIRED base rejects repeated retire', 'RETIRED'
);

-- Historical exact-pin reads remain available to a workspace MEMBER after retirement.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000903","aal":"aal2"}', false);
select pg_temp.assert_true(
  (public.document_template_version_snapshot(:'family_id'::uuid, 1)#>>'{version,version_no}')::integer = 1,
  'MEMBER can read retired family exact historical pin'
);
select pg_temp.assert_true(
  (public.institutional_base_version_snapshot(:'base_id'::uuid, 1)#>>'{version,version_no}')::integer = 1,
  'MEMBER can read retired base exact historical pin'
);

reset role;
rollback;
