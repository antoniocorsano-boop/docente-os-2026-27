begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (95, '0095_document_template_trusted_purity')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Professional-output purity is part of the trusted activation boundary.
-- Keep one database-side scanner and reuse it for both independently versioned
-- streams so a persisted PASS cannot disagree with the application gate.
create or replace function private.professional_output_purity_findings(target_text text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  findings jsonb := '[]'::jsonb;
  safe_text text := coalesce(target_text, '');
begin
  if safe_text ~* '(^|[^[:alnum:]_])CAN-[A-Z0-9-]+([^[:alnum:]_]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_CAN_CODE','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (CAN_CODE).'
    ));
  end if;

  if safe_text ~ '(^|[^[:alnum:]_])B(0[1-9]|[12][0-9]|3[0-3])([^[:alnum:]_]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_BXX_CODE','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (BXX_CODE).'
    ));
  end if;

  if safe_text ~* '(^|[^0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}([^0-9a-f]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_UUID','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (UUID).'
    ));
  end if;

  if safe_text ~* '(^|[^[:alnum:]_])(TeachingSession|KnowledgeAsset|authored_documents?|document_templates?|document_template_versions?|document_template_quality_reviews?|document_template_lifecycle_decisions?|institutional_bases?|institutional_base_versions?|institutional_base_quality_reviews?|institutional_base_lifecycle_decisions?)([^[:alnum:]_]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_SOFTWARE_ENTITY','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (SOFTWARE_ENTITY).'
    ));
  end if;

  if safe_text ~ '(^|[^[:alnum:]_])(DRAFT|QUALITY_REVIEWED|REVIEW_REQUIRED|ACTIVE|RETIRED|BLOCKED|PASS_WITH_NOTES|PASS|AUTO_DOCUMENTED|DERIVED|TEACHER_INPUT|STATIC|TEACHER_CONFIRMATION|OPTIONAL_PROPOSAL|RESTRICTED|PUBLIC_INSTITUTIONAL|PROFESSIONAL_CONTEXT|AGGREGATE_CLASS_DATA|SENSITIVE_AGGREGATE|PERSONAL_STUDENT_DATA|SPECIAL_CATEGORY_DATA|TEACHER_CONFIRMED|TO_VERIFY|MIXED)([^[:alnum:]_]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_INTERNAL_STATE','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (INTERNAL_STATE).'
    ));
  end if;

  if safe_text ~* '(^|[^0-9a-f])[0-9a-f]{40,64}([^0-9a-f]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_HASH','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (HASH).'
    ));
  end if;

  if safe_text ~* '(drive://|/Google Drive/|https://drive\.google\.com/)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_DRIVE_PATH','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (DRIVE_PATH).'
    ));
  end if;

  if safe_text ~* '(^|[^[:alnum:]_])(OpenAI|GPT-[0-9.]+|Claude|Gemini|DeepSeek|Groq|Hugging[[:space:]]*Face)([^[:alnum:]_]|$)' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_AI_PROVIDER','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (AI_PROVIDER).'
    ));
  end if;

  if safe_text ~* 'generat[oa][[:space:]]+automaticamente' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','EXTERNAL_AUTO_GENERATED_WORDING','severity','BLOCKER','category','EXTERNAL_PURITY',
      'summary','Il testo professionale contiene un riferimento tecnico vietato (AUTO_GENERATED_WORDING).'
    ));
  end if;

  return findings;
end;
$$;

revoke all on function private.professional_output_purity_findings(text) from public;

