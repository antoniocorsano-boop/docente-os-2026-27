create extension if not exists plpgsql_check;

do $contract$
declare
  issue_count integer;
  runtime_migration text;
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
