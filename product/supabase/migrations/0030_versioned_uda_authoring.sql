begin;

create table public.authored_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  source_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  document_kind text not null check (document_kind in ('UDA')),
  title text not null,
  current_version_no integer not null default 1 check (current_version_no >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_asset_id, document_kind)
);

create table public.authored_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.authored_documents(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  title text not null,
  body_markdown text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (document_id, version_no)
);

create index idx_authored_documents_workspace on public.authored_documents(workspace_id, updated_at desc);
create index idx_authored_versions_document on public.authored_document_versions(document_id, version_no desc);

alter table public.authored_documents enable row level security;
alter table public.authored_document_versions enable row level security;

create policy authored_documents_select_member
on public.authored_documents for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy authored_versions_select_member
on public.authored_document_versions for select to authenticated
using (exists (
  select 1 from public.authored_documents d
  where d.id = document_id and private.is_workspace_member(d.workspace_id)
));

revoke insert, update, delete on public.authored_documents from authenticated;
revoke insert, update, delete on public.authored_document_versions from authenticated;
grant select on public.authored_documents to authenticated;
grant select on public.authored_document_versions to authenticated;

create or replace function public.open_uda_authoring(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_source_asset_id uuid,
  initial_title text,
  initial_body_markdown text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  document_id uuid;
  safe_title text := nullif(trim(initial_title), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if safe_title is null or length(safe_title) > 300 then raise exception 'invalid title'; end if;
  if length(coalesce(initial_body_markdown, '')) > 250000 then raise exception 'document body too large'; end if;
  if not exists (select 1 from public.academic_years ay where ay.id = target_academic_year_id and ay.workspace_id = target_workspace_id) then
    raise exception 'academic year outside workspace';
  end if;
  if not exists (
    select 1 from public.knowledge_assets ka
    where ka.id = target_source_asset_id
      and ka.workspace_id = target_workspace_id
      and ka.content_category = 'UDA'
  ) then raise exception 'source must be a UDA in the active workspace'; end if;

  select d.id into document_id
  from public.authored_documents d
  where d.workspace_id = target_workspace_id and d.source_asset_id = target_source_asset_id and d.document_kind = 'UDA';

  if document_id is null then
    insert into public.authored_documents(workspace_id, academic_year_id, source_asset_id, document_kind, title, created_by)
    values (target_workspace_id, target_academic_year_id, target_source_asset_id, 'UDA', safe_title, uid)
    returning id into document_id;

    insert into public.authored_document_versions(document_id, version_no, title, body_markdown, created_by)
    values (document_id, 1, safe_title, coalesce(initial_body_markdown, ''), uid);
  end if;

  return document_id;
end;
$$;

create or replace function public.authored_document_snapshot(target_document_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'document', to_jsonb(d),
    'current', to_jsonb(v),
    'versions', coalesce((
      select jsonb_agg(to_jsonb(history) order by history.version_no desc)
      from public.authored_document_versions history
      where history.document_id = d.id
    ), '[]'::jsonb)
  )
  from public.authored_documents d
  join public.authored_document_versions v on v.document_id = d.id and v.version_no = d.current_version_no
  where d.id = target_document_id and private.is_workspace_member(d.workspace_id);
$$;

create or replace function public.save_authored_document_version(
  target_document_id uuid,
  expected_current_version integer,
  next_title text,
  next_body_markdown text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_no integer;
  workspace uuid;
  new_no integer;
  safe_title text := nullif(trim(next_title), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_title is null or length(safe_title) > 300 then raise exception 'invalid title'; end if;
  if length(coalesce(next_body_markdown, '')) > 250000 then raise exception 'document body too large'; end if;

  select d.workspace_id, d.current_version_no into workspace, current_no
  from public.authored_documents d where d.id = target_document_id for update;
  if workspace is null or not private.is_workspace_member(workspace) then raise exception 'document not available'; end if;
  if current_no <> expected_current_version then raise exception 'document changed; reload before saving'; end if;

  new_no := current_no + 1;
  insert into public.authored_document_versions(document_id, version_no, title, body_markdown, created_by)
  values (target_document_id, new_no, safe_title, coalesce(next_body_markdown, ''), uid);

  update public.authored_documents
  set title = safe_title, current_version_no = new_no, updated_at = now()
  where id = target_document_id;
  return new_no;
end;
$$;

revoke all on function public.open_uda_authoring(uuid, uuid, uuid, text, text) from public;
revoke all on function public.authored_document_snapshot(uuid) from public;
revoke all on function public.save_authored_document_version(uuid, integer, text, text) from public;
grant execute on function public.open_uda_authoring(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.authored_document_snapshot(uuid) to authenticated;
grant execute on function public.save_authored_document_version(uuid, integer, text, text) to authenticated;

commit;
