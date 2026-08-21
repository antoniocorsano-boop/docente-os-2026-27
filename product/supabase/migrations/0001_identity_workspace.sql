begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('PERSONAL','SCHOOL')),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','MEMBER')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_year_dates_valid check (ends_on > starts_on),
  unique (workspace_id, label)
);

create index if not exists idx_workspaces_owner on public.workspaces(owner_user_id);
create index if not exists idx_memberships_user on public.workspace_memberships(user_id);
create index if not exists idx_academic_years_workspace on public.academic_years(workspace_id);

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
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.academic_years enable row level security;

create policy profiles_select_self
on public.profiles for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy profiles_insert_self
on public.profiles for insert to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy workspaces_select_member
on public.workspaces for select to authenticated
using (private.is_workspace_member(id));

create policy workspaces_insert_owner
on public.workspaces for insert to authenticated
with check ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));

create policy workspaces_update_owner
on public.workspaces for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy memberships_select_member
on public.workspace_memberships for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy memberships_insert_personal_owner
on public.workspace_memberships for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id
      and w.owner_user_id = (select auth.uid())
  )
);

create policy academic_years_select_member
on public.academic_years for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy academic_years_insert_member
on public.academic_years for insert to authenticated
with check (private.is_workspace_member(workspace_id));

create policy academic_years_update_member
on public.academic_years for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

create or replace function public.bootstrap_personal_workspace(workspace_name text default 'Il mio spazio docente')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles(user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select w.id into wid
  from public.workspaces w
  where w.owner_user_id = uid and w.kind = 'PERSONAL'
  order by w.created_at
  limit 1;

  if wid is null then
    insert into public.workspaces(kind, name, owner_user_id)
    values ('PERSONAL', coalesce(nullif(trim(workspace_name), ''), 'Il mio spazio docente'), uid)
    returning id into wid;
  end if;

  insert into public.workspace_memberships(workspace_id, user_id, role)
  values (wid, uid, 'OWNER')
  on conflict (workspace_id, user_id) do update set role = 'OWNER';

  return wid;
end;
$$;

revoke all on function public.bootstrap_personal_workspace(text) from public;
grant execute on function public.bootstrap_personal_workspace(text) to authenticated;

commit;
