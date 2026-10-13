begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (100, '0100_contain_provenance_anchor_and_column_grants')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- CONTAIN-01 hardening: provenance must fail closed when the containment anchor
-- itself is absent from migration history. A manifest entry is authoritative only
-- up to the active runtime contract watermark: a future/self-registered migration
-- must not become trusted before the canonical watermark advances to that version.
create or replace function private.runtime_schema_unexpected_migrations_since_containment()
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_anchor_version bigint;
  v_active_contract_version integer;
  v_unexpected text[];
begin
  select state.contract_version
    into v_active_contract_version
  from public.runtime_schema_contract_state state
  where state.singleton;

  if v_active_contract_version is null then
    return array['ACTIVE_WATERMARK_MISSING']::text[];
  end if;

  select max(history.version::bigint)
    into v_anchor_version
  from supabase_migrations.schema_migrations history
  where regexp_replace(history.name, '^[0-9]{4}_', '') =
        regexp_replace(
          '0098_contain_legacy_atlas_runtime_and_reconcile_cpri',
          '^[0-9]{4}_',
          ''
        );

  if v_anchor_version is null then
    return array['CONTAINMENT_ANCHOR_MISSING']::text[];
  end if;

  select coalesce(
    array_agg(history.name order by history.version::bigint),
    array[]::text[]
  )
    into v_unexpected
  from supabase_migrations.schema_migrations history
  where history.version::bigint > v_anchor_version
    and not exists (
      select 1
      from private.runtime_schema_required_migrations required
      where required.version <= v_active_contract_version
        and regexp_replace(history.name, '^[0-9]{4}_', '') =
            regexp_replace(required.migration_id, '^[0-9]{4}_', '')
    );

  return v_unexpected;
end;
$function$;

revoke all on function private.runtime_schema_unexpected_migrations_since_containment()
  from public, anon, authenticated, service_role;

comment on function private.runtime_schema_unexpected_migrations_since_containment() is
  'CONTAIN-01 provenance guard: requires the 0098 containment anchor and trusts only registered post-containment migrations at or below the active runtime contract watermark.';

-- CONTAIN-01 hardening: table privileges and column privileges are separate in
-- PostgreSQL. Keep the existing effective table-level checks and additionally
-- reject inherited INSERT/UPDATE/REFERENCES authority on any CPRI column.
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

  -- The Atlas containment guard is authoritative only if both its trigger shape
  -- and its bound implementation remain canonical. A trigger WHEN clause can make
  -- the guard inert, while a same-named trigger function can drift to a no-op.
  -- Compare the complete function source after whitespace normalization so benign
  -- formatting differences do not matter but any semantic body change fails closed.
  select exists (
    select 1
    from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = function_row.pronamespace
    join pg_catalog.pg_language language_row on language_row.oid = function_row.prolang
    where trigger_row.tgrelid = 'public.lesson_design_extensions'::regclass
      and trigger_row.tgname = 'lesson_design_extensions_reject_deferred_atlas_insert'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled in ('O', 'A')
      and trigger_row.tgtype = 7
      and trigger_row.tgqual is null
      and namespace_row.nspname = 'private'
      and function_row.proname = 'reject_deferred_atlas_lesson_design_insert'
      and language_row.lanname = 'plpgsql'
      and not function_row.prosecdef
      and pg_catalog.btrim(
        pg_catalog.regexp_replace(function_row.prosrc, '[[:space:]]+', ' ', 'g')
      ) = pg_catalog.btrim(
        pg_catalog.regexp_replace(
          $guard$
begin
  if new.source_kind = 'ATLAS'
    and (
      new.payload ->> 'area' = 'atlas_materials'
      or new.payload ? 'bundleId'
      or new.payload ? 'sourceUdaId'
    ) then
    raise exception 'Studio Atlas lesson material runtime is deferred';
  end if;

  return new;
end;
$guard$,
          '[[:space:]]+',
          ' ',
          'g'
        )
      )
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
      or has_any_column_privilege('anon', v_cpri_table, 'INSERT')
      or has_any_column_privilege('anon', v_cpri_table, 'UPDATE')
      or has_any_column_privilege('anon', v_cpri_table, 'REFERENCES')
      or has_table_privilege('authenticated', v_cpri_table, 'INSERT')
      or has_table_privilege('authenticated', v_cpri_table, 'UPDATE')
      or has_table_privilege('authenticated', v_cpri_table, 'DELETE')
      or has_table_privilege('authenticated', v_cpri_table, 'TRUNCATE')
      or has_table_privilege('authenticated', v_cpri_table, 'REFERENCES')
      or has_table_privilege('authenticated', v_cpri_table, 'TRIGGER')
      or has_any_column_privilege('authenticated', v_cpri_table, 'INSERT')
      or has_any_column_privilege('authenticated', v_cpri_table, 'UPDATE')
      or has_any_column_privilege('authenticated', v_cpri_table, 'REFERENCES')
      or has_table_privilege('service_role', v_cpri_table, 'INSERT')
      or has_table_privilege('service_role', v_cpri_table, 'UPDATE')
      or has_table_privilege('service_role', v_cpri_table, 'DELETE')
      or has_table_privilege('service_role', v_cpri_table, 'TRUNCATE')
      or has_table_privilege('service_role', v_cpri_table, 'REFERENCES')
      or has_table_privilege('service_role', v_cpri_table, 'TRIGGER')
      or has_any_column_privilege('service_role', v_cpri_table, 'INSERT')
      or has_any_column_privilege('service_role', v_cpri_table, 'UPDATE')
      or has_any_column_privilege('service_role', v_cpri_table, 'REFERENCES');
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
  'CONTAIN-01 containment snapshot: requires an origin-firing, unconditional Atlas INSERT guard with the canonical implementation and rejects effective runtime mutation authority on CPRI, including inherited column-level grants.';

select private.advance_runtime_schema_contract(
  '0100_contain_provenance_anchor_and_column_grants'
);

commit;