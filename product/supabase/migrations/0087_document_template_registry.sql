begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (87, '0087_document_template_registry')
on conflict (version) do update
set migration_id = excluded.migration_id;

create table public.document_template_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_asset_id uuid references public.knowledge_assets(id) on delete restrict,
  source_revision_ref text,
  source_kind text not null check (source_kind in (
    'INSTITUTION_OFFICIAL',
    'INSTITUTION_WORKING_DRAFT',
    'TEACHER_ADAPTED',
    'HISTORICAL_REFERENCE',
    'UNKNOWN'
  )),
  source_fingerprint text not null check (length(trim(source_fingerprint)) between 1 and 256),
  captured_by uuid not null references auth.users(id) on delete restrict,
  captured_at timestamptz not null default now(),
  unique (workspace_id, source_fingerprint)
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_kind text not null check (document_kind in (
    'FINAL_REPORT',
    'PROGRAM_CARRIED_OUT',
    'ANNUAL_PROGRAMMING',
    'UDA_INSTITUTIONAL'
  )),
  name text not null check (length(trim(name)) between 1 and 300),
  status text not null default 'DRAFT' check (status in (
    'DRAFT',
    'QUALITY_REVIEWED',
    'REVIEW_REQUIRED',
    'ACTIVE',
    'RETIRED',
    'BLOCKED'
  )),
  current_version_no integer not null default 0 check (current_version_no >= 0),
  active_version_no integer check (active_version_no is null or active_version_no >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  schema_json jsonb not null check (jsonb_typeof(schema_json) = 'object'),
  source_revision_ids uuid[] not null default '{}'::uuid[],
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (template_id, version_no)
);

create table public.document_template_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  result text not null check (result in ('PASS', 'PASS_WITH_NOTES', 'REVIEW_REQUIRED', 'BLOCKED')),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  foreign key (template_id, version_no)
    references public.document_template_versions(template_id, version_no)
    on delete cascade
);

create index idx_document_template_sources_workspace
  on public.document_template_sources(workspace_id, captured_at desc);
create index idx_document_templates_workspace_kind
  on public.document_templates(workspace_id, document_kind, updated_at desc);
create unique index uq_document_templates_active_kind
  on public.document_templates(workspace_id, document_kind)
  where status = 'ACTIVE';
create index idx_document_template_versions_template
  on public.document_template_versions(template_id, version_no desc);
create index idx_document_template_quality_reviews_version
  on public.document_template_quality_reviews(template_id, version_no, reviewed_at desc);

alter table public.document_template_sources enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_template_versions enable row level security;
alter table public.document_template_quality_reviews enable row level security;

create policy document_template_sources_select_member
on public.document_template_sources for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy document_templates_select_member
on public.document_templates for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy document_template_versions_select_member
on public.document_template_versions for select to authenticated
using (exists (
  select 1 from public.document_templates template
  where template.id = template_id
    and private.is_workspace_member(template.workspace_id)
));

create policy document_template_quality_reviews_select_member
on public.document_template_quality_reviews for select to authenticated
using (exists (
  select 1 from public.document_templates template
  where template.id = template_id
    and private.is_workspace_member(template.workspace_id)
));

revoke insert, update, delete on public.document_template_sources from authenticated;
revoke insert, update, delete on public.document_templates from authenticated;
revoke insert, update, delete on public.document_template_versions from authenticated;
revoke insert, update, delete on public.document_template_quality_reviews from authenticated;

grant select on public.document_template_sources to authenticated;
grant select on public.document_templates to authenticated;
grant select on public.document_template_versions to authenticated;
grant select on public.document_template_quality_reviews to authenticated;

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
    and source.source_fingerprint = safe_fingerprint;

  if source_id is null then
    insert into public.document_template_sources(
      workspace_id, source_asset_id, source_revision_ref, source_kind,
      source_fingerprint, captured_by
    ) values (
      target_workspace_id, target_source_asset_id,
      nullif(trim(target_source_revision_ref), ''), target_source_kind,
      safe_fingerprint, uid
    ) returning id into source_id;
  end if;

  return source_id;
end;
$$;

