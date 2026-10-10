begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (96, '0096_document_template_structural_ingress_guard')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Immutable version registries are not draft scratchpads. A payload may enter
-- either registry only when the trusted reviewer considers its shape
-- structurally valid. Privacy and professional-output purity remain quality
-- review concerns and therefore do not block persistence here.
alter function public.save_document_template_version(uuid, integer, jsonb, uuid[])
  rename to save_document_template_version_v0094;
alter function public.save_institutional_base_version(uuid, integer, jsonb, uuid[])
  rename to save_institutional_base_version_v0094;

revoke all on function public.save_document_template_version_v0094(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.save_institutional_base_version_v0094(uuid, integer, jsonb, uuid[]) from public, authenticated;

create function public.save_document_template_version(
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
  current_status text;
  computed_review jsonb;
  has_structural_finding boolean;
begin
  if uid is null then raise exception 'authentication required'; end if;

  select template.workspace_id, template.status
    into workspace, current_status
  from public.document_templates template
  where template.id = target_template_id
  for update;

  if workspace is null or not private.is_workspace_member(workspace) then
    raise exception 'template not available';
  end if;
  if current_status = 'BLOCKED' then
    raise exception 'cannot mutate BLOCKED identity';
  end if;
  if current_status = 'RETIRED' then
    raise exception 'cannot mutate RETIRED identity';
  end if;
  if target_schema_json is null or jsonb_typeof(target_schema_json) <> 'object' then
    raise exception 'template schema must be a JSON object';
  end if;
  if jsonb_typeof(target_schema_json->'version') is distinct from 'number' then
    raise exception 'template version must be a JSON number';
  end if;

  computed_review := private.compute_document_template_quality_review(target_schema_json);
  select exists (
    select 1
    from jsonb_array_elements(coalesce(computed_review->'findings', '[]'::jsonb)) finding
    where finding->>'category' = 'STRUCTURE'
  ) into has_structural_finding;

  if has_structural_finding then
    raise exception 'template schema structurally invalid';
  end if;

  return public.save_document_template_version_v0094(
    target_template_id,
    expected_current_version,
    target_schema_json,
    target_source_revision_ids
  );
end;
$$;

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
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  profile_version numeric;
  computed_review jsonb;
  has_structural_finding boolean;
begin
  if uid is null then raise exception 'authentication required'; end if;

  select base.workspace_id, base.status
    into workspace, current_status
  from public.institutional_bases base
  where base.id = target_base_id
  for update;

  if workspace is null or not private.is_workspace_member(workspace) then
    raise exception 'institutional base not available';
  end if;
  if current_status = 'BLOCKED' then
    raise exception 'cannot mutate BLOCKED identity';
  end if;
  if current_status = 'RETIRED' then
    raise exception 'cannot mutate RETIRED identity';
  end if;
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

  computed_review := private.compute_institutional_base_quality_review(target_profile_json);
  select exists (
    select 1
    from jsonb_array_elements(coalesce(computed_review->'findings', '[]'::jsonb)) finding
    where finding->>'category' = 'STRUCTURE'
  ) into has_structural_finding;

  if has_structural_finding then
    raise exception 'institutional base profile structurally invalid';
  end if;

  return public.save_institutional_base_version_v0094(
    target_base_id,
    expected_current_version,
    target_profile_json,
    target_source_revision_ids
  );
end;
$$;

revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) from public;
grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) to authenticated;

select private.advance_runtime_schema_contract('0096_document_template_structural_ingress_guard');

commit;
