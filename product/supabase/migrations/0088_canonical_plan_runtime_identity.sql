begin;

create table public.canonical_plan_runtime_bindings (
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

create index canonical_plan_runtime_bindings_asset_idx
  on public.canonical_plan_runtime_bindings(asset_id);

create index canonical_plan_runtime_bindings_generation_idx
  on public.canonical_plan_runtime_bindings(generation_id);

create or replace function private.enforce_canonical_plan_runtime_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  academic_workspace_id uuid;
  asset_workspace_id uuid;
  asset_academic_year_id uuid;
  generation_asset_id uuid;
  generation_workspace_id uuid;
  generation_status text;
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
    into academic_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;

  if academic_workspace_id is null or academic_workspace_id <> new.workspace_id then
    raise exception 'canonical plan academic year must belong to the binding workspace';
  end if;

  select ka.workspace_id, ka.academic_year_id
    into asset_workspace_id, asset_academic_year_id
  from public.knowledge_assets ka
  where ka.id = new.asset_id;

  if asset_workspace_id is null
    or asset_workspace_id <> new.workspace_id
    or asset_academic_year_id is distinct from new.academic_year_id then
    raise exception 'canonical plan asset must belong to the binding workspace and academic year';
  end if;

  select kpg.asset_id, kpg.workspace_id, kpg.status
    into generation_asset_id, generation_workspace_id, generation_status
  from public.knowledge_processing_generations kpg
  where kpg.id = new.generation_id;

  if generation_asset_id is null
    or generation_asset_id <> new.asset_id
    or generation_workspace_id <> new.workspace_id then
    raise exception 'canonical plan generation must belong to the bound asset and workspace';
  end if;

  if generation_status <> 'SUCCEEDED' then
    raise exception 'canonical plan generation must be SUCCEEDED before binding';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_canonical_plan_runtime_binding() from public;

create trigger canonical_plan_runtime_bindings_enforce
before insert or update on public.canonical_plan_runtime_bindings
for each row execute function private.enforce_canonical_plan_runtime_binding();

alter table public.canonical_plan_runtime_bindings enable row level security;

create policy canonical_plan_runtime_bindings_select_member
on public.canonical_plan_runtime_bindings
for select
to authenticated
using (private.is_workspace_member(workspace_id));

revoke all on table public.canonical_plan_runtime_bindings from anon, authenticated;
grant select on table public.canonical_plan_runtime_bindings to authenticated;
grant all on table public.canonical_plan_runtime_bindings to service_role;

create or replace function public.bind_canonical_plan_runtime_source(
  p_workspace_id uuid,
  p_academic_year_id uuid,
  p_canonical_plan_code text,
  p_asset_id uuid,
  p_generation_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  binding_id uuid;
begin
  insert into public.canonical_plan_runtime_bindings(
    workspace_id,
    academic_year_id,
    canonical_plan_code,
    asset_id,
    generation_id
  ) values (
    p_workspace_id,
    p_academic_year_id,
    upper(btrim(p_canonical_plan_code)),
    p_asset_id,
    p_generation_id
  )
  on conflict (workspace_id, academic_year_id, canonical_plan_code)
  do update set
    asset_id = excluded.asset_id,
    generation_id = excluded.generation_id,
    updated_at = now()
  returning id into binding_id;

  return binding_id;
end;
$$;

revoke all on function public.bind_canonical_plan_runtime_source(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.bind_canonical_plan_runtime_source(uuid, uuid, text, uuid, uuid) to service_role;

commit;
