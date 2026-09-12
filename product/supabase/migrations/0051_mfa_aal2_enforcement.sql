begin;

-- ASVS V6.3.3 / L2: authenticated is not sufficient for application data.
-- All application data-plane access requires a JWT whose authenticator
-- assurance level is aal2. Missing/malformed claims fail closed.
create or replace function private.current_session_is_aal2()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

revoke all on function private.current_session_is_aal2() from public, anon;
grant execute on function private.current_session_is_aal2() to authenticated;

-- Most SECURITY DEFINER application RPCs already authorize through this helper.
-- Folding AAL2 into the canonical membership predicate prevents those RPCs from
-- becoming an RLS bypass while preserving their existing workspace semantics.
create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_session_is_aal2()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;

-- bootstrap_personal_workspace is the one authenticated SECURITY DEFINER write
-- boundary that does not use is_workspace_member. Guard it explicitly so AAL1
-- cannot create or mutate application state by calling the RPC directly.
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
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not private.current_session_is_aal2() then
    raise exception 'aal2 required' using errcode = '42501';
  end if;

  insert into public.profiles(user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select w.id into wid
  from public.workspaces w
  where w.owner_user_id = uid
    and w.kind = 'PERSONAL'
  order by w.created_at asc
  limit 1;

  if wid is null then
    insert into public.workspaces(kind, name, owner_user_id)
    values ('PERSONAL', coalesce(nullif(trim(workspace_name), ''), 'Il mio spazio docente'), uid)
    returning id into wid;
  end if;

  insert into public.workspace_memberships(workspace_id, user_id, role)
  values (wid, uid, 'OWNER')
  on conflict (workspace_id, user_id) do update set role = 'OWNER';

  insert into public.user_workspace_preferences(user_id, current_workspace_id)
  values (uid, wid)
  on conflict (user_id) do nothing;

  return wid;
end;
$$;

revoke all on function public.bootstrap_personal_workspace(text) from public, anon;
grant execute on function public.bootstrap_personal_workspace(text) to authenticated;

-- Restrictive policies are AND-ed with the existing permissive membership/self
-- policies. This preserves all existing authorization rules while adding AAL2
-- as a mandatory precondition for every authenticated operation.
do $mfa_policy$
declare
  target record;
begin
  for target in
    select n.nspname as schema_name, c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  loop
    execute format(
      'drop policy if exists mfa_aal2_required on %I.%I',
      target.schema_name,
      target.table_name
    );
    execute format(
      'create policy mfa_aal2_required on %I.%I as restrictive for all to authenticated using (private.current_session_is_aal2()) with check (private.current_session_is_aal2())',
      target.schema_name,
      target.table_name
    );
  end loop;
end;
$mfa_policy$;

-- Storage is a separate schema and is not covered by the public-table event
-- trigger. Protect the Knowledge object data-plane explicitly.
drop policy if exists mfa_aal2_required on storage.objects;
create policy mfa_aal2_required
on storage.objects
as restrictive
for all
to authenticated
using (private.current_session_is_aal2())
with check (private.current_session_is_aal2());

-- Keep the existing RLS auto-enable invariant and extend it monotonically:
-- every future public table gets both RLS and the restrictive AAL2 policy.
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
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        execute format('drop policy if exists mfa_aal2_required on %s', cmd.object_identity);
        execute format(
          'create policy mfa_aal2_required on %s as restrictive for all to authenticated using (private.current_session_is_aal2()) with check (private.current_session_is_aal2())',
          cmd.object_identity
        );
        raise log 'rls_auto_enable: enabled RLS + AAL2 on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enforce RLS + AAL2 on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (schema: %)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

comment on function private.current_session_is_aal2() is
  'ASVS V6.3.3 guard: true only when the current authenticated JWT carries aal=aal2.';
comment on function private.is_workspace_member(uuid) is
  'Canonical workspace authorization guard; membership is usable by the application only from an AAL2 session.';
comment on policy mfa_aal2_required on storage.objects is
  'Restrictive MFA gate for authenticated Knowledge Storage access; existing ownership/membership policies still apply.';

commit;
