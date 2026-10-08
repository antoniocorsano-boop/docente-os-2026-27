begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (88, '0088_document_template_registry_review_fixes')
on conflict (version) do update
set migration_id = excluded.migration_id;

alter table public.document_template_sources
  drop constraint if exists document_template_sources_workspace_id_source_fingerprint_key;

drop index if exists public.uq_document_template_sources_provenance;
create unique index uq_document_template_sources_provenance
  on public.document_template_sources(
    workspace_id,
    source_fingerprint,
    source_kind,
    source_asset_id,
    source_revision_ref
  ) nulls not distinct;

create or replace function public.register_document_template_source(
  target_workspace_id uuid,
  target_source_asset_id uuid,
  target_source_revision_ref text,
  target_source_kind text,
  target_source_fingerprint text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  source_id uuid;
  safe_fingerprint text := nullif(trim(target_source_fingerprint), '');
  safe_revision_ref text := nullif(trim(target_source_revision_ref), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if target_source_kind not in ('INSTITUTION_OFFICIAL','INSTITUTION_WORKING_DRAFT','TEACHER_ADAPTED','HISTORICAL_REFERENCE','UNKNOWN') then
    raise exception 'invalid template source kind';
  end if;
  if safe_fingerprint is null or length(safe_fingerprint) > 256 then raise exception 'invalid source fingerprint'; end if;
  if target_source_asset_id is not null and not exists (
    select 1 from public.knowledge_assets asset
    where asset.id = target_source_asset_id
      and asset.workspace_id = target_workspace_id
  ) then raise exception 'source asset outside workspace'; end if;

  select source.id into source_id
  from public.document_template_sources source
  where source.workspace_id = target_workspace_id
    and source.source_fingerprint = safe_fingerprint
    and source.source_asset_id is not distinct from target_source_asset_id
    and source.source_revision_ref is not distinct from safe_revision_ref
    and source.source_kind = target_source_kind;

  if source_id is null then
    insert into public.document_template_sources(
      workspace_id, source_asset_id, source_revision_ref, source_kind,
      source_fingerprint, captured_by
    ) values (
      target_workspace_id, target_source_asset_id,
      safe_revision_ref, target_source_kind,
      safe_fingerprint, uid
    ) returning id into source_id;
  end if;

  return source_id;
end;
$$;

create or replace function public.save_document_template_version(
  target_template_id uuid,
  expected_current_version integer,
  target_schema_json jsonb,
  target_source_revision_ids uuid[] default '{}'::uuid[]
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_no integer;
  next_no integer;
  invalid_source_count integer;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if target_schema_json is null or jsonb_typeof(target_schema_json) <> 'object' then raise exception 'template schema must be a JSON object'; end if;

  select template.workspace_id, template.current_version_no
    into workspace, current_no
  from public.document_templates template
  where template.id = target_template_id
  for update;

  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if current_no <> expected_current_version then raise exception 'template changed; reload before saving'; end if;

  select count(*) into invalid_source_count
  from unnest(coalesce(target_source_revision_ids, '{}'::uuid[])) source_id
  where not exists (
    select 1 from public.document_template_sources source
    where source.id = source_id and source.workspace_id = workspace
  );
  if invalid_source_count > 0 then raise exception 'template source outside workspace'; end if;

  next_no := current_no + 1;
  insert into public.document_template_versions(
    template_id, version_no, schema_json, source_revision_ids, created_by
  ) values (
    target_template_id, next_no, target_schema_json,
    coalesce(target_source_revision_ids, '{}'::uuid[]), uid
  );

  update public.document_templates
  set current_version_no = next_no,
      status = case
        when active_version_no is not null then 'ACTIVE'
        else 'DRAFT'
      end,
      updated_at = now()
  where id = target_template_id;

  return next_no;
end;
$$;

create or replace function public.record_document_template_quality_review(
  target_template_id uuid,
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
  template_kind text;
  review_id uuid;
  version_schema jsonb;
  computed_review jsonb;
  computed_result text;
  computed_findings jsonb;
  external_text text;
  section_node jsonb;
  field_node jsonb;
  option_node jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if target_result not in ('PASS','PASS_WITH_NOTES','REVIEW_REQUIRED','BLOCKED') then raise exception 'invalid quality review result'; end if;
  if target_findings is null or jsonb_typeof(target_findings) <> 'array' then raise exception 'quality review findings must be an array'; end if;

  select template.workspace_id, template.document_kind
    into workspace, template_kind
  from public.document_templates template
  where template.id = target_template_id;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;

  select version.schema_json into version_schema
  from public.document_template_versions version
  where version.template_id = target_template_id
    and version.version_no = target_version_no;
  if version_schema is null then raise exception 'template version not available'; end if;

  if version_schema->>'kind' is distinct from template_kind then
    raise exception 'TEMPLATE_KIND_MISMATCH';
  end if;
  if jsonb_typeof(version_schema->'version') <> 'number' then
    raise exception 'TEMPLATE_VERSION_MISMATCH';
  end if;
  if (version_schema->>'version')::numeric <> target_version_no::numeric then
    raise exception 'TEMPLATE_VERSION_MISMATCH';
  end if;

  computed_review := private.compute_document_template_quality_review(version_schema);
  computed_result := computed_review->>'result';
  computed_findings := coalesce(computed_review->'findings', '[]'::jsonb);

  external_text := coalesce(version_schema->>'name', '');
  if jsonb_typeof(version_schema->'sections') = 'array' then
    for section_node in select value from jsonb_array_elements(version_schema->'sections') loop
      external_text := external_text || E'\n'
        || coalesce(section_node->>'label', '') || E'\n'
        || coalesce(section_node->>'purpose', '');

      if jsonb_typeof(section_node->'fields') = 'array' then
        for field_node in select value from jsonb_array_elements(section_node->'fields') loop
          external_text := external_text || E'\n'
            || coalesce(field_node->>'label', '') || E'\n'
            || coalesce(field_node->>'helpText', '');

          if jsonb_typeof(field_node->'options') = 'array' then
            for option_node in select value from jsonb_array_elements(field_node->'options') loop
              external_text := external_text || E'\n' || coalesce(option_node->>'label', '');
            end loop;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  if external_text ~ '(^|[^[:alnum:]_])(AUTO_DOCUMENTED|TEACHER_CONFIRMATION|OPTIONAL_PROPOSAL|RESTRICTED|QUALITY_REVIEWED|REVIEW_REQUIRED|TEACHER_CONFIRMED|TO_VERIFY|MIXED)([^[:alnum:]_]|$)'
     and not exists (
       select 1
       from jsonb_array_elements(computed_findings) finding
       where finding->>'code' = 'EXTERNAL_INTERNAL_STATE'
     ) then
    computed_findings := computed_findings || jsonb_build_array(jsonb_build_object(
      'code', 'EXTERNAL_INTERNAL_STATE',
      'severity', 'BLOCKER',
      'category', 'EXTERNAL_PURITY',
      'summary', 'Il testo professionale contiene un riferimento tecnico vietato (INTERNAL_STATE).'
    ));
    computed_result := 'BLOCKED';
  end if;

  if target_result is distinct from computed_result then
    raise exception 'quality review does not match deterministic review';
  end if;

  insert into public.document_template_quality_reviews(
    template_id, version_no, result, findings, note, reviewed_by
  ) values (
    target_template_id, target_version_no, computed_result, computed_findings,
    nullif(trim(target_note), ''), uid
  ) returning id into review_id;

  update public.document_templates
  set status = case
    when active_version_no is not null then 'ACTIVE'
    when computed_result in ('PASS','PASS_WITH_NOTES') then 'QUALITY_REVIEWED'
    when computed_result = 'REVIEW_REQUIRED' then 'REVIEW_REQUIRED'
    else 'BLOCKED'
  end,
  updated_at = now()
  where id = target_template_id
    and current_version_no = target_version_no;

  return review_id;
end;
$$;

revoke all on function public.register_document_template_source(uuid, uuid, text, text, text) from public;
revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) from public;

grant execute on function public.register_document_template_source(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) to authenticated;

select private.advance_runtime_schema_contract('0088_document_template_registry_review_fixes');

commit;
