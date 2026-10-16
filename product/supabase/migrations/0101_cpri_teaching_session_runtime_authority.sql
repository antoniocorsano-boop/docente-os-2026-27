begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (101, '0101_cpri_teaching_session_runtime_authority')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- CPRI-01 Task 4: TeachingSession runtime authority is the governed canonical
-- plan binding, not knowledge_assets.current_generation_id. Reprocessing may
-- advance the Knowledge current pointer without moving CPRI.
create or replace function private.enforce_teaching_session_allocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_minutes integer;
  session_workspace uuid;
  session_year uuid;
  asset_workspace uuid;
  asset_year uuid;
  generation_asset uuid;
  generation_workspace uuid;
  generation_status text;
  governed_binding_present boolean;
  other_minutes integer;
begin
  select actual_minutes, workspace_id, academic_year_id
    into session_minutes, session_workspace, session_year
  from public.teaching_sessions
  where id = new.session_id
  for update;

  if session_minutes is null then
    raise exception 'teaching session not found';
  end if;

  select workspace_id, academic_year_id
    into asset_workspace, asset_year
  from public.knowledge_assets
  where id = new.canonical_plan_asset_id;

  select asset_id, workspace_id, status
    into generation_asset, generation_workspace, generation_status
  from public.knowledge_processing_generations
  where id = new.canonical_generation_id;

  select exists (
    select 1
    from public.canonical_plan_runtime_bindings binding
    where binding.workspace_id = session_workspace
      and binding.academic_year_id = session_year
      and binding.asset_id = new.canonical_plan_asset_id
      and binding.generation_id = new.canonical_generation_id
  )
  into governed_binding_present;

  if asset_workspace is null
    or asset_workspace <> session_workspace
    or asset_year is distinct from session_year
    or generation_asset <> new.canonical_plan_asset_id
    or generation_workspace <> session_workspace
    or generation_status <> 'SUCCEEDED'
    or not governed_binding_present then
    raise exception 'allocation canonical source is not the governed successful CPRI generation for this session context';
  end if;

  select coalesce(sum(minutes), 0) into other_minutes
  from public.teaching_session_allocations
  where session_id = new.session_id
    and (tg_op <> 'UPDATE' or id <> new.id);

  if other_minutes + new.minutes > session_minutes then
    raise exception 'allocated minutes exceed actual teaching session minutes';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_teaching_session_allocation()
  from public, anon, authenticated, service_role;

comment on function private.enforce_teaching_session_allocation() is
  'CPRI-01 TeachingSession allocation guard: accepts only a SUCCEEDED generation bound by governed CPRI in the same workspace/academic-year context; Knowledge current_generation_id is not runtime authority.';

select private.advance_runtime_schema_contract(
  '0101_cpri_teaching_session_runtime_authority'
);

commit;
