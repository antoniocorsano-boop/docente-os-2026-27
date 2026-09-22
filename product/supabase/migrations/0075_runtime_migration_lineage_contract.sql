begin;

create table if not exists private.runtime_schema_required_migrations (
  version integer primary key check (version >= 60),
  migration_id text not null unique check (migration_id ~ '^[0-9]{4}_[a-z0-9_]+$')
);

revoke all on table private.runtime_schema_required_migrations from public, anon, authenticated;

insert into private.runtime_schema_required_migrations(version, migration_id)
values
  (60, '0060_teaching_session_timetable_fallback'),
  (61, '0061_lesson_design_governed_lifecycle'),
  (62, '0062_teaching_adjustment_extension_kind'),
  (63, '0063_lesson_preparation_approvals'),
  (64, '0064_quarantine_unverified_curriculum_approvals'),
  (65, '0065_eco02_provisional_curriculum_intake_rpc'),
  (66, '0066_eco02_lesson_preparation_approval_rpc'),
  (67, '0067_dos_cal_01_knowledge_calendar_source'),
  (68, '0068_dos_cal_01_link_integrity'),
  (69, '0069_lesson_design_tool_reproposal_after_dismissal'),
  (70, '0070_teaching_evidence_registration_key_disambiguation'),
  (71, '0071_teaching_evidence_receipt_column_disambiguation'),
  (72, '0072_teaching_evidence_receipt_values_disambiguation'),
  (73, '0073_teaching_evidence_receipt_values_regex_fix'),
  (74, '0074_runtime_schema_contract'),
  (75, '0075_runtime_migration_lineage_contract')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function private.runtime_schema_missing_migrations(through_version integer)
returns text[]
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    array_agg(required.migration_id order by required.version),
    array[]::text[]
  )
  from private.runtime_schema_required_migrations required
  where required.version <= through_version
    and not exists (
      select 1
      from supabase_migrations.schema_migrations history
      where regexp_replace(history.name, '^[0-9]{4}_', '') =
            regexp_replace(required.migration_id, '^[0-9]{4}_', '')
    );
$function$;

revoke all on function private.runtime_schema_missing_migrations(integer) from public, anon, authenticated;

create or replace function private.advance_runtime_schema_contract(target_migration_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_migration_id text;
  current_version integer;
  target_version integer;
  registered_target text;
  missing_prior text[];
begin
  if target_migration_id is null
     or target_migration_id !~ '^[0-9]{4}_[a-z0-9_]+$' then
    raise exception 'invalid runtime schema migration id';
  end if;

  target_version := substring(target_migration_id from '^([0-9]{4})_')::integer;

  select required.migration_id
    into registered_target
  from private.runtime_schema_required_migrations required
  where required.version = target_version;

  if registered_target is null or registered_target <> target_migration_id then
    raise exception
      'runtime schema migration % is not registered in the required lineage',
      target_migration_id;
  end if;

  select s.migration_id, s.contract_version
    into current_migration_id, current_version
  from public.runtime_schema_contract_state s
  where s.singleton
  for update;

  if current_migration_id is null then
    raise exception 'runtime schema contract state is missing';
  end if;

  if target_version <> current_version + 1 then
    raise exception
      'runtime schema contract must advance exactly one version: current %, target %',
      current_version,
      target_version;
  end if;

  missing_prior := private.runtime_schema_missing_migrations(target_version - 1);
  if cardinality(missing_prior) > 0 then
    raise exception
      'runtime schema lineage is incomplete before %: missing %',
      target_migration_id,
      array_to_string(missing_prior, ', ');
  end if;

  update public.runtime_schema_contract_state
  set contract_version = target_version,
      migration_id = target_migration_id,
      updated_at = now()
  where singleton;
end;
$function$;

revoke all on function private.advance_runtime_schema_contract(text) from public, anon, authenticated;

create or replace function public.runtime_schema_contract_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  current_version integer;
  current_migration_id text;
  current_updated_at timestamptz;
  missing_migrations text[];
begin
  select s.contract_version, s.migration_id, s.updated_at
    into current_version, current_migration_id, current_updated_at
  from public.runtime_schema_contract_state s
  where s.singleton;

  if current_migration_id is null then
    raise exception 'runtime schema contract state is missing';
  end if;

  missing_migrations := private.runtime_schema_missing_migrations(current_version);

  return jsonb_build_object(
    'schema', 'docente-os.runtime-schema-contract.v2',
    'contractVersion', current_version,
    'migrationId', current_migration_id,
    'updatedAt', current_updated_at,
    'lineageStartVersion', 60,
    'lineageOk', cardinality(missing_migrations) = 0,
    'missingMigrations', to_jsonb(missing_migrations)
  );
end;
$function$;

revoke all on function public.runtime_schema_contract_snapshot() from public;
grant execute on function public.runtime_schema_contract_snapshot() to anon, authenticated;

comment on table private.runtime_schema_required_migrations is
  'Canonical runtime lineage from migration 0060 onward. Future runtime migrations must register themselves before advancing the schema contract.';

comment on function private.runtime_schema_missing_migrations(integer) is
  'Returns required canonical runtime migrations absent from Supabase migration history after normalizing optional four-digit filename prefixes.';

comment on function public.runtime_schema_contract_snapshot() is
  'Non-sensitive runtime schema snapshot exposing watermark and migration-lineage health for startup and health probes.';

select private.advance_runtime_schema_contract('0075_runtime_migration_lineage_contract');

commit;
