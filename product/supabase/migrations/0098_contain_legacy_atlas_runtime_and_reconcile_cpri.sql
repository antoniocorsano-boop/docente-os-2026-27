begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (98, '0098_contain_legacy_atlas_runtime_and_reconcile_cpri')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- CONTAIN-01 adopts the already-observed CPRI state as preserved data only.
-- No application runtime writer is authorized by this migration.
create table if not exists public.canonical_plan_runtime_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  canonical_plan_code text not null check (canonical_plan_code in ('CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3')),
  asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, academic_year_id, canonical_plan_code)
);

create index if not exists canonical_plan_runtime_bindings_asset_idx
  on public.canonical_plan_runtime_bindings(asset_id);
create index if not exists canonical_plan_runtime_bindings_generation_idx
  on public.canonical_plan_runtime_bindings(generation_id);

do $cpri_shape$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'canonical_plan_runtime_bindings'
      and column_name = 'workspace_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'canonical_plan_runtime_bindings'
      and column_name = 'academic_year_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'canonical_plan_runtime_bindings'
      and column_name = 'canonical_plan_code'
      and data_type = 'text'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'canonical_plan_runtime_bindings'
      and column_name = 'asset_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'canonical_plan_runtime_bindings'
      and column_name = 'generation_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception 'CONTAIN-01 found an incompatible canonical_plan_runtime_bindings shape';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.canonical_plan_runtime_bindings'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ~ 'UNIQUE.*workspace_id.*academic_year_id.*canonical_plan_code'
  ) then
    raise exception 'CONTAIN-01 requires one binding per workspace/year/CAN-PLAN code';
  end if;
end;
$cpri_shape$;

create or replace function private.enforce_canonical_plan_runtime_binding()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_academic_workspace_id uuid;
  v_asset_workspace_id uuid;
  v_asset_academic_year_id uuid;
  v_generation_asset_id uuid;
  v_generation_workspace_id uuid;
  v_generation_status text;
begin
  new.canonical_plan_code := upper(btrim(new.canonical_plan_code));

  if tg_op = 'UPDATE' and (
    new.workspace_id is distinct from old.workspace_id
    or new.academic_year_id is distinct from old.academic_year_id
    or new.canonical_plan_code is distinct from old.canonical_plan_code
  ) then
    raise exception 'canonical plan binding identity is immutable';
  end if;

  select ay.workspace_id
    into v_academic_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;

  if v_academic_workspace_id is null or v_academic_workspace_id <> new.workspace_id then
    raise exception 'canonical plan academic year must belong to the binding workspace';
  end if;

  select ka.workspace_id, ka.academic_year_id
    into v_asset_workspace_id, v_asset_academic_year_id
  from public.knowledge_assets ka
  where ka.id = new.asset_id;

  if v_asset_workspace_id is null
    or v_asset_workspace_id <> new.workspace_id
    or v_asset_academic_year_id is distinct from new.academic_year_id then
    raise exception 'canonical plan asset must belong to the binding workspace and academic year';
  end if;

  select kpg.asset_id, kpg.workspace_id, kpg.status
    into v_generation_asset_id, v_generation_workspace_id, v_generation_status
  from public.knowledge_processing_generations kpg
  where kpg.id = new.generation_id;

  if v_generation_asset_id is null
    or v_generation_asset_id <> new.asset_id
    or v_generation_workspace_id <> new.workspace_id then
    raise exception 'canonical plan generation must belong to the bound asset and workspace';
  end if;

  if v_generation_status <> 'SUCCEEDED' then
    raise exception 'canonical plan generation must be SUCCEEDED before binding';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_canonical_plan_runtime_binding() from public, anon, authenticated, service_role;

drop trigger if exists canonical_plan_runtime_bindings_enforce on public.canonical_plan_runtime_bindings;
create trigger canonical_plan_runtime_bindings_enforce
before insert or update on public.canonical_plan_runtime_bindings
for each row execute function private.enforce_canonical_plan_runtime_binding();

alter table public.canonical_plan_runtime_bindings enable row level security;

drop policy if exists canonical_plan_runtime_bindings_select_member on public.canonical_plan_runtime_bindings;
create policy canonical_plan_runtime_bindings_select_member
on public.canonical_plan_runtime_bindings
for select
to authenticated
using (private.is_workspace_member(workspace_id));

revoke all on table public.canonical_plan_runtime_bindings from public, anon, authenticated, service_role;
grant select on table public.canonical_plan_runtime_bindings to authenticated;

comment on table public.canonical_plan_runtime_bindings is
  'CONTAIN-01 salvaged historical CPRI binding state; runtime mutation remains deferred';

-- Any legacy CPRI mutator came from an out-of-lineage experiment. Preserve the rows,
-- but remove the mutation boundary until CPRI-01 is independently qualified.
drop function if exists public.bind_canonical_plan_runtime_source(uuid, uuid, text, uuid, uuid);
drop function if exists public.backfill_canonical_plan_runtime_bindings();

-- The legacy Atlas RPC may exist only on environments that received the frozen #692
-- experiment. Preserve the function definition as forensic evidence, but remove all
-- runtime execution capability. On clean replay the function is absent and stays absent.
do $atlas_containment$
begin
  if to_regprocedure(
    'public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)'
  ) is not null then
    execute 'revoke all on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role';
    execute $comment$
      comment on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) is
      'CONTAIN-01 legacy Studio Atlas write boundary retained only as forensic schema evidence; runtime execution is revoked pending explicit governance authorization.'
    $comment$;
  end if;
