begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (89, '0089_institutional_base_and_template_lifecycle')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function private.has_institutional_lifecycle_authority(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('OWNER', 'ADMIN')
  );
$$;

revoke all on function private.has_institutional_lifecycle_authority(uuid) from public;

create or replace function private.institutional_base_has_forbidden_layout_key(target_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item record;
  child jsonb;
begin
  if target_value is null then return false; end if;

  if jsonb_typeof(target_value) = 'object' then
    for item in select key, value from jsonb_each(target_value) loop
      if lower(item.key) in ('css','html','rawcss','rawhtml','style','classname','script','jsx') then
        return true;
      end if;
      if private.institutional_base_has_forbidden_layout_key(item.value) then return true; end if;
    end loop;
  elsif jsonb_typeof(target_value) = 'array' then
    for child in select value from jsonb_array_elements(target_value) loop
      if private.institutional_base_has_forbidden_layout_key(child) then return true; end if;
    end loop;
  end if;

  return false;
end;
$$;

revoke all on function private.institutional_base_has_forbidden_layout_key(jsonb) from public;

create table public.institutional_bases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 300),
  status text not null default 'DRAFT' check (status in (
    'DRAFT','QUALITY_REVIEWED','REVIEW_REQUIRED','ACTIVE','RETIRED','BLOCKED'
  )),
  current_version_no integer not null default 0 check (current_version_no >= 0),
  active_version_no integer check (active_version_no is null or active_version_no >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutional_base_versions (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.institutional_bases(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  profile_json jsonb not null check (jsonb_typeof(profile_json) = 'object'),
  source_revision_ids uuid[] not null default '{}'::uuid[],
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (base_id, version_no)
);

create table public.institutional_base_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.institutional_bases(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  result text not null check (result in ('PASS','PASS_WITH_NOTES','REVIEW_REQUIRED','BLOCKED')),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  foreign key (base_id, version_no)
    references public.institutional_base_versions(base_id, version_no)
    on delete cascade
);

create table public.institutional_base_lifecycle_decisions (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.institutional_bases(id) on delete cascade,
  action text not null check (action in ('ACTIVATE','BLOCK','CLEAR_BLOCK','RETIRE','RETIRED_BY_REPLACEMENT')),
  from_status text not null,
  to_status text not null,
  version_no integer,
  note text,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create table public.document_template_lifecycle_decisions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  action text not null check (action in ('ACTIVATE','BLOCK','CLEAR_BLOCK','RETIRE','RETIRED_BY_REPLACEMENT')),
  from_status text not null,
  to_status text not null,
  version_no integer,
  note text,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create index idx_institutional_bases_workspace
  on public.institutional_bases(workspace_id, updated_at desc);
create unique index uq_institutional_bases_active_workspace
  on public.institutional_bases(workspace_id)
  where status = 'ACTIVE';
create index idx_institutional_base_versions_base
  on public.institutional_base_versions(base_id, version_no desc);
create index idx_institutional_base_reviews_version
  on public.institutional_base_quality_reviews(base_id, version_no, reviewed_at desc);
create index idx_institutional_base_lifecycle
  on public.institutional_base_lifecycle_decisions(base_id, decided_at desc);
create index idx_document_template_lifecycle
  on public.document_template_lifecycle_decisions(template_id, decided_at desc);

alter table public.institutional_bases enable row level security;
alter table public.institutional_base_versions enable row level security;
alter table public.institutional_base_quality_reviews enable row level security;
alter table public.institutional_base_lifecycle_decisions enable row level security;
alter table public.document_template_lifecycle_decisions enable row level security;

create policy institutional_bases_select_member
on public.institutional_bases for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy institutional_base_versions_select_member
on public.institutional_base_versions for select to authenticated
using (exists (
  select 1 from public.institutional_bases base
  where base.id = base_id and private.is_workspace_member(base.workspace_id)
));

create policy institutional_base_quality_reviews_select_member
on public.institutional_base_quality_reviews for select to authenticated
using (exists (
  select 1 from public.institutional_bases base
  where base.id = base_id and private.is_workspace_member(base.workspace_id)
));

create policy institutional_base_lifecycle_select_member
on public.institutional_base_lifecycle_decisions for select to authenticated
using (exists (
  select 1 from public.institutional_bases base
  where base.id = base_id and private.is_workspace_member(base.workspace_id)
));

create policy document_template_lifecycle_select_member
on public.document_template_lifecycle_decisions for select to authenticated
using (exists (
  select 1 from public.document_templates template
  where template.id = template_id and private.is_workspace_member(template.workspace_id)
));

revoke insert, update, delete on public.institutional_bases from authenticated;
revoke insert, update, delete on public.institutional_base_versions from authenticated;
revoke insert, update, delete on public.institutional_base_quality_reviews from authenticated;
revoke insert, update, delete on public.institutional_base_lifecycle_decisions from authenticated;
revoke insert, update, delete on public.document_template_lifecycle_decisions from authenticated;
grant select on public.institutional_bases to authenticated;
grant select on public.institutional_base_versions to authenticated;
grant select on public.institutional_base_quality_reviews to authenticated;
grant select on public.institutional_base_lifecycle_decisions to authenticated;
grant select on public.document_template_lifecycle_decisions to authenticated;

create or replace function private.compute_institutional_base_quality_review(target_profile_json jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  findings jsonb := '[]'::jsonb;
  required_key text;
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

  foreach required_key in array array[
    'identityProfile','headerProfile','footerProfile','typographyProfile',
    'pageGeometryProfile','commonTableProfile','signatureProfile','accessibilityProfile'
  ] loop
    if jsonb_typeof(target_profile_json->required_key) is distinct from 'object' then
      findings := findings || jsonb_build_array(jsonb_build_object(
        'code','MISSING_BASE_PROFILE_' || upper(required_key),'severity','BLOCKER','category','STRUCTURE',
        'summary','Profilo obbligatorio della base istituzionale mancante o non valido.'
      ));
    end if;
  end loop;

  if nullif(trim(target_profile_json#>>'{identityProfile,institutionName}'), '') is null then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INSTITUTION_NAME_REQUIRED','severity','BLOCKER','category','STRUCTURE',
      'summary','Denominazione dell’istituzione obbligatoria.'
    ));
  end if;

  if coalesce(target_profile_json->>'version','') !~ '^[1-9][0-9]*$' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'code','INVALID_INSTITUTIONAL_BASE_VERSION','severity','BLOCKER','category','STRUCTURE',
      'summary','Versione della base istituzionale non valida.'
    ));
  end if;

  if jsonb_array_length(findings) > 0 then
    return jsonb_build_object('result','BLOCKED','findings',findings);
  end if;
  return jsonb_build_object('result','PASS','findings','[]'::jsonb);
end;
$$;

revoke all on function private.compute_institutional_base_quality_review(jsonb) from public;

-- Preserve the reviewed v0088 implementations behind trusted wrappers.
alter function public.save_document_template_version(uuid, integer, jsonb, uuid[])
  rename to save_document_template_version_v0088;
alter function public.record_document_template_quality_review(uuid, integer, text, jsonb, text)
  rename to record_document_template_quality_review_v0088;
alter function public.activate_document_template_version(uuid, integer, boolean)
  rename to activate_document_template_version_v0087;

revoke all on function public.save_document_template_version_v0088(uuid, integer, jsonb, uuid[]) from public, authenticated;
revoke all on function public.record_document_template_quality_review_v0088(uuid, integer, text, jsonb, text) from public, authenticated;
revoke all on function public.activate_document_template_version_v0087(uuid, integer, boolean) from public, authenticated;

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
  workspace uuid;
  current_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select template.workspace_id, template.status into workspace, current_status
  from public.document_templates template
  where template.id = target_template_id
  for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  return public.save_document_template_version_v0088(
    target_template_id, expected_current_version, target_schema_json, target_source_revision_ids
  );
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
  workspace uuid;
  current_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select template.workspace_id, template.status into workspace, current_status
  from public.document_templates template
  where template.id = target_template_id
  for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  return public.record_document_template_quality_review_v0088(
    target_template_id, target_version_no, target_result, target_findings, target_note
  );
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
  current_status text;
  kind text;
  displaced_id uuid;
  displaced_status text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select template.workspace_id, template.status, template.document_kind
    into workspace, current_status, kind
  from public.document_templates template
  where template.id = target_template_id
  for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
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
    template_id, action, from_status, to_status, version_no, note, decided_by
  ) values (
    target_template_id, 'ACTIVATE', current_status, 'ACTIVE', target_version_no,
    'Human Review confermata per l’attivazione.', uid
  );

  if displaced_id is not null then
    insert into public.document_template_lifecycle_decisions(
      template_id, action, from_status, to_status, version_no, note, decided_by
    ) values (
      displaced_id, 'RETIRED_BY_REPLACEMENT', displaced_status, 'RETIRED', null,
      'Sostituita da una nuova identità attiva della stessa famiglia documentale.', uid
    );
  end if;
end;
$$;

create or replace function public.block_document_template(
  target_template_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id, status into workspace, current_status from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.document_templates set status = 'BLOCKED', updated_at = now() where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(template_id,action,from_status,to_status,note,decided_by)
  values(target_template_id,'BLOCK',current_status,'BLOCKED',safe_note,uid);
end;
$$;

create or replace function public.clear_document_template_block(
  target_template_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id, status into workspace, current_status from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status <> 'BLOCKED' then raise exception 'template is not BLOCKED'; end if;
  update public.document_templates set status = 'REVIEW_REQUIRED', updated_at = now() where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(template_id,action,from_status,to_status,note,decided_by)
  values(target_template_id,'CLEAR_BLOCK','BLOCKED','REVIEW_REQUIRED',safe_note,uid);
end;
$$;

create or replace function public.retire_document_template(
  target_template_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id, status into workspace, current_status from public.document_templates where id = target_template_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'template not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.document_templates set status = 'RETIRED', updated_at = now() where id = target_template_id;
  insert into public.document_template_lifecycle_decisions(template_id,action,from_status,to_status,note,decided_by)
  values(target_template_id,'RETIRE',current_status,'RETIRED',safe_note,uid);
end;
$$;

create or replace function public.document_template_version_snapshot(
  target_template_id uuid,
  target_version_no integer
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'template', to_jsonb(template),
    'version', to_jsonb(version),
    'qualityReviews', coalesce((
      select jsonb_agg(to_jsonb(review) order by review.reviewed_at desc, review.id desc)
      from public.document_template_quality_reviews review
      where review.template_id = template.id and review.version_no = version.version_no
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source) order by source.captured_at desc)
      from public.document_template_sources source
      where source.id = any(version.source_revision_ids)
    ), '[]'::jsonb)
  )
  from public.document_templates template
  join public.document_template_versions version on version.template_id = template.id
  where template.id = target_template_id
    and version.version_no = target_version_no
    and private.is_workspace_member(template.workspace_id);
$$;

create or replace function public.create_institutional_base(
  target_workspace_id uuid,
  target_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); base_id uuid; safe_name text := nullif(trim(target_name), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if safe_name is null or length(safe_name) > 300 then raise exception 'invalid institutional base name'; end if;
  insert into public.institutional_bases(workspace_id,name,created_by)
  values(target_workspace_id,safe_name,uid) returning id into base_id;
  return base_id;
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
  uid uuid := auth.uid(); workspace uuid; current_no integer; current_status text;
  next_no integer; invalid_source_count integer;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if target_profile_json is null or jsonb_typeof(target_profile_json) <> 'object' then raise exception 'institutional base profile must be a JSON object'; end if;
  select base.workspace_id, base.current_version_no, base.status into workspace,current_no,current_status
  from public.institutional_bases base where base.id = target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_no <> expected_current_version then raise exception 'institutional base changed; reload before saving'; end if;
  if private.institutional_base_has_forbidden_layout_key(target_profile_json) then raise exception 'arbitrary layout payload forbidden'; end if;
  select count(*) into invalid_source_count
  from unnest(coalesce(target_source_revision_ids,'{}'::uuid[])) source_id
  where not exists (
    select 1 from public.document_template_sources source
    where source.id = source_id and source.workspace_id = workspace
  );
  if invalid_source_count > 0 then raise exception 'template source outside workspace'; end if;
  next_no := current_no + 1;
  if coalesce(target_profile_json->>'version','') !~ '^[1-9][0-9]*$'
     or (target_profile_json->>'version')::integer <> next_no then
    raise exception 'institutional base version mismatch';
  end if;
  insert into public.institutional_base_versions(base_id,version_no,profile_json,source_revision_ids,created_by)
  values(target_base_id,next_no,target_profile_json,coalesce(target_source_revision_ids,'{}'::uuid[]),uid);
  update public.institutional_bases
  set current_version_no=next_no,
      status=case when status='ACTIVE' and active_version_no is not null then 'ACTIVE' else 'DRAFT' end,
      updated_at=now()
  where id=target_base_id;
  return next_no;
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
  uid uuid := auth.uid(); workspace uuid; current_status text; review_id uuid;
  profile jsonb; computed jsonb; computed_result text; computed_findings jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select base.workspace_id, base.status into workspace,current_status
  from public.institutional_bases base where base.id=target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  select version.profile_json into profile from public.institutional_base_versions version
  where version.base_id=target_base_id and version.version_no=target_version_no;
  if profile is null then raise exception 'institutional base version not available'; end if;
  computed := private.compute_institutional_base_quality_review(profile);
  computed_result := computed->>'result';
  computed_findings := coalesce(computed->'findings','[]'::jsonb);
  if target_result is distinct from computed_result or target_findings is distinct from computed_findings then
    raise exception 'quality review does not match deterministic review';
  end if;
  insert into public.institutional_base_quality_reviews(base_id,version_no,result,findings,note,reviewed_by)
  values(target_base_id,target_version_no,computed_result,computed_findings,nullif(trim(target_note),''),uid)
  returning id into review_id;
  update public.institutional_bases
  set status=case
    when status='ACTIVE' and active_version_no is not null then 'ACTIVE'
    when computed_result in ('PASS','PASS_WITH_NOTES') then 'QUALITY_REVIEWED'
    when computed_result='REVIEW_REQUIRED' then 'REVIEW_REQUIRED'
    else 'BLOCKED' end,
    updated_at=now()
  where id=target_base_id and current_version_no=target_version_no;
  return review_id;
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
  uid uuid := auth.uid(); workspace uuid; current_status text;
  displaced_id uuid; displaced_status text;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true then raise exception 'Human Review confirmation required'; end if;
  select base.workspace_id,base.status into workspace,current_status
  from public.institutional_bases base where base.id=target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status = 'RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status = 'BLOCKED' then raise exception 'cannot activate BLOCKED identity'; end if;
  if not exists(select 1 from public.institutional_base_versions where base_id=target_base_id and version_no=target_version_no) then
    raise exception 'institutional base version not available';
  end if;
  if coalesce((select review.result in ('PASS','PASS_WITH_NOTES')
    from public.institutional_base_quality_reviews review
    where review.base_id=target_base_id and review.version_no=target_version_no
    order by review.reviewed_at desc,review.id desc limit 1),false) is not true then
    raise exception 'latest quality_review must be PASS or PASS_WITH_NOTES before activation';
  end if;
  select base.id,base.status into displaced_id,displaced_status
  from public.institutional_bases base
  where base.workspace_id=workspace and base.status='ACTIVE' and base.id<>target_base_id
  for update;
  if displaced_id is not null then
    update public.institutional_bases set status='RETIRED',updated_at=now() where id=displaced_id;
    insert into public.institutional_base_lifecycle_decisions(base_id,action,from_status,to_status,note,decided_by)
    values(displaced_id,'RETIRED_BY_REPLACEMENT',displaced_status,'RETIRED','Sostituita da una nuova base istituzionale attiva.',uid);
  end if;
  update public.institutional_bases
  set active_version_no=target_version_no,status='ACTIVE',updated_at=now()
  where id=target_base_id;
  insert into public.institutional_base_lifecycle_decisions(base_id,action,from_status,to_status,version_no,note,decided_by)
  values(target_base_id,'ACTIVATE',current_status,'ACTIVE',target_version_no,'Human Review confermata per l’attivazione.',uid);
end;
$$;

create or replace function public.block_institutional_base(
  target_base_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note),'');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id,status into workspace,current_status from public.institutional_bases where id=target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status='RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.institutional_bases set status='BLOCKED',updated_at=now() where id=target_base_id;
  insert into public.institutional_base_lifecycle_decisions(base_id,action,from_status,to_status,note,decided_by)
  values(target_base_id,'BLOCK',current_status,'BLOCKED',safe_note,uid);
end;
$$;

create or replace function public.clear_institutional_base_block(
  target_base_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note),'');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id,status into workspace,current_status from public.institutional_bases where id=target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status='RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  if current_status<>'BLOCKED' then raise exception 'institutional base is not BLOCKED'; end if;
  update public.institutional_bases set status = 'REVIEW_REQUIRED',updated_at=now() where id=target_base_id;
  insert into public.institutional_base_lifecycle_decisions(base_id,action,from_status,to_status,note,decided_by)
  values(target_base_id,'CLEAR_BLOCK','BLOCKED','REVIEW_REQUIRED',safe_note,uid);
end;
$$;

create or replace function public.retire_institutional_base(
  target_base_id uuid,
  human_review_confirmed boolean,
  target_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); workspace uuid; current_status text; safe_note text := nullif(trim(target_note),'');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if human_review_confirmed is not true or safe_note is null then raise exception 'Human Review confirmation and note required'; end if;
  select workspace_id,status into workspace,current_status from public.institutional_bases where id=target_base_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'institutional base not available'; end if;
  if not private.has_institutional_lifecycle_authority(workspace) then raise exception 'institutional lifecycle authority required'; end if;
  if current_status='RETIRED' then raise exception 'cannot mutate RETIRED identity'; end if;
  update public.institutional_bases set status='RETIRED',updated_at=now() where id=target_base_id;
  insert into public.institutional_base_lifecycle_decisions(base_id,action,from_status,to_status,note,decided_by)
  values(target_base_id,'RETIRE',current_status,'RETIRED',safe_note,uid);
end;
$$;

create or replace function public.institutional_base_version_snapshot(
  target_base_id uuid,
  target_version_no integer
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'base',to_jsonb(base),
    'version',to_jsonb(version),
    'qualityReviews',coalesce((
      select jsonb_agg(to_jsonb(review) order by review.reviewed_at desc,review.id desc)
      from public.institutional_base_quality_reviews review
      where review.base_id=base.id and review.version_no=version.version_no
    ),'[]'::jsonb),
    'sources',coalesce((
      select jsonb_agg(to_jsonb(source) order by source.captured_at desc)
      from public.document_template_sources source
      where source.id=any(version.source_revision_ids)
    ),'[]'::jsonb)
  )
  from public.institutional_bases base
  join public.institutional_base_versions version on version.base_id=base.id
  where base.id=target_base_id
    and version.version_no=target_version_no
    and private.is_workspace_member(base.workspace_id);
$$;

-- Sixth explicit terminal guard for the institutional base registry: creation creates a new identity,
-- while all six mutating operations targeting an existing identity reject retirement.
-- saveVersion: cannot mutate RETIRED identity
-- qualityReview: cannot mutate RETIRED identity
-- activate: cannot mutate RETIRED identity
-- block: cannot mutate RETIRED identity
-- clearBlock: cannot mutate RETIRED identity
-- retire: cannot mutate RETIRED identity

revoke all on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.activate_document_template_version(uuid, integer, boolean) from public;
revoke all on function public.block_document_template(uuid, boolean, text) from public;
revoke all on function public.clear_document_template_block(uuid, boolean, text) from public;
revoke all on function public.retire_document_template(uuid, boolean, text) from public;
revoke all on function public.document_template_version_snapshot(uuid, integer) from public;
revoke all on function public.create_institutional_base(uuid, text) from public;
revoke all on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) from public;
revoke all on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) from public;
revoke all on function public.activate_institutional_base_version(uuid, integer, boolean) from public;
revoke all on function public.block_institutional_base(uuid, boolean, text) from public;
revoke all on function public.clear_institutional_base_block(uuid, boolean, text) from public;
revoke all on function public.retire_institutional_base(uuid, boolean, text) from public;
revoke all on function public.institutional_base_version_snapshot(uuid, integer) from public;

