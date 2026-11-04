-- CURR-DELIVERY-02B: provision a private, fail-closed transport boundary.
-- This does NOT publish the Arena master, create a read entitlement,
-- attest an institution, or mutate any 2C/P7 curricolo/lesson receipt.
begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (106, '0106_arena_provisional_private_delivery_acl')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- Personal/teacher *read permission* is NOT a school curricolo approval
-- and NOT the institution binding gate from migration 0105.
create table private.arena_provisional_delivery_read_grants (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  source_sha256 text not null
    check (source_sha256 = 'de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809'),
  source_revision_id text not null check (source_revision_id = '27'),
  source_master_version text not null check (source_master_version = '1.3'),
  access_receipt_ref text not null check (char_length(btrim(access_receipt_ref)) between 8 and 240),
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  enabled boolean not null default false,
  primary key (workspace_id, academic_year_id, user_id)
);

-- The one source object must be bound to ONE explicitly authorized workspace
-- before any individual grant can unlock it. This stops a grant for space A
-- from authorizing access while the application is operating in space B.
-- An empty or disabled binding is a hard denial, not a default permission.
create table private.arena_provisional_delivery_active_binding (
  source_key text primary key
    check (source_key = 'arena-1.3-rev27'),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  source_sha256 text not null
    check (source_sha256 = 'de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809'),
  authorization_receipt_ref text not null
    check (char_length(btrim(authorization_receipt_ref)) between 8 and 240),
  bound_by uuid not null references auth.users(id) on delete restrict,
  bound_at timestamptz not null default now(),
  enabled boolean not null default false
);

alter table private.arena_provisional_delivery_active_binding enable row level security;
revoke all on private.arena_provisional_delivery_active_binding
  from public, anon, authenticated;

alter table private.arena_provisional_delivery_read_grants enable row level security;
revoke all on private.arena_provisional_delivery_read_grants
  from public, anon, authenticated;

-- A narrowly-scoped helper is used because the private grant register
-- is intentionally not selectable by browser-authenticated clients.
create function private.can_read_arena_provisional_release_v1(target_workspace_ref text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) is false
    and exists (
      select 1
      from private.arena_provisional_delivery_read_grants g
      join private.arena_provisional_delivery_active_binding b
        on b.source_key = 'arena-1.3-rev27'
       and b.workspace_id = g.workspace_id
       and b.workspace_id::text = target_workspace_ref
       and b.academic_year_id = g.academic_year_id
       and b.source_sha256 = g.source_sha256
       and b.enabled = true
      join public.workspace_memberships wm
        on wm.workspace_id = g.workspace_id
       and wm.user_id = g.user_id
      join public.academic_years ay
        on ay.id = g.academic_year_id
       and ay.workspace_id = g.workspace_id
      where g.user_id = (select auth.uid())
        and g.enabled = true
        and g.source_sha256 =
          'de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809'
        and g.source_revision_id = '27'
        and g.source_master_version = '1.3'
        and replace(ay.label, '/', '-') = '2026-2027'
    );
$$;

revoke all on function private.can_read_arena_provisional_release_v1(text)
  from public, anon, authenticated;
grant execute on function private.can_read_arena_provisional_release_v1(text)
  to authenticated;

-- Empty by design: no release bytes are written by this migration.
-- Never make the bucket public. Do not silently adopt an existing bucket
-- with broader settings; reject it and require an operator review.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arena-curricolo-private',
  'arena-curricolo-private',
  false,
  2000000,
  array['application/json']::text[]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'arena-curricolo-private'
      and name = 'arena-curricolo-private'
      and public is false
      and file_size_limit = 2000000
      and allowed_mime_types = array['application/json']::text[]
  ) then
    raise exception 'Arena private release bucket is not exclusively configured';
  end if;
end;
$$;

-- Only reading the one qualified immutable key can be authorized. There
-- is deliberately NO INSERT/UPDATE/DELETE policy for client roles.
drop policy if exists arena_curricolo_provisional_release_read_granted
  on storage.objects;
create policy arena_curricolo_provisional_release_read_granted
on storage.objects
for select to authenticated
using (
  bucket_id = 'arena-curricolo-private'
  -- The object path carries the workspace identity. A grant in another
  -- workspace cannot authorize this path even if the same user belongs to both.
  and name = ((storage.foldername(name))[1] ||
    '/vertical/2026-2027/master-1.3-rev27/complete-release.json')
  and storage.allow_any_operation(array[
    'object.get_authenticated',
    'object.get_authenticated_info'
  ])
  and private.can_read_arena_provisional_release_v1(
    (storage.foldername(name))[1]
  )
);

select private.advance_runtime_schema_contract(
  '0106_arena_provisional_private_delivery_acl'
);
commit;
