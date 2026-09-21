begin;

do $preflight$
begin
  if to_regprocedure(
    'public.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'
  ) is null then
    raise exception 'runtime schema contract requires TE-1A public write boundary';
  end if;

  if to_regclass('public.teaching_session_registration_receipts') is null
     or to_regclass('public.teaching_session_evidence_receipts') is null then
    raise exception 'runtime schema contract requires teaching-session receipt tables';
  end if;
end;
$preflight$;

create table if not exists public.runtime_schema_contract_state (
  singleton boolean primary key default true check (singleton),
  contract_version integer not null check (contract_version >= 74),
  migration_id text not null check (migration_id ~ '^[0-9]{4}_[a-z0-9_]+$'),
  updated_at timestamptz not null default now()
);

alter table public.runtime_schema_contract_state enable row level security;

revoke all on table public.runtime_schema_contract_state from public, anon, authenticated;
grant select on table public.runtime_schema_contract_state to anon, authenticated;

drop policy if exists runtime_schema_contract_read on public.runtime_schema_contract_state;
create policy runtime_schema_contract_read
  on public.runtime_schema_contract_state
  for select
  to anon, authenticated
  using (singleton);

insert into public.runtime_schema_contract_state(singleton, contract_version, migration_id)
values (true, 74, '0074_runtime_schema_contract')
on conflict (singleton) do update
set contract_version = excluded.contract_version,
    migration_id = excluded.migration_id,
    updated_at = now();

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
begin
  if target_migration_id is null
     or target_migration_id !~ '^[0-9]{4}_[a-z0-9_]+$' then
    raise exception 'invalid runtime schema migration id';
  end if;

  target_version := substring(target_migration_id from '^([0-9]{4})_')::integer;

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

  update public.runtime_schema_contract_state
  set contract_version = target_version,
      migration_id = target_migration_id,
      updated_at = now()
  where singleton;
end;
$function$;

revoke all on function private.advance_runtime_schema_contract(text) from public, anon, authenticated;

comment on table public.runtime_schema_contract_state is
  'Non-sensitive runtime watermark used to prevent application/database version drift. Read-only for client roles.';

comment on function private.advance_runtime_schema_contract(text) is
  'Migration-only helper. Every migration after 0074 must advance the runtime schema watermark exactly once.';

commit;
