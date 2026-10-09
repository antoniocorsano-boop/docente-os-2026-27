begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (90, '0090_document_template_lifecycle_contract_fixes')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Lifecycle evidence must persist the trusted workspace role used to authorize
-- the decision. Backfill is fail-closed for any pre-existing branch data.
alter table public.document_template_lifecycle_decisions
  add column if not exists actor_workspace_role text;
alter table public.institutional_base_lifecycle_decisions
  add column if not exists actor_workspace_role text;

update public.document_template_lifecycle_decisions decision
set actor_workspace_role = membership.role
from public.document_templates template,
     public.workspace_memberships membership
where template.id = decision.template_id
  and membership.workspace_id = template.workspace_id
  and membership.user_id = decision.decided_by
  and membership.role in ('OWNER', 'ADMIN')
  and decision.actor_workspace_role is null;

update public.institutional_base_lifecycle_decisions decision
set actor_workspace_role = membership.role
from public.institutional_bases base,
     public.workspace_memberships membership
where base.id = decision.base_id
  and membership.workspace_id = base.workspace_id
  and membership.user_id = decision.decided_by
  and membership.role in ('OWNER', 'ADMIN')
  and decision.actor_workspace_role is null;

do $$
begin
  if exists (
    select 1 from public.document_template_lifecycle_decisions
    where actor_workspace_role is null
  ) or exists (
    select 1 from public.institutional_base_lifecycle_decisions
    where actor_workspace_role is null
  ) then
    raise exception 'cannot establish trusted actor workspace role for lifecycle evidence';
  end if;
end;
$$;

alter table public.document_template_lifecycle_decisions
  alter column actor_workspace_role set not null;
alter table public.institutional_base_lifecycle_decisions
  alter column actor_workspace_role set not null;

alter table public.document_template_lifecycle_decisions
  add constraint ck_document_template_lifecycle_actor_role
  check (actor_workspace_role in ('OWNER', 'ADMIN'));
alter table public.institutional_base_lifecycle_decisions
  add constraint ck_institutional_base_lifecycle_actor_role
  check (actor_workspace_role in ('OWNER', 'ADMIN'));

create or replace function private.institutional_lifecycle_actor_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select membership.role::text
  from public.workspace_memberships membership
  where membership.workspace_id = target_workspace_id
    and membership.user_id = (select auth.uid())
    and membership.role in ('OWNER', 'ADMIN')
  limit 1;
$$;

revoke all on function private.institutional_lifecycle_actor_role(uuid) from public;

-- Preserve v0089 behavior behind wrappers that keep BLOCKED terminal until
-- the explicit clearBlock transition.
alter function public.save_document_template_version(uuid, integer, jsonb, uuid[])
  rename to save_document_template_version_v0089;
alter function public.record_document_template_quality_review(uuid, integer, text, jsonb, text)
  rename to record_document_template_quality_review_v0089;
alter function public.save_institutional_base_version(uuid, integer, jsonb, uuid[])
  rename to save_institutional_base_version_v0089;
alter function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text)
  rename to record_institutional_base_quality_review_v0089;

