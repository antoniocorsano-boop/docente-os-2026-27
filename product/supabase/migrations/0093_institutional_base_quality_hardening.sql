begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (93, '0093_institutional_base_quality_hardening')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- The institutional base is trusted presentation authority. Its database-side
-- review must validate the same typed profile contract as the application
-- domain before PASS can be persisted and later activated.
create or replace function private.compute_institutional_base_quality_review(target_profile_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  findings jsonb := '[]'::jsonb;
  line_node jsonb;
  version_number numeric;
  invalid_profile boolean;
begin
  if target_profile_json is null or jsonb_typeof(target_profile_json) <> 'object' then
    return jsonb_build_object(
      'result', 'BLOCKED',
      'findings', jsonb_build_array(jsonb_build_object(
        'code','INVALID_INSTITUTIONAL_BASE','severity','BLOCKER','category','STRUCTURE',
        'summary','Base istituzionale non valida.'
      ))
    );
  end if;

  if target_profile_json ? 'name' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','BASE_NAME_MUST_BE_IDENTITY_METADATA','severity','BLOCKER','category','STRUCTURE',
      'summary','Il nome appartiene all’identità stabile della base, non alla versione.'
    ));
  end if;

  if private.institutional_base_has_forbidden_layout_key(target_profile_json) then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','ARBITRARY_LAYOUT_PAYLOAD_FORBIDDEN','severity','BLOCKER','category','STRUCTURE',
      'summary','CSS, HTML o payload di layout arbitrario non sono ammessi nella base istituzionale.'
    ));
  end if;

  if jsonb_typeof(target_profile_json->'version') is distinct from 'number' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_INSTITUTIONAL_BASE_VERSION','severity','BLOCKER','category','STRUCTURE',
      'summary','Versione della base istituzionale non valida.'
    ));
  else
    version_number := (target_profile_json->>'version')::numeric;
    if version_number < 1 or trunc(version_number) <> version_number then
      findings := findings || jsonb_build_array(jsonb_build_object(
        'code','INVALID_INSTITUTIONAL_BASE_VERSION','severity','BLOCKER','category','STRUCTURE',
        'summary','Versione della base istituzionale non valida.'
      ));
    end if;
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'identityProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{identityProfile,institutionName}') is distinct from 'string'
      or nullif(trim(target_profile_json#>>'{identityProfile,institutionName}'), '') is null
      or not ((target_profile_json->'identityProfile') ? 'logoAssetRef')
      or jsonb_typeof(target_profile_json#>'{identityProfile,logoAssetRef}') not in ('string','null');
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_IDENTITY_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo di identità istituzionale non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'headerProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{headerProfile,lines}') is distinct from 'array';
    if not invalid_profile then
      for line_node in select value from jsonb_array_elements(target_profile_json#>'{headerProfile,lines}') loop
        if jsonb_typeof(line_node) <> 'string' or nullif(trim(line_node #>> '{}'), '') is null then
          invalid_profile := true;
          exit;
        end if;
      end loop;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_HEADER_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo di intestazione non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'footerProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{footerProfile,lines}') is distinct from 'array';
    if not invalid_profile then
      for line_node in select value from jsonb_array_elements(target_profile_json#>'{footerProfile,lines}') loop
        if jsonb_typeof(line_node) <> 'string' or nullif(trim(line_node #>> '{}'), '') is null then
          invalid_profile := true;
          exit;
        end if;
      end loop;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_FOOTER_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo di piè di pagina non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'typographyProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{typographyProfile,bodyFontFamily}') is distinct from 'string'
      or nullif(trim(target_profile_json#>>'{typographyProfile,bodyFontFamily}'), '') is null
      or jsonb_typeof(target_profile_json#>'{typographyProfile,headingFontFamily}') is distinct from 'string'
      or nullif(trim(target_profile_json#>>'{typographyProfile,headingFontFamily}'), '') is null
      or jsonb_typeof(target_profile_json#>'{typographyProfile,baseFontSizePt}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{typographyProfile,lineHeight}') is distinct from 'number';
    if not invalid_profile then
      invalid_profile := (target_profile_json#>>'{typographyProfile,baseFontSizePt}')::numeric <= 0
        or (target_profile_json#>>'{typographyProfile,lineHeight}')::numeric <= 0;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_TYPOGRAPHY_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo tipografico non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'pageGeometryProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := target_profile_json#>>'{pageGeometryProfile,format}' is distinct from 'A4'
      or coalesce(target_profile_json#>>'{pageGeometryProfile,orientation}', '') not in ('PORTRAIT','LANDSCAPE')
      or jsonb_typeof(target_profile_json#>'{pageGeometryProfile,marginTopMm}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{pageGeometryProfile,marginRightMm}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{pageGeometryProfile,marginBottomMm}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{pageGeometryProfile,marginLeftMm}') is distinct from 'number';
    if not invalid_profile then
      invalid_profile := (target_profile_json#>>'{pageGeometryProfile,marginTopMm}')::numeric <= 0
        or (target_profile_json#>>'{pageGeometryProfile,marginRightMm}')::numeric <= 0
        or (target_profile_json#>>'{pageGeometryProfile,marginBottomMm}')::numeric <= 0
        or (target_profile_json#>>'{pageGeometryProfile,marginLeftMm}')::numeric <= 0;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_PAGE_GEOMETRY_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo di geometria pagina non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'commonTableProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := coalesce(target_profile_json#>>'{commonTableProfile,headerWeight}', '') not in ('NORMAL','BOLD')
      or jsonb_typeof(target_profile_json#>'{commonTableProfile,cellPaddingMm}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{commonTableProfile,repeatHeader}') is distinct from 'boolean';
    if not invalid_profile then
      invalid_profile := (target_profile_json#>>'{commonTableProfile,cellPaddingMm}')::numeric <= 0;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_COMMON_TABLE_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo tabelle comuni non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'signatureProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{signatureProfile,showLocation}') is distinct from 'boolean'
      or jsonb_typeof(target_profile_json#>'{signatureProfile,showDate}') is distinct from 'boolean'
      or jsonb_typeof(target_profile_json#>'{signatureProfile,label}') is distinct from 'string'
      or nullif(trim(target_profile_json#>>'{signatureProfile,label}'), '') is null;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_SIGNATURE_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo firma non valido.'
    ));
  end if;

  invalid_profile := jsonb_typeof(target_profile_json->'accessibilityProfile') is distinct from 'object';
  if not invalid_profile then
    invalid_profile := jsonb_typeof(target_profile_json#>'{accessibilityProfile,minimumFontSizePt}') is distinct from 'number'
      or jsonb_typeof(target_profile_json#>'{accessibilityProfile,highContrast}') is distinct from 'boolean'
      or jsonb_typeof(target_profile_json#>'{accessibilityProfile,tableHeadersRequired}') is distinct from 'boolean';
    if not invalid_profile then
      invalid_profile := (target_profile_json#>>'{accessibilityProfile,minimumFontSizePt}')::numeric <= 0;
    end if;
  end if;
  if invalid_profile then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_ACCESSIBILITY_PROFILE','severity','BLOCKER','category','STRUCTURE',
      'summary','Profilo di accessibilità non valido.'
    ));
  end if;

  if jsonb_array_length(findings) > 0 then
    return jsonb_build_object('result','BLOCKED','findings',findings);
  end if;
  return jsonb_build_object('result','PASS','findings','[]'::jsonb);
end;
$$;

revoke all on function private.compute_institutional_base_quality_review(jsonb) from public;

-- Preserve the v0090 BLOCKED/RETIRED behavior while rejecting a string or
-- fractional version before immutable persistence.
alter function public.save_institutional_base_version(uuid, integer, jsonb, uuid[])
  rename to save_institutional_base_version_v0090;
revoke all on function public.save_institutional_base_version_v0090(uuid, integer, jsonb, uuid[]) from public, authenticated;

create function public.save_institutional_base_version(
  target_base_id uuid,
  expected_current_version integer,
  target_profile_json jsonb,
  target_source_revision_ids uuid[] default '{}'::uuid[]
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_version numeric;
begin
  if target_profile_json is null or jsonb_typeof(target_profile_json) <> 'object' then
    raise exception 'institutional base profile must be a JSON object';
  end if;
  if jsonb_typeof(target_profile_json->'version') is distinct from 'number' then
    raise exception 'institutional base version must be a JSON number';
  end if;
  profile_version := (target_profile_json->>'version')::numeric;
  if profile_version < 1 or trunc(profile_version) <> profile_version then
    raise exception 'institutional base version must be a positive integer';
  end if;

  return public.save_institutional_base_version_v0090(
    target_base_id,
    expected_current_version,
    target_profile_json,
    target_source_revision_ids
  );
end;
$$;

alter function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text)
  rename to record_institutional_base_quality_review_v0090;
revoke all on function public.record_institutional_base_quality_review_v0090(uuid, integer, text, jsonb, text) from public, authenticated;

create function public.record_institutional_base_quality_review(
  target_base_id uuid,
  target_version_no integer,
  target_result text,
  target_findings jsonb default '[]'::jsonb,
  target_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  profile jsonb;
  profile_version numeric;
begin
  if uid is null then raise exception 'authentication required'; end if;

  select base.workspace_id into workspace
  from public.institutional_bases base
  where base.id = target_base_id;
  if workspace is null or not private.is_workspace_member(workspace) then
    raise exception 'institutional base not available';
  end if;

  select version.profile_json into profile
  from public.institutional_base_versions version
  where version.base_id = target_base_id
    and version.version_no = target_version_no;
  if profile is null then raise exception 'institutional base version not available'; end if;
  if jsonb_typeof(profile->'version') is distinct from 'number' then
    raise exception 'INSTITUTIONAL_BASE_VERSION_MISMATCH';
  end if;
  profile_version := (profile->>'version')::numeric;
  if profile_version <> target_version_no::numeric or trunc(profile_version) <> profile_version then
    raise exception 'INSTITUTIONAL_BASE_VERSION_MISMATCH';
  end if;

  return public.record_institutional_base_quality_review_v0090(
    target_base_id,
    target_version_no,
    target_result,
    target_findings,
    target_note
  );
end;
$$;

revoke all on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) from public;
grant execute on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) to authenticated;

select private.advance_runtime_schema_contract('0093_institutional_base_quality_hardening');

commit;
