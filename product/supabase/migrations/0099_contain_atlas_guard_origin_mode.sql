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
  v_cpri_bind_rpc oid;
  v_cpri_backfill_rpc oid;
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
  v_cpri_bind_rpc := to_regprocedure(
    'public.bind_canonical_plan_runtime_source(uuid,uuid,text,uuid,uuid)'
  );
  v_cpri_backfill_rpc := to_regprocedure('public.backfill_canonical_plan_runtime_bindings()');

  -- Effective privilege checks intentionally use has_*_privilege rather than
  -- direct ACL inspection so PUBLIC grants and inherited role membership are
  -- included in the runtime authority decision.
  if v_atlas_rpc is not null then
    v_atlas_runtime_exposed :=
      has_function_privilege('anon', v_atlas_rpc, 'EXECUTE')
      or has_function_privilege('authenticated', v_atlas_rpc, 'EXECUTE')
      or has_function_privilege('service_role', v_atlas_rpc, 'EXECUTE');
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
      -- tgtype 7 = ROW (1) + BEFORE (2) + INSERT (4). A same-named trigger
      -- attached only to UPDATE/DELETE must never satisfy containment.
      and trigger_row.tgtype = 7
      and namespace_row.nspname = 'private'
      and function_row.proname = 'reject_deferred_atlas_lesson_design_insert'
  ) into v_atlas_bundle_insert_guard_present;

  v_cpri_runtime_mutators_present :=
    v_cpri_bind_rpc is not null
    or v_cpri_backfill_rpc is not null;

  if v_cpri_bind_rpc is not null then
    v_cpri_runtime_mutators_exposed :=
      v_cpri_runtime_mutators_exposed
      or has_function_privilege('anon', v_cpri_bind_rpc, 'EXECUTE')
      or has_function_privilege('authenticated', v_cpri_bind_rpc, 'EXECUTE')
      or has_function_privilege('service_role', v_cpri_bind_rpc, 'EXECUTE');
  end if;

  if v_cpri_backfill_rpc is not null then
    v_cpri_runtime_mutators_exposed :=
      v_cpri_runtime_mutators_exposed
      or has_function_privilege('anon', v_cpri_backfill_rpc, 'EXECUTE')
      or has_function_privilege('authenticated', v_cpri_backfill_rpc, 'EXECUTE')
      or has_function_privilege('service_role', v_cpri_backfill_rpc, 'EXECUTE');
  end if;

  if v_cpri_table is not null then
    v_cpri_runtime_mutation_grants :=
      has_table_privilege('anon', v_cpri_table, 'INSERT')
      or has_table_privilege('anon', v_cpri_table, 'UPDATE')
      or has_table_privilege('anon', v_cpri_table, 'DELETE')
      or has_table_privilege('anon', v_cpri_table, 'TRUNCATE')
      or has_table_privilege('anon', v_cpri_table, 'REFERENCES')
      or has_table_privilege('anon', v_cpri_table, 'TRIGGER')
      or has_table_privilege('authenticated', v_cpri_table, 'INSERT')
      or has_table_privilege('authenticated', v_cpri_table, 'UPDATE')
      or has_table_privilege('authenticated', v_cpri_table, 'DELETE')
      or has_table_privilege('authenticated', v_cpri_table, 'TRUNCATE')
      or has_table_privilege('authenticated', v_cpri_table, 'REFERENCES')
      or has_table_privilege('authenticated', v_cpri_table, 'TRIGGER')
      or has_table_privilege('service_role', v_cpri_table, 'INSERT')
      or has_table_privilege('service_role', v_cpri_table, 'UPDATE')
      or has_table_privilege('service_role', v_cpri_table, 'DELETE')
      or has_table_privilege('service_role', v_cpri_table, 'TRUNCATE')
      or has_table_privilege('service_role', v_cpri_table, 'REFERENCES')
      or has_table_privilege('service_role', v_cpri_table, 'TRIGGER');
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
  'CONTAIN-01 containment snapshot: requires a ROW BEFORE INSERT Atlas guard firing for origin writes and evaluates effective runtime privileges, including inherited authority.';

select private.advance_runtime_schema_contract('0099_contain_atlas_guard_origin_mode');

commit;