create or replace function public.create_document_template(
  target_workspace_id uuid,
  target_document_kind text,
  target_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  template_id uuid;
  safe_name text := nullif(trim(target_name), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if target_document_kind not in ('FINAL_REPORT','PROGRAM_CARRIED_OUT','ANNUAL_PROGRAMMING','UDA_INSTITUTIONAL') then
    raise exception 'invalid document template kind';
  end if;
  if safe_name is null or length(safe_name) > 300 then raise exception 'invalid template name'; end if;

  insert into public.document_templates(workspace_id, document_kind, name, created_by)
  values (target_workspace_id, target_document_kind, safe_name, uid)
  returning id into template_id;

  return template_id;
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
  set current_version_no = next_no, status = 'DRAFT', updated_at = now()
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
  review_id uuid;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if target_result not in ('PASS','PASS_WITH_NOTES','REVIEW_REQUIRED','BLOCKED') then raise exception 'invalid quality review result'; end if;
  if target_findings is null or jsonb_typeof(target_findings) <> 'array' then raise exception 'quality review findings must be an array'; end if;

  select template.workspace_id into workspace
  from public.document_templates template
  where template.id = target_template_id;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not exists (
    select 1 from public.document_template_versions version
    where version.template_id = target_template_id
      and version.version_no = target_version_no
  ) then raise exception 'template version not available'; end if;

  insert into public.document_template_quality_reviews(
    template_id, version_no, result, findings, note, reviewed_by
  ) values (
    target_template_id, target_version_no, target_result, target_findings,
    nullif(trim(target_note), ''), uid
  ) returning id into review_id;

  update public.document_templates
  set status = case
    when target_result in ('PASS','PASS_WITH_NOTES') then 'QUALITY_REVIEWED'
    when target_result = 'REVIEW_REQUIRED' then 'REVIEW_REQUIRED'
    else 'BLOCKED'
  end,
  updated_at = now()
  where id = target_template_id
    and current_version_no = target_version_no;

  return review_id;
end;
$$;

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
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true then raise exception 'Human Review confirmation required'; end if;

  select template.workspace_id into workspace
  from public.document_templates template
  where template.id = target_template_id
  for update;

  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not exists (
    select 1 from public.document_template_versions version
    where version.template_id = target_template_id
      and version.version_no = target_version_no
  ) then raise exception 'template version not available'; end if;
  if coalesce((
    select review.result in ('PASS','PASS_WITH_NOTES')
    from public.document_template_quality_reviews review
    where review.template_id = target_template_id
      and review.version_no = target_version_no
    order by review.reviewed_at desc, review.id desc
    limit 1
  ), false) is not true then
    raise exception 'latest quality_review must be PASS or PASS_WITH_NOTES before activation';
  end if;

  update public.document_templates current_template
  set status = 'RETIRED', updated_at = now()
  where current_template.workspace_id = workspace
    and current_template.document_kind = (
      select selected.document_kind from public.document_templates selected where selected.id = target_template_id
    )
    and current_template.id <> target_template_id
    and current_template.status = 'ACTIVE';

  update public.document_templates
  set active_version_no = target_version_no,
      status = 'ACTIVE',
      updated_at = now()
  where id = target_template_id;
end;
$$;

create or replace function public.document_template_snapshot(target_template_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'template', to_jsonb(template),
    'activeVersion', (
      select to_jsonb(active_version)
      from public.document_template_versions active_version
      where active_version.template_id = template.id
        and active_version.version_no = template.active_version_no
    ),
    'versions', coalesce((
      select jsonb_agg(to_jsonb(version) order by version.version_no desc)
      from public.document_template_versions version
      where version.template_id = template.id
    ), '[]'::jsonb),
    'qualityReviews', coalesce((
      select jsonb_agg(to_jsonb(review) order by review.reviewed_at desc)
      from public.document_template_quality_reviews review
      where review.template_id = template.id
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source) order by source.captured_at desc)
      from public.document_template_sources source
      where source.id in (
        select unnest(version.source_revision_ids)
        from public.document_template_versions version
        where version.template_id = template.id
      )
    ), '[]'::jsonb)
  )
  from public.document_templates template
  where template.id = target_template_id
    and private.is_workspace_member(template.workspace_id);
$$;

revoke all on function public.register_document_template_source(uuid, uuid, text, text, text) from public;
revoke all on function public.create_document_template(uuid, text, text) from public;
revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.activate_document_template_version(uuid, integer, boolean) from public;
revoke all on function public.document_template_snapshot(uuid) from public;

grant execute on function public.register_document_template_source(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.create_document_template(uuid, text, text) to authenticated;
grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.activate_document_template_version(uuid, integer, boolean) to authenticated;
grant execute on function public.document_template_snapshot(uuid) to authenticated;

comment on table public.document_template_sources is
  'Immutable source evidence used to design institutional document templates. Source rows may reference Knowledge assets or represent external/historical evidence.';
comment on table public.document_template_versions is
  'Immutable semantic template versions. Rendering geometry is not canonical; the JSON schema stores institutional meaning and render roles.';
comment on function public.activate_document_template_version(uuid, integer, boolean) is
  'Activates one canonical template version only after a persisted passing quality review and an explicit Human Review confirmation.';

select private.advance_runtime_schema_contract('0087_document_template_registry');

commit;
