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
  ) then
    raise exception 'timetable exception atomic guard trigger missing';
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