grant execute on function public.save_document_template_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_document_template_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.activate_document_template_version(uuid, integer, boolean) to authenticated;
grant execute on function public.block_document_template(uuid, boolean, text) to authenticated;
grant execute on function public.clear_document_template_block(uuid, boolean, text) to authenticated;
grant execute on function public.retire_document_template(uuid, boolean, text) to authenticated;
grant execute on function public.document_template_version_snapshot(uuid, integer) to authenticated;
grant execute on function public.create_institutional_base(uuid, text) to authenticated;
grant execute on function public.save_institutional_base_version(uuid, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.record_institutional_base_quality_review(uuid, integer, text, jsonb, text) to authenticated;
grant execute on function public.activate_institutional_base_version(uuid, integer, boolean) to authenticated;
grant execute on function public.block_institutional_base(uuid, boolean, text) to authenticated;
grant execute on function public.clear_institutional_base_block(uuid, boolean, text) to authenticated;
grant execute on function public.retire_institutional_base(uuid, boolean, text) to authenticated;
grant execute on function public.institutional_base_version_snapshot(uuid, integer) to authenticated;

comment on table public.institutional_bases is
  'Stable institutional identity for the shared document base. The name lives on the identity, not on individual versions.';
comment on table public.institutional_base_versions is
  'Immutable structured institutional-base versions. Arbitrary CSS/HTML payloads are forbidden.';
comment on function public.document_template_version_snapshot(uuid, integer) is
  'Historical exact-pin read; remains available for BLOCKED or RETIRED identities to authorized workspace members.';
comment on function public.institutional_base_version_snapshot(uuid, integer) is
  'Historical exact-pin read; remains available for BLOCKED or RETIRED identities to authorized workspace members.';

select private.advance_runtime_schema_contract('0089_institutional_base_and_template_lifecycle');

commit;
