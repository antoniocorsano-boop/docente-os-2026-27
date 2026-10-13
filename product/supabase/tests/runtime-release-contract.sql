create extension if not exists plpgsql_check;

do $contract$
declare
  issue_count integer;
  runtime_migration text;
  runtime_snapshot jsonb;
  timetable_activation_definition text;
  occurrence_activity_rpc_definition text;
  occurrence_activity_guard_definition text;
  teaching_session_lock_definition text;
  atlas_insert_guard_definition text;
  atlas_rpc regprocedure;
  cpri_bind_rpc regprocedure;
  cpri_backfill_rpc regprocedure;
  trigger_shape_rejected boolean := false;
  inherited_privilege_rejected boolean := false;
begin
  if to_regclass('public.runtime_schema_contract_state') is null then
    raise exception 'runtime schema contract state table missing after migration replay';
  end if;

  select s.migration_id
    into runtime_migration
  from public.runtime_schema_contract_state s
  where s.singleton;

  if runtime_migration is null then
    raise exception 'runtime schema contract watermark is empty';
  end if;

  if to_regprocedure('public.runtime_schema_contract_snapshot()') is null then
    raise exception 'runtime schema lineage snapshot function missing';
  end if;

  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;

  if coalesce((runtime_snapshot->>'lineageOk')::boolean, false) is not true then
    raise exception
      'runtime schema lineage is incomplete: %',
      runtime_snapshot->'missingMigrations';
  end if;

  if runtime_snapshot->>'migrationId' <> runtime_migration then
    raise exception
      'runtime schema snapshot/watermark mismatch: snapshot %, state %',
      runtime_snapshot->>'migrationId',
      runtime_migration;
  end if;

  if runtime_snapshot->>'schema' <> 'docente-os.runtime-schema-contract.v3' then
    raise exception 'CONTAIN-01 runtime schema snapshot must expose v3';
  end if;

  if coalesce((runtime_snapshot->>'provenanceOk')::boolean, false) is not true then
    raise exception
      'runtime schema provenance contains unexpected post-containment migrations: %',
      runtime_snapshot->'unexpectedMigrations';
  end if;

  if coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true then
    raise exception
      'runtime sensitive containment is not healthy: %',
      runtime_snapshot->'containment';
  end if;

  if to_regclass('public.canonical_plan_runtime_bindings') is null then
    raise exception 'CONTAIN-01 CPRI salvage table missing after migration replay';
  end if;

  if has_table_privilege('authenticated', 'public.canonical_plan_runtime_bindings', 'INSERT')
     or has_table_privilege('authenticated', 'public.canonical_plan_runtime_bindings', 'UPDATE')
     or has_table_privilege('authenticated', 'public.canonical_plan_runtime_bindings', 'DELETE')
     or has_table_privilege('service_role', 'public.canonical_plan_runtime_bindings', 'INSERT')
     or has_table_privilege('service_role', 'public.canonical_plan_runtime_bindings', 'UPDATE')
     or has_table_privilege('service_role', 'public.canonical_plan_runtime_bindings', 'DELETE') then
    raise exception 'CONTAIN-01 CPRI salvage table exposes a runtime mutation grant';
  end if;

  if to_regprocedure('private.reject_deferred_atlas_lesson_design_insert()') is null then
    raise exception 'CONTAIN-01 Atlas bundle insert guard function missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.lesson_design_extensions'::regclass
      and tgname = 'lesson_design_extensions_reject_deferred_atlas_insert'
      and not tgisinternal
      and tgenabled in ('O', 'A')
      and tgtype = 7
  ) then
    raise exception 'CONTAIN-01 Atlas bundle insert guard trigger missing or not ROW BEFORE INSERT origin-firing';
  end if;

  -- Regression for Codex P2 #1: a replica-only trigger is visible in pg_trigger but
  -- does not fire for ordinary PostgREST/origin writes. The runtime snapshot must
  -- therefore fail containment while the trigger is in REPLICA mode, then recover
  -- after restoring normal origin firing.
  execute 'alter table public.lesson_design_extensions enable replica trigger lesson_design_extensions_reject_deferred_atlas_insert';
  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  if coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is true then
    raise exception 'CONTAIN-01 runtime snapshot incorrectly accepts a REPLICA-only Atlas guard';
  end if;

  execute 'alter table public.lesson_design_extensions enable trigger lesson_design_extensions_reject_deferred_atlas_insert';
  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  if coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true then
    raise exception 'CONTAIN-01 runtime snapshot did not recover after restoring origin-firing Atlas guard';
  end if;

  -- Regression for fresh Codex P2: object/name/mode checks are insufficient if the
  -- trigger is recreated on UPDATE instead of INSERT. Probe the exact firing shape.
  execute 'drop trigger lesson_design_extensions_reject_deferred_atlas_insert on public.lesson_design_extensions';
  execute 'create trigger lesson_design_extensions_reject_deferred_atlas_insert before update on public.lesson_design_extensions for each row execute function private.reject_deferred_atlas_lesson_design_insert()';
  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  trigger_shape_rejected := coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true;

  execute 'drop trigger lesson_design_extensions_reject_deferred_atlas_insert on public.lesson_design_extensions';
  execute 'create trigger lesson_design_extensions_reject_deferred_atlas_insert before insert on public.lesson_design_extensions for each row execute function private.reject_deferred_atlas_lesson_design_insert()';
  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  if coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true then
    raise exception 'CONTAIN-01 runtime snapshot did not recover after restoring ROW BEFORE INSERT Atlas guard';
  end if;

  select pg_get_functiondef('private.reject_deferred_atlas_lesson_design_insert()'::regprocedure)
    into atlas_insert_guard_definition;

  if position('new.source_kind = ''ATLAS''' in atlas_insert_guard_definition) = 0
     or position('new.payload ->> ''area'' = ''atlas_materials''' in atlas_insert_guard_definition) = 0
     or position('new.payload ? ''bundleId''' in atlas_insert_guard_definition) = 0
     or position('new.payload ? ''sourceUdaId''' in atlas_insert_guard_definition) = 0 then
    raise exception 'CONTAIN-01 Atlas guard is not narrowly scoped to the legacy Studio bundle signature';
  end if;

  atlas_rpc := to_regprocedure(
    'public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)'
  );
  if atlas_rpc is not null and (
    has_function_privilege('anon', atlas_rpc, 'EXECUTE')
    or has_function_privilege('authenticated', atlas_rpc, 'EXECUTE')
    or has_function_privilege('service_role', atlas_rpc, 'EXECUTE')
  ) then
    raise exception 'legacy Atlas bundle RPC remains executable by a runtime role';
  end if;

  cpri_bind_rpc := to_regprocedure(
    'public.bind_canonical_plan_runtime_source(uuid,uuid,text,uuid,uuid)'
  );
  if cpri_bind_rpc is not null and (
    has_function_privilege('anon', cpri_bind_rpc, 'EXECUTE')
    or has_function_privilege('authenticated', cpri_bind_rpc, 'EXECUTE')
    or has_function_privilege('service_role', cpri_bind_rpc, 'EXECUTE')
  ) then
    raise exception 'legacy CPRI bind mutator remains executable by a runtime role';
  end if;

  cpri_backfill_rpc := to_regprocedure('public.backfill_canonical_plan_runtime_bindings()');
  if cpri_backfill_rpc is not null and (
    has_function_privilege('anon', cpri_backfill_rpc, 'EXECUTE')
    or has_function_privilege('authenticated', cpri_backfill_rpc, 'EXECUTE')
    or has_function_privilege('service_role', cpri_backfill_rpc, 'EXECUTE')
  ) then
    raise exception 'legacy CPRI backfill mutator remains executable by a runtime role';
  end if;

  -- Regression for fresh Codex P2: direct ACL inspection misses privileges inherited
  -- through a parent role. Add both function and table mutation authority through a
  -- temporary parent role and require the effective containment snapshot to fail.
  if atlas_rpc is null then
    raise exception 'legacy Atlas RPC missing; inherited privilege regression cannot execute';
  end if;

  execute 'create role contain_01_inherited_probe nologin';
  execute 'grant execute on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to contain_01_inherited_probe';
  execute 'grant insert on table public.canonical_plan_runtime_bindings to contain_01_inherited_probe';
  execute 'grant contain_01_inherited_probe to authenticated';

  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  inherited_privilege_rejected := coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true;

  execute 'revoke contain_01_inherited_probe from authenticated';
  execute 'revoke execute on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from contain_01_inherited_probe';
  execute 'revoke insert on table public.canonical_plan_runtime_bindings from contain_01_inherited_probe';
  execute 'drop role contain_01_inherited_probe';

  select public.runtime_schema_contract_snapshot()
    into runtime_snapshot;
  if coalesce((runtime_snapshot->>'containmentOk')::boolean, false) is not true then
    raise exception 'CONTAIN-01 runtime snapshot did not recover after inherited privilege probe cleanup';
  end if;

  if not trigger_shape_rejected or not inherited_privilege_rejected then
    raise exception
      'CONTAIN-01 certification gap reproduced: trigger_shape_rejected=%, inherited_privilege_rejected=%',
      trigger_shape_rejected,
      inherited_privilege_rejected;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'timetable_slots'
      and column_name = 'activity_kind'
  ) then
    raise exception 'timetable_slots.activity_kind missing after migration replay';
  end if;

  select pg_get_functiondef('public.activate_timetable_version(uuid)'::regprocedure)
    into timetable_activation_definition;

  if timetable_activation_definition !~ 'presence_kind,[[:space:]]*activity_kind,'
     or timetable_activation_definition !~ 's[.]activity_kind' then
    raise exception
      'activate_timetable_version does not preserve activity_kind in activation clones';
  end if;

  if to_regclass('public.timetable_exceptions') is null then
    raise exception 'timetable_exceptions missing after migration replay';
  end if;

  if to_regprocedure('public.set_timetable_occurrence_activity_kind(uuid,date,text)') is null then
    raise exception 'single-occurrence activity kind RPC missing after migration replay';
  end if;

  select pg_get_functiondef('public.set_timetable_occurrence_activity_kind(uuid,date,text)'::regprocedure)
    into occurrence_activity_rpc_definition;

  if position('recorded lesson occurrence is immutable' in occurrence_activity_rpc_definition) = 0 then
    raise exception 'single-occurrence activity kind RPC does not protect recorded lessons';
  end if;

  if position('ACTIVITY_KIND_CHANGED' in occurrence_activity_rpc_definition) = 0 then
    raise exception 'single-occurrence activity kind RPC does not persist a bounded temporal exception';
  end if;

  if position('FOR UPDATE' in upper(occurrence_activity_rpc_definition)) = 0 then
    raise exception 'single-occurrence activity RPC does not lock the source timetable slot';
  end if;

  if position('SUSPENSION' in occurrence_activity_rpc_definition) = 0
     or position('HOLIDAY' in occurrence_activity_rpc_definition) = 0
     or position('CLOSURE' in occurrence_activity_rpc_definition) = 0 then
    raise exception 'single-occurrence activity RPC does not reject calendar-suppressed dates';
  end if;

  if to_regprocedure('private.guard_timetable_activity_exception()') is null then
    raise exception 'atomic timetable activity exception guard missing after migration replay';
  end if;

  if to_regprocedure('private.lock_teaching_session_timetable_slot()') is null then
    raise exception 'TeachingSession timetable slot lock missing after migration replay';
  end if;

  select pg_get_functiondef('private.guard_timetable_activity_exception()'::regprocedure)
    into occurrence_activity_guard_definition;
  select pg_get_functiondef('private.lock_teaching_session_timetable_slot()'::regprocedure)
    into teaching_session_lock_definition;

  if position('FOR UPDATE' in upper(occurrence_activity_guard_definition)) = 0
     or position('FOR UPDATE' in upper(teaching_session_lock_definition)) = 0 then
    raise exception 'single-occurrence activity and TeachingSession boundaries do not share a locking invariant';
  end if;

  if position('SUSPENSION' in occurrence_activity_guard_definition) = 0
     or position('HOLIDAY' in occurrence_activity_guard_definition) = 0
     or position('CLOSURE' in occurrence_activity_guard_definition) = 0 then
    raise exception 'single-occurrence activity guard does not reject calendar-suppressed dates';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.timetable_exceptions'::regclass
      and tgname = 'timetable_exceptions_atomic_guard'
      and not tgisinternal
      and (tgtype & 4) <> 0
      and (tgtype & 16) <> 0
      and (tgtype & 8) = 0
  ) then
    raise exception 'timetable exception atomic guard must cover INSERT/UPDATE without blocking DELETE cascades';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.teaching_sessions'::regclass
      and tgname = 'teaching_sessions_lock_timetable_slot'
      and not tgisinternal
  ) then
    raise exception 'TeachingSession timetable slot lock trigger missing';
  end if;

  select count(*)
    into issue_count
  from plpgsql_check_function_tb(
    'private.record_teaching_session(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb)'::regprocedure,
    fatal_errors := false
  ) c
  where c.level = 'error';

  if issue_count > 0 then
    raise exception 'plpgsql_check found % errors in private.record_teaching_session', issue_count;
  end if;

  select count(*)
    into issue_count
  from plpgsql_check_function_tb(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure,
    fatal_errors := false
  ) c
  where c.level = 'error';

  if issue_count > 0 then
    raise exception 'plpgsql_check found % errors in private.record_teaching_session_with_evidence', issue_count;
  end if;
end;
$contract$;

\ir document_template_lifecycle_behavior_contract.sql
\ir document_template_governance_residual_behavior_contract.sql
\ir authored_document_generalization_contract.sql

-- The deep replay already owns the ephemeral Supabase connection. Export that
-- local connection to the child process so the concurrency contract can open
-- genuinely independent PostgreSQL sessions against the exact same database.
\set concurrency_db_url 'postgresql://' :USER ':postgres@' :HOST ':' :PORT '/' :DBNAME
\setenv DATABASE_URL :concurrency_db_url
\! bash "$GITHUB_WORKSPACE/product/supabase/tests/run_document_template_activation_concurrency_contract.sh"
