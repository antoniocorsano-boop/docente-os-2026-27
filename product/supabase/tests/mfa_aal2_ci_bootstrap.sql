\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;

do $$
begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$
begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

grant usage on schema auth, private, public, storage to authenticated;
grant execute on function auth.jwt() to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.profiles (
  user_id uuid primary key,
  display_name text
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  primary key (workspace_id, user_id)
);

create table public.user_workspace_preferences (
  user_id uuid primary key,
  current_workspace_id uuid not null references public.workspaces(id) on delete cascade
);

create table public.probe_data (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note text not null
);

create table public.rpc_probe_log (
  id bigint generated always as identity primary key,
  actor uuid,
  created_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner_id uuid
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.user_workspace_preferences enable row level security;
alter table public.probe_data enable row level security;
alter table public.rpc_probe_log enable row level security;
alter table storage.objects enable row level security;

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;

create policy profiles_permissive on public.profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy workspaces_permissive on public.workspaces
for all to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy memberships_permissive on public.workspace_memberships
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy preferences_permissive on public.user_workspace_preferences
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy probe_data_permissive on public.probe_data
for all to authenticated
using (true)
with check (true);

create policy rpc_probe_log_permissive on public.rpc_probe_log
for select to authenticated
using (actor = (select auth.uid()));

create policy storage_objects_permissive on storage.objects
for all to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;
grant select, insert, update, delete on public.user_workspace_preferences to authenticated;
grant select, insert, update, delete on public.probe_data to authenticated;
grant select on public.rpc_probe_log to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.probe_guarded_rpc(target_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_workspace_member(target_workspace_id) then
    return false;
  end if;

  insert into public.rpc_probe_log(actor)
  values (auth.uid());
  return true;
end;
$$;

grant execute on function public.probe_guarded_rpc(uuid) to authenticated;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end;
$$;

create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function public.rls_auto_enable();

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-0000-0000-000000000100',
  'PERSONAL',
  'MFA CI workspace',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000001',
  'OWNER'
);

insert into public.probe_data(workspace_id, note)
values ('00000000-0000-0000-0000-000000000100', 'seed');

insert into storage.objects(bucket_id, name, owner_id)
values ('knowledge-assets', '00000000-0000-0000-0000-000000000100/seed.pdf', '00000000-0000-0000-0000-000000000001');
