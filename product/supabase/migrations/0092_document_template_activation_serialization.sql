begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (92, '0092_document_template_activation_serialization')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Replacement activation is a family-wide transition, not a target-row-only
-- transition. Resolve the immutable family key without a row lock, serialize
-- the family, then lock/re-read the target and displaced rows. This consistent
-- ordering avoids cycles between the target-row lock and the family lock.
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
  lock_workspace uuid;
  lock_kind text;
  workspace uuid;
  current_status text;
  kind text;
  displaced_id uuid;
  displaced_status text;
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true then raise exception 'Human Review confirmation required'; end if;

  select template.workspace_id, template.document_kind
    into lock_workspace, lock_kind
  from public.document_templates template
  where template.id = target_template_id;

  if lock_workspace is null or not private.is_workspace_member(lock_workspace) then
    raise exception 'template not available';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'document-template-activation:' || lock_workspace::text || ':' || lock_kind,
      0
    )
  );

  select template.workspace_id, template.status, template.document_kind
    into workspace, current_status, kind
  from public.document_templates template
  where template.id = target_template_id
  for update;

  if workspace is null or workspace is distinct from lock_workspace or kind is distinct from lock_kind then
    raise exception 'template identity changed during activation';
  end if;
  if not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
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
  lock_workspace uuid;
  workspace uuid;
  current_status text;
  displaced_id uuid;
  displaced_status text;
  actor_role text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true then raise exception 'Human Review confirmation required'; end if;

  select base.workspace_id into lock_workspace
  from public.institutional_bases base
  where base.id = target_base_id;

  if lock_workspace is null or not private.is_workspace_member(lock_workspace) then
    raise exception 'institutional base not available';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'institutional-base-activation:' || lock_workspace::text,
      0
    )
  );

  select base.workspace_id, base.status into workspace, current_status
  from public.institutional_bases base
  where base.id = target_base_id
  for update;

  if workspace is null or workspace is distinct from lock_workspace then
    raise exception 'institutional base identity changed during activation';
  end if;
  if not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
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

revoke all on function public.activate_document_template_version(uuid, integer, boolean) from public;
revoke all on function public.activate_institutional_base_version(uuid, integer, boolean) from public;
grant execute on function public.activate_document_template_version(uuid, integer, boolean) to authenticated;
grant execute on function public.activate_institutional_base_version(uuid, integer, boolean) to authenticated;

select private.advance_runtime_schema_contract('0092_document_template_activation_serialization');

commit;