create or replace function private.document_template_external_purity_findings(target_schema_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  external_text text := '';
  section_node jsonb;
  field_node jsonb;
  option_node jsonb;
begin
  if target_schema_json is null or jsonb_typeof(target_schema_json) <> 'object' then
    return '[]'::jsonb;
  end if;

  external_text := coalesce(target_schema_json->>'name', '');

  if jsonb_typeof(target_schema_json->'sections') = 'array' then
    for section_node in select value from jsonb_array_elements(target_schema_json->'sections') loop
      if jsonb_typeof(section_node) <> 'object' then
        continue;
      end if;

      external_text := external_text || E'\n'
        || coalesce(section_node->>'label', '') || E'\n'
        || coalesce(section_node->>'purpose', '');

      if jsonb_typeof(section_node->'fields') = 'array' then
        for field_node in select value from jsonb_array_elements(section_node->'fields') loop
          if jsonb_typeof(field_node) <> 'object' then
            continue;
          end if;

          external_text := external_text || E'\n'
            || coalesce(field_node->>'label', '') || E'\n'
            || coalesce(field_node->>'helpText', '');

          if jsonb_typeof(field_node->'options') = 'array' then
            for option_node in select value from jsonb_array_elements(field_node->'options') loop
              if jsonb_typeof(option_node) = 'object' then
                external_text := external_text || E'\n' || coalesce(option_node->>'label', '');
              end if;
            end loop;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  return private.professional_output_purity_findings(external_text);
end;
$$;

revoke all on function private.document_template_external_purity_findings(jsonb) from public;

create or replace function private.institutional_base_external_purity_findings(target_profile_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  external_text text := '';
  line_node jsonb;
begin
  if target_profile_json is null or jsonb_typeof(target_profile_json) <> 'object' then
    return '[]'::jsonb;
  end if;

  if jsonb_typeof(target_profile_json#>'{identityProfile,institutionName}') = 'string' then
    external_text := external_text || coalesce(target_profile_json#>>'{identityProfile,institutionName}', '');
  end if;

  if jsonb_typeof(target_profile_json#>'{headerProfile,lines}') = 'array' then
    for line_node in select value from jsonb_array_elements(target_profile_json#>'{headerProfile,lines}') loop
      if jsonb_typeof(line_node) = 'string' then
        external_text := external_text || E'\n' || coalesce(line_node #>> '{}', '');
      end if;
    end loop;
  end if;

  if jsonb_typeof(target_profile_json#>'{footerProfile,lines}') = 'array' then
    for line_node in select value from jsonb_array_elements(target_profile_json#>'{footerProfile,lines}') loop
      if jsonb_typeof(line_node) = 'string' then
        external_text := external_text || E'\n' || coalesce(line_node #>> '{}', '');
      end if;
    end loop;
  end if;

  if jsonb_typeof(target_profile_json#>'{signatureProfile,label}') = 'string' then
    external_text := external_text || E'\n' || coalesce(target_profile_json#>>'{signatureProfile,label}', '');
  end if;

  return private.professional_output_purity_findings(external_text);
end;
$$;

revoke all on function private.institutional_base_external_purity_findings(jsonb) from public;

-- Wrap the existing deterministic family reviewer. Preserve all structural and
-- privacy findings, append trusted purity findings not already present, and
-- force BLOCKED whenever professional output purity is violated.
alter function private.compute_document_template_quality_review(jsonb)
  rename to compute_document_template_quality_review_v0087;
revoke all on function private.compute_document_template_quality_review_v0087(jsonb) from public;

create function private.compute_document_template_quality_review(target_schema_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  legacy_review jsonb;
  findings jsonb;
  purity_findings jsonb;
  purity_finding jsonb;
  final_result text;
begin
  legacy_review := private.compute_document_template_quality_review_v0087(target_schema_json);
  findings := coalesce(legacy_review->'findings', '[]'::jsonb);
  purity_findings := private.document_template_external_purity_findings(target_schema_json);

  for purity_finding in select value from jsonb_array_elements(purity_findings) loop
    if not exists (
      select 1
      from jsonb_array_elements(findings) existing
      where existing->>'code' = purity_finding->>'code'
    ) then
      findings := findings || jsonb_build_array(purity_finding);
    end if;
  end loop;

  if jsonb_array_length(purity_findings) > 0 then
    final_result := 'BLOCKED';
  else
    final_result := legacy_review->>'result';
  end if;

  return jsonb_build_object('result', final_result, 'findings', findings);
end;
$$;

revoke all on function private.compute_document_template_quality_review(jsonb) from public;

-- Apply the same trusted purity boundary to the institutional-base stream while
-- preserving the complete v0093 structural validation.
alter function private.compute_institutional_base_quality_review(jsonb)
  rename to compute_institutional_base_quality_review_v0093;
revoke all on function private.compute_institutional_base_quality_review_v0093(jsonb) from public;

create function private.compute_institutional_base_quality_review(target_profile_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  legacy_review jsonb;
  findings jsonb;
  purity_findings jsonb;
  purity_finding jsonb;
  final_result text;
begin
  legacy_review := private.compute_institutional_base_quality_review_v0093(target_profile_json);
  findings := coalesce(legacy_review->'findings', '[]'::jsonb);
  purity_findings := private.institutional_base_external_purity_findings(target_profile_json);

  for purity_finding in select value from jsonb_array_elements(purity_findings) loop
    if not exists (
      select 1
      from jsonb_array_elements(findings) existing
      where existing->>'code' = purity_finding->>'code'
    ) then
      findings := findings || jsonb_build_array(purity_finding);
    end if;
  end loop;

  if jsonb_array_length(purity_findings) > 0 then
    final_result := 'BLOCKED';
  else
    final_result := legacy_review->>'result';
  end if;

  return jsonb_build_object('result', final_result, 'findings', findings);
end;
$$;

revoke all on function private.compute_institutional_base_quality_review(jsonb) from public;

-- The pre-v0095 base RPC required callers to reproduce the complete findings
-- array. That makes the client, not the trusted reviewer, the effective source
-- of truth. Preserve all lifecycle guards in the v0094 chain, but always pass
-- the database-computed findings into that chain. This mirrors the family RPC.
alter function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text)
  rename to record_institutional_base_quality_review_v0094;
revoke all on function public.record_institutional_base_quality_review_v0094(uuid, integer, text, jsonb, text) from public, authenticated;

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
  computed jsonb;
  computed_result text;
  computed_findings jsonb;
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

  computed := private.compute_institutional_base_quality_review(profile);
  computed_result := computed->>'result';
  computed_findings := coalesce(computed->'findings', '[]'::jsonb);

  if target_result is distinct from computed_result then
    raise exception 'quality review does not match deterministic review';
  end if;

  return public.record_institutional_base_quality_review_v0094(
    target_base_id,
    target_version_no,
    computed_result,
    computed_findings,
    target_note
  );
end;
$$;

revoke all on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) from public;
grant execute on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) to authenticated;

select private.advance_runtime_schema_contract('0095_document_template_trusted_purity');

commit;