revoke all on function public.save_document_template_version_v0089(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.record_document_template_quality_review_v0089(uuid, integer, text, jsonb, text) from public, authenticated;
revoke all on function public.save_institutional_base_version_v0089(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.record_institutional_base_quality_review_v0089(uuid, integer, text, jsonb, text) from public, authenticated;

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
  current_status text;
  saved_version integer;
begin
  select template.status into current_status
  from public.document_templates template
  where template.id = target_template_id
  for update;

  saved_version := public.save_document_template_version_v0089(
    target_template_id,
    expected_current_version,
    target_schema_json,
    target_source_revision_ids
  );

  if current_status = 'BLOCKED' then
    -- preserve BLOCKED until clearBlock
    update public.document_templates
    set status = 'BLOCKED', updated_at = now()
    where id = target_template_id;
  end if;

  return saved_version;
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
  current_status text;
  review_id uuid;
begin
  select template.status into current_status
  from public.document_templates template
  where template.id = target_template_id
  for update;

  review_id := public.record_document_template_quality_review_v0089(
    target_template_id,
    target_version_no,
    target_result,
    target_findings,
    target_note
  );

  if current_status = 'BLOCKED' then
    -- preserve BLOCKED until clearBlock
    update public.document_templates
    set status = 'BLOCKED', updated_at = now()
    where id = target_template_id;
  end if;

  return review_id;
end;
$$;

create or replace function public.save_institutional_base_version(
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
  current_status text;
  saved_version integer;
begin
  select base.status into current_status
  from public.institutional_bases base
  where base.id = target_base_id
  for update;

  saved_version := public.save_institutional_base_version_v0089(
    target_base_id,
    expected_current_version,
    target_profile_json,
    target_source_revision_ids
  );

  if current_status = 'BLOCKED' then
    -- preserve BLOCKED until clearBlock
    update public.institutional_bases
    set status = 'BLOCKED', updated_at = now()
    where id = target_base_id;
  end if;

  return saved_version;
end;
$$;

create or replace function public.record_institutional_base_quality_review(
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
  current_status text;
  review_id uuid;
begin
  select base.status into current_status
  from public.institutional_bases base
  where base.id = target_base_id
  for update;

  review_id := public.record_institutional_base_quality_review_v0089(
    target_base_id,
    target_version_no,
    target_result,
    target_findings,
    target_note
  );

  if current_status = 'BLOCKED' then
    -- preserve BLOCKED until clearBlock
    update public.institutional_bases
    set status = 'BLOCKED', updated_at = now()
    where id = target_base_id;
  end if;

  return review_id;
end;
$$;

-- Activation remains an explicit Human Review action, but authority and the
-- evidence role are always resolved server-side from workspace membership.
create or replace function public.activate_document_template_version(
  target_template_id uuid,
  target_version_no integer,
  human_review_confirmed boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  kind text;
  displaced_id uuid;
  displaced_status text;
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select template.workspace_id, template.status, template.document_kind
    into workspace, current_status, kind
  from public.document_templates template
  where template.id = target_template_id
  for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status = 'BLOCKED' then raise exception 'cannot activate BLOCKED identity'; end if;

  select template.id, template.status into displaced_id, displaced_status
  from public.document_templates template
  where template.workspace_id = workspace
    and template.document_kind = kind
    and template.status = 'ACTIVE'
    and template.id <> target_template_id
  for update;

  perform public.activate_document_template_version_v0087(
    target_template_id, target_version_no, human_review_confirmed
  );

  insert into public.document_template_lifecycle_decisions(
    template_id, action, from_status, to_status, version_no, note, decided_by, actor_workspace_role
  ) values (
    target_template_id, 'ACTIVATE', current_status, 'ACTIVE', target_version_no,
    'Human Review confermata per l’attivazione.', uid, actor_role
  );

  if displaced_id is not null then
    update public.document_templates
    set active_version_no = null, updated_at = now()
    where id = displaced_id;

    insert into public.document_template_lifecycle_decisions(
      template_id, action, from_status, to_status, version_no, note, decided_by, actor_workspace_role
    ) values (
      displaced_id, 'RETIRED_BY_REPLACEMENT', displaced_status, 'RETIRED', null,
      'Sostituita da una nuova identità attiva della stessa famiglia documentale.', uid, actor_role
    );
  end if;
end;
$$;

create or replace function public.activate_institutional_base_version(
  target_base_id uuid,
  target_version_no integer,
  human_review_confirmed boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  displaced_id uuid;
  displaced_status text;
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true then raise exception 'Human Review confirmation required'; end if;
  select base.workspace_id, base.status into workspace, current_status
  from public.institutional_bases base
  where base.id = target_base_id
  for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status = 'BLOCKED' then raise exception 'cannot activate BLOCKED identity'; end if;
  if not exists (
    select 1 from public.institutional_base_versions
    where base_id = target_base_id and version_no = target_version_no
  ) then raise exception 'institutional base version not available'; end if;
  if coalesce((
    select review.result in ('PASS','PASS_WITH_NOTES')
    from public.institutional_base_quality_reviews review
    where review.base_id = target_base_id and review.version_no = target_version_no
    order by review.reviewed_at desc, review.id desc
    limit 1
  ), false) is not true then
    raise exception 'latest quality_review must be PASS or PASS_WITH_NOTES before activation';
  end if;

  select base.id, base.status into displaced_id, displaced_status
  from public.institutional_bases base
  where base.workspace_id = workspace
    and base.status = 'ACTIVE'
    and base.id <> target_base_id
  for update;

  if displaced_id is not null then
    update public.institutional_bases
    set status = 'RETIRED', active_version_no = null, updated_at = now()
    where id = displaced_id;

    insert into public.institutional_base_lifecycle_decisions(
      base_id, action, from_status, to_status, note, decided_by, actor_workspace_role
    ) values (
      displaced_id, 'RETIRED_BY_REPLACEMENT', displaced_status, 'RETIRED',
      'Sostituita da una nuova base istituzionale attiva.', uid, actor_role
    );
  end if;

  update public.institutional_bases
  set active_version_no = target_version_no, status = 'ACTIVE', updated_at = now()
  where id = target_base_id;

  insert into public.institutional_base_lifecycle_decisions(
    base_id, action, from_status, to_status, version_no, note, decided_by, actor_workspace_role
  ) values (
    target_base_id, 'ACTIVATE', current_status, 'ACTIVE', target_version_no,
    'Human Review confermata per l’attivazione.', uid, actor_role
  );
end;
$$;

-- Remove the obsolete client-confirmation overloads. BLOCK/CLEAR_BLOCK/RETIRE
-- trust only target identity plus a mandatory human note; authority is derived
-- from the authenticated workspace membership.
revoke all on function public.block_document_template(uuid, boolean, text) from public, authenticated;
revoke all on function public.clear_document_template_block(uuid, boolean, text) from public, authenticated;
revoke all on function public.retire_document_template(uuid, boolean, text) from public, authenticated;
revoke all on function public.block_institutional_base(uuid, boolean, text) from public, authenticated;
revoke all on function public.clear_institutional_base_block(uuid, boolean, text) from public, authenticated;
revoke all on function public.retire_institutional_base(uuid, boolean, text) from public, authenticated;

drop function public.block_document_template(uuid, boolean, text);
drop function public.clear_document_template_block(uuid, boolean, text);
drop function public.retire_document_template(uuid, boolean, text);
drop function public.block_institutional_base(uuid, boolean, text);
drop function public.clear_institutional_base_block(uuid, boolean, text);
drop function public.retire_institutional_base(uuid, boolean, text);

create function public.block_document_template(
  target_template_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.document_templates set status = 'BLOCKED', updated_at = now()
  where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(
    template_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_template_id, 'BLOCK', current_status, 'BLOCKED', safe_note, uid, actor_role
  );
end;
$$;

create function public.clear_document_template_block(
  target_template_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status <> 'BLOCKED' then raise exception 'template is not BLOCKED'; end if;
  update public.document_templates set status = 'REVIEW_REQUIRED', updated_at = now()
  where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(
    template_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_template_id, 'CLEAR_BLOCK', 'BLOCKED', 'REVIEW_REQUIRED', safe_note, uid, actor_role
  );
end;
$$;

create function public.retire_document_template(
  target_template_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.document_templates
  set status = 'RETIRED', active_version_no = null, updated_at = now()
  where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(
    template_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_template_id, 'RETIRE', current_status, 'RETIRED', safe_note, uid, actor_role
  );
end;
$$;

create function public.block_institutional_base(
  target_base_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.institutional_bases where id = target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.institutional_bases set status = 'BLOCKED', updated_at = now()
  where id = target_base_id;
  insert into public.institutional_base_lifecycle_decisions(
    base_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_base_id, 'BLOCK', current_status, 'BLOCKED', safe_note, uid, actor_role
  );
end;
$$;

create function public.clear_institutional_base_block(
  target_base_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.institutional_bases where id = target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status <> 'BLOCKED' then raise exception 'institutional base is not BLOCKED'; end if;
  update public.institutional_bases set status = 'REVIEW_REQUIRED', updated_at = now()
  where id = target_base_id;
  insert into public.institutional_base_lifecycle_decisions(
    base_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_base_id, 'CLEAR_BLOCK', 'BLOCKED', 'REVIEW_REQUIRED', safe_note, uid, actor_role
  );
end;
$$;

create function public.retire_institutional_base(
  target_base_id uuid,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  workspace uuid;
  current_status text;
  safe_note text := nullif(trim(target_note), '');
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_note is null then raise exception 'Human Review note required'; end if;
  select workspace_id, status into workspace, current_status
  from public.institutional_bases where id = target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  actor_role := private.institutional_lifecycle_actor_role(workspace);
  if actor_role is null then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.institutional_bases
  set status = 'RETIRED', active_version_no = null, updated_at = now()
  where id = target_base_id;
  insert into public.institutional_base_lifecycle_decisions(
    base_id, action, from_status, to_status, note, decided_by, actor_workspace_role
  ) values (
    target_base_id, 'RETIRE', current_status, 'RETIRED', safe_note, uid, actor_role
  );
end;
$$;

revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.activate_document_template_version(uuid, integer, boolean) from public;
revoke all on function public.activate_institutional_base_version(uuid, integer, boolean) from public;
revoke all on function public.block_document_template(uuid, text) from public;
revoke all on function public.clear_document_template_block(uuid, text) from public;
revoke all on function public.retire_document_template(uuid, text) from public;
revoke all on function public.block_institutional_base(uuid, text) from public;
revoke all on function public.clear_institutional_base_block(uuid, text) from public;
revoke all on function public.retire_institutional_base(uuid, text) from public;

grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.activate_document_template_version(uuid, integer, boolean) to authenticated;
grant execute on function public.activate_institutional_base_version(uuid, integer, boolean) to authenticated;
grant execute on function public.block_document_template(uuid, text) to authenticated;
grant execute on function public.clear_document_template_block(uuid, text) to authenticated;
grant execute on function public.retire_document_template(uuid, text) to authenticated;
grant execute on function public.block_institutional_base(uuid, text) to authenticated;
grant execute on function public.clear_institutional_base_block(uuid, text) to authenticated;
grant execute on function public.retire_institutional_base(uuid, text) to authenticated;

select private.advance_runtime_schema_contract('0090_document_template_lifecycle_contract_fixes');

commit;
