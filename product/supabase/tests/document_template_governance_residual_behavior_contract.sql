\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(ok boolean, label text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'DOC-TPL residual governance FAIL: %', label;
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
      if position('DOC_TPL_UNEXPECTED_SUCCESS:' in sqlerrm) = 1 then raise; end if;
      if position(expected_fragment in sqlerrm) = 0 then
        raise exception 'DOC-TPL residual governance FAIL: % (expected error containing %, got %)',
          label, expected_fragment, sqlerrm;
      end if;
      raise notice 'PASS: %', label;
  end;
end;
$$;

create or replace function pg_temp.family_schema(target_version integer, target_label text default 'Intestazione')
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
      'label', target_label,
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

create or replace function pg_temp.base_profile(target_version integer, target_header text default 'Istituto Comprensivo')
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
    'headerProfile', jsonb_build_object('lines', jsonb_build_array(target_header)),
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
  ('00000000-0000-4000-8000-000000000921', 'doc-tpl-residual-owner@example.invalid'),
  ('00000000-0000-4000-8000-000000000922', 'doc-tpl-residual-member@example.invalid')
on conflict (id) do nothing;

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-4000-8000-000000000930',
  'PERSONAL',
  'DOC-TPL residual governance fixture',
  '00000000-0000-4000-8000-000000000921'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000930', '00000000-0000-4000-8000-000000000921', 'OWNER'),
  ('00000000-0000-4000-8000-000000000930', '00000000-0000-4000-8000-000000000922', 'MEMBER');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000921","aal":"aal2"}', false);

-- Structurally invalid payloads must never enter either immutable version registry.
select public.create_document_template(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'FINAL_REPORT',
  'Relazione finale structural-ingress fixture'
) as ingress_family_id \gset
select pg_temp.expect_failure(
  format(
    'select public.save_document_template_version(%L::uuid,0,%L::jsonb,''{}''::uuid[])',
    :'ingress_family_id', '{"version":1}'::jsonb::text
  ),
  'family save rejects structurally invalid schema before persistence',
  'template schema structurally invalid'
);
select pg_temp.assert_true(
  (select current_version_no = 0 from public.document_templates where id = :'ingress_family_id'::uuid),
  'family rejected schema does not advance current_version_no'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.document_template_versions where template_id = :'ingress_family_id'::uuid),
  'family rejected schema creates no immutable version row'
);

select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'Veste structural-ingress fixture'
) as ingress_base_id \gset
select pg_temp.expect_failure(
  format(
    'select public.save_institutional_base_version(%L::uuid,0,%L::jsonb,''{}''::uuid[])',
    :'ingress_base_id', '{"version":1}'::jsonb::text
  ),
  'institutional-base save rejects structurally invalid profile before persistence',
  'institutional base profile structurally invalid'
);
select pg_temp.assert_true(
  (select current_version_no = 0 from public.institutional_bases where id = :'ingress_base_id'::uuid),
  'base rejected profile does not advance current_version_no'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.institutional_base_versions where base_id = :'ingress_base_id'::uuid),
  'base rejected profile creates no immutable version row'
);

-- Trusted purity must fail closed on both independent streams.
select public.create_document_template(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'FINAL_REPORT',
  'Relazione finale purity fixture'
) as purity_family_id \gset
select public.save_document_template_version(
  :'purity_family_id'::uuid,
  0,
  pg_temp.family_schema(1, 'TEACHER_INPUT'),
  '{}'::uuid[]
);
select public.record_document_template_quality_review(
  :'purity_family_id'::uuid,
  1,
  'BLOCKED',
  '[]'::jsonb,
  'Trusted purity fixture'
);
select pg_temp.assert_true(
  (select status = 'BLOCKED' from public.document_templates where id = :'purity_family_id'::uuid),
  'family trusted review blocks serialized internal policy in professional text'
);

select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'Veste purity fixture'
) as purity_base_id \gset
select public.save_institutional_base_version(
  :'purity_base_id'::uuid,
  0,
  pg_temp.base_profile(1, 'document_template_versions'),
  '{}'::uuid[]
);
select public.record_institutional_base_quality_review(
  :'purity_base_id'::uuid,
  1,
  'BLOCKED',
  '[]'::jsonb,
  'Trusted purity fixture'
);
select pg_temp.assert_true(
  (select status = 'BLOCKED' from public.institutional_bases where id = :'purity_base_id'::uuid),
  'institutional-base trusted review blocks database entity in professional text'
);

-- Create clean identities to exercise authorization independently from purity.
select public.create_document_template(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'FINAL_REPORT',
  'Relazione finale lifecycle fixture'
) as family_id \gset
select public.save_document_template_version(:'family_id'::uuid, 0, pg_temp.family_schema(1), '{}'::uuid[]);
select public.record_document_template_quality_review(:'family_id'::uuid, 1, 'PASS', '[]'::jsonb, 'Trusted quality fixture');
select public.activate_document_template_version(:'family_id'::uuid, 1, true);
select public.block_document_template(:'family_id'::uuid, 'Prepare MEMBER authorization checks');

select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000930'::uuid,
  'Veste lifecycle fixture'
) as base_id \gset
select public.save_institutional_base_version(:'base_id'::uuid, 0, pg_temp.base_profile(1), '{}'::uuid[]);
select public.record_institutional_base_quality_review(:'base_id'::uuid, 1, 'PASS', '[]'::jsonb, 'Trusted quality fixture');
select public.activate_institutional_base_version(:'base_id'::uuid, 1, true);
select public.block_institutional_base(:'base_id'::uuid, 'Prepare MEMBER authorization checks');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000922","aal":"aal2"}', false);

select pg_temp.expect_failure(
  format('select public.activate_document_template_version(%L::uuid,1,true)', :'family_id'),
  'MEMBER cannot activate family',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.clear_document_template_block(%L::uuid,%L)', :'family_id', 'Member clear attempt'),
  'MEMBER cannot clear family block',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.retire_document_template(%L::uuid,%L)', :'family_id', 'Member retire attempt'),
  'MEMBER cannot retire family',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.activate_institutional_base_version(%L::uuid,1,true)', :'base_id'),
  'MEMBER cannot activate institutional base',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.clear_institutional_base_block(%L::uuid,%L)', :'base_id', 'Member clear attempt'),
  'MEMBER cannot clear institutional base block',
  'institutional lifecycle authority required'
);
select pg_temp.expect_failure(
  format('select public.retire_institutional_base(%L::uuid,%L)', :'base_id', 'Member retire attempt'),
  'MEMBER cannot retire institutional base',
  'institutional lifecycle authority required'
);

-- Missing auth identity must be rejected before any lifecycle mutation.
select set_config('request.jwt.claims', '{}', false);
select pg_temp.expect_failure(
  format('select public.block_document_template(%L::uuid,%L)', :'family_id', 'Unauthenticated attempt'),
  'missing auth identity cannot mutate family lifecycle',
  'authentication required'
);
select pg_temp.expect_failure(
  format('select public.block_institutional_base(%L::uuid,%L)', :'base_id', 'Unauthenticated attempt'),
  'missing auth identity cannot mutate base lifecycle',
  'authentication required'
);

reset role;
rollback;
