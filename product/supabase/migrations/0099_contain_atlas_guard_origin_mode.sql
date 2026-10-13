begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (99, '0099_contain_atlas_guard_origin_mode')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- CONTAIN-01 hardening: the legacy Studio Atlas containment trigger must fire
-- for ordinary origin/PostgREST writes. ENABLE REPLICA ('R') is not sufficient.
alter table public.lesson_design_extensions
  enable trigger lesson_design_extensions_reject_deferred_atlas_insert;

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
  v_atlas_bundle_insert_guard_present boolean := false;
  v_cpri_runtime_mutators_present boolean := false;
  v_cpri_runtime_mutators_exposed boolean := false;
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

  select exists (
    select 1
    from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = function_row.pronamespace
    where trigger_row.tgrelid = 'public.lesson_design_extensions'::regclass
      and trigger_row.tgname = 'lesson_design_extensions_reject_deferred_atlas_insert'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled in ('O', 'A')
      and namespace_row.nspname = 'private'
      and function_row.proname = 'reject_deferred_atlas_lesson_design_insert'
  ) into v_atlas_bundle_insert_guard_present;

  v_cpri_runtime_mutators_present :=
    to_regprocedure('public.bind_canonical_plan_runtime_source(uuid,uuid,text,uuid,uuid)') is not null
    or to_regprocedure('public.backfill_canonical_plan_runtime_bindings()') is not null;

  select exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) privilege
    left join pg_catalog.pg_roles role on role.oid = privilege.grantee
    where namespace_row.nspname = 'public'
      and p.proname in ('bind_canonical_plan_runtime_source', 'backfill_canonical_plan_runtime_bindings')
      and privilege.privilege_type = 'EXECUTE'
      and (
        privilege.grantee = 0
        or role.rolname in ('anon', 'authenticated', 'service_role')
      )
  ) into v_cpri_runtime_mutators_exposed;

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
    'atlasBundleInsertGuardPresent', v_atlas_bundle_insert_guard_present,
    'cpriBindingTablePresent', v_cpri_table is not null,
    'cpriLegacyMutatorsPresent', v_cpri_runtime_mutators_present,
    'cpriLegacyMutatorsExposed', v_cpri_runtime_mutators_exposed,
    'cpriRuntimeMutationGrants', v_cpri_runtime_mutation_grants,
    'ok',
      not v_atlas_runtime_exposed
      and v_atlas_bundle_insert_guard_present
      and v_cpri_table is not null
      and not v_cpri_runtime_mutators_exposed
      and not v_cpri_runtime_mutation_grants
  );
end;
$function$;

revoke all on function private.runtime_sensitive_containment_snapshot()
  from public, anon, authenticated, service_role;

comment on function private.runtime_sensitive_containment_snapshot() is
  'CONTAIN-01 containment snapshot: Atlas guard is healthy only when it fires for origin writes (tgenabled O or A).';

select private.advance_runtime_schema_contract('0099_contain_atlas_guard_origin_mode');

commit;
