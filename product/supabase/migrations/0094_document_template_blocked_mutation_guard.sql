begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (94, '0094_document_template_blocked_mutation_guard')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Preserve the fully hardened implementations available after v0093, but put
-- a fail-closed identity-state guard in front of every mutable save/review
-- boundary. BLOCKED identities are immutable until clearBlock; RETIRED remains
-- terminal. Authorization is resolved before status-specific errors so callers
-- outside the workspace cannot infer lifecycle state.
alter function public.save_document_template_version(uuid, integer, jsonb, uuid[])
  rename to save_document_template_version_v0093;
alter function public.record_document_template_quality_review(uuid, integer, text, jsonb, text)
  rename to record_document_template_quality_review_v0093;
alter function public.save_institutional_base_version(uuid, integer, jsonb, uuid[])
  rename to save_institutional_base_version_v0093;
alter function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text)
  rename to record_institutional_base_quality_review_v0093;

revoke all on function public.save_document_template_version_v0093(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.record_document_template_quality_review_v0093(uuid, integer, text, jsonb, text) from public, authenticated;
revoke all on function public.save_institutional_base_version_v0093(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.record_institutional_base_quality_review_v0093(uuid, integer, text, jsonb, text) from public, authenticated;

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

  return public.save_document_template_version_v0093(
    target_template_id,
    expected_current_version,
    target_schema_json,
    target_source_revision_ids
  );
end;
$$;

create function public.record_document_template_quality_review(
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
  current_status text;
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

  return public.record_document_template_quality_review_v0093(
    target_template_id,
    target_version_no,
    target_result,
    target_findings,
    target_note
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

  return public.save_institutional_base_version_v0093(
    target_base_id,
    expected_current_version,
    target_profile_json,
    target_source_revision_ids
  );
end;
$$;

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
  current_status text;
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

  return public.record_institutional_base_quality_review_v0093(
    target_base_id,
    target_version_no,
    target_result,
    target_findings,
    target_note
  );
end;
$$;

revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) from public;

grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) to authenticated;

select private.advance_runtime_schema_contract('0094_document_template_blocked_mutation_guard');

commit;