end;
$atlas_containment$;

create or replace function private.runtime_schema_unexpected_migrations_since_containment()
returns text[]
language sql
stable
security definer
set search_path = ''
as $function$
  with containment_anchor as (
    select max(history.version::bigint) as version
    from supabase_migrations.schema_migrations history
    where regexp_replace(history.name, '^[0-9]{4}_', '') =
          regexp_replace('0098_contain_legacy_atlas_runtime_and_reconcile_cpri', '^[0-9]{4}_', '')
  )
  select coalesce(
    array_agg(history.name order by history.version::bigint),
    array[]::text[]
  )
  from supabase_migrations.schema_migrations history
  cross join containment_anchor anchor
  where anchor.version is not null
    and history.version::bigint > anchor.version
    and not exists (
      select 1
      from private.runtime_schema_required_migrations required
      where regexp_replace(history.name, '^[0-9]{4}_', '') =
            regexp_replace(required.migration_id, '^[0-9]{4}_', '')
    );
$function$;

revoke all on function private.runtime_schema_unexpected_migrations_since_containment() from public, anon, authenticated, service_role;

create or replace function private.runtime_sensitive_containment_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_atlas_rpc oid;
  v_cpri_table oid;
  v_atlas_runtime_exposed boolean := false;
  v_cpri_runtime_mutators_present boolean := false;
  v_cpri_runtime_mutation_grants boolean := false;
begin
  v_atlas_rpc := to_regprocedure(
    'public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)'
  );
  v_cpri_table := to_regclass('public.canonical_plan_runtime_bindings');

  if v_atlas_rpc is not null then
    select exists (
      select 1
      from pg_catalog.pg_proc p
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) privilege
      left join pg_catalog.pg_roles role on role.oid = privilege.grantee
      where p.oid = v_atlas_rpc
        and privilege.privilege_type = 'EXECUTE'
        and (
          privilege.grantee = 0
          or role.rolname in ('anon', 'authenticated', 'service_role')
        )
    ) into v_atlas_runtime_exposed;
  end if;

  v_cpri_runtime_mutators_present :=
    to_regprocedure('public.bind_canonical_plan_runtime_source(uuid,uuid,text,uuid,uuid)') is not null
    or to_regprocedure('public.backfill_canonical_plan_runtime_bindings()') is not null;

  if v_cpri_table is not null then
    select exists (
      select 1
      from pg_catalog.pg_class relation
      cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
      left join pg_catalog.pg_roles role on role.oid = privilege.grantee
      where relation.oid = v_cpri_table
        and privilege.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
        and (
          privilege.grantee = 0
          or role.rolname in ('anon', 'authenticated', 'service_role')
        )
    ) into v_cpri_runtime_mutation_grants;
  end if;

  return jsonb_build_object(
    'legacyAtlasRpcPresent', v_atlas_rpc is not null,
    'legacyAtlasRuntimeExposed', v_atlas_runtime_exposed,
    'cpriBindingTablePresent', v_cpri_table is not null,
    'cpriRuntimeMutatorsPresent', v_cpri_runtime_mutators_present,
    'cpriRuntimeMutationGrants', v_cpri_runtime_mutation_grants,
    'ok',
      not v_atlas_runtime_exposed
      and v_cpri_table is not null
      and not v_cpri_runtime_mutators_present
      and not v_cpri_runtime_mutation_grants
  );
end;
$function$;

revoke all on function private.runtime_sensitive_containment_snapshot() from public, anon, authenticated, service_role;

create or replace function public.runtime_schema_contract_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_current_version integer;
  v_current_migration_id text;
  v_current_updated_at timestamptz;
  v_missing_migrations text[];
  v_unexpected_migrations text[];
  v_containment jsonb;
begin
  select s.contract_version, s.migration_id, s.updated_at
    into v_current_version, v_current_migration_id, v_current_updated_at
  from public.runtime_schema_contract_state s
  where s.singleton;

  if v_current_migration_id is null then
    raise exception 'runtime schema contract state is missing';
  end if;

  v_missing_migrations := private.runtime_schema_missing_migrations(v_current_version);
  v_unexpected_migrations := private.runtime_schema_unexpected_migrations_since_containment();
  v_containment := private.runtime_sensitive_containment_snapshot();

  return jsonb_build_object(
    'schema', 'docente-os.runtime-schema-contract.v3',
    'contractVersion', v_current_version,
    'migrationId', v_current_migration_id,
    'updatedAt', v_current_updated_at,
    'lineageStartVersion', 60,
    'lineageOk', cardinality(v_missing_migrations) = 0,
    'missingMigrations', to_jsonb(v_missing_migrations),
    'provenanceOk', cardinality(v_unexpected_migrations) = 0,
    'unexpectedMigrations', to_jsonb(v_unexpected_migrations),
    'containmentOk', coalesce((v_containment ->> 'ok')::boolean, false),
    'containment', v_containment
  );
end;
$function$;

revoke all on function public.runtime_schema_contract_snapshot() from public;
grant execute on function public.runtime_schema_contract_snapshot() to anon, authenticated;

comment on function public.runtime_schema_contract_snapshot() is
  'Runtime schema v3 snapshot: canonical lineage, post-CONTAIN-01 migration provenance, and sensitive runtime containment health.';

select private.advance_runtime_schema_contract('0098_contain_legacy_atlas_runtime_and_reconcile_cpri');

commit;
