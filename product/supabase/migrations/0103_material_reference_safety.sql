-- 0103_material_reference_safety
-- MATERIAL-CORE-01 / Task 8
-- Preserve accepted typed material authority across Knowledge deletion and exact-generation acceptance.

begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (103, '0103_material_reference_safety')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function private.enforce_lesson_material_binding_reference_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ref_kind text;
  v_asset_id uuid;
  v_generation_id uuid;
begin
  if new.payload -> 'materialBinding' ->> 'schema' is distinct from 'docente-os.lesson-material-binding.v1' then
    return new;
  end if;

  -- INSERT validates a typed proposal before it enters the store. UPDATE revalidates
  -- the exact reference only when the lifecycle transition makes it authoritative.
  if tg_op = 'UPDATE' and new.status <> 'ACCEPTED' then
    return new;
  end if;

  v_ref_kind := new.payload -> 'materialBinding' -> 'materialRef' ->> 'kind';
  if v_ref_kind <> 'KNOWLEDGE_GENERATION' then
    return new;
  end if;

  begin
    v_asset_id := nullif(new.payload -> 'materialBinding' -> 'materialRef' ->> 'assetId', '')::uuid;
    v_generation_id := nullif(new.payload -> 'materialBinding' -> 'materialRef' ->> 'generationId', '')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'typed lesson material binding has invalid Knowledge reference identifiers';
  end;

  if v_asset_id is null or v_generation_id is null then
    raise exception 'typed lesson material binding requires assetId and generationId';
  end if;

  -- Lock the referenced Knowledge asset first. delete_own_knowledge_asset takes
  -- FOR UPDATE on the same row, serializing acceptance against destructive delete.
  perform 1
  from public.knowledge_assets a
  where a.id = v_asset_id
    and a.workspace_id = new.workspace_id
  for key share;

  if not found then
    raise exception 'typed lesson material binding references a missing Knowledge asset';
  end if;

  -- The accepted identity is the exact successful generation, never whatever
  -- current_generation_id may become later.
  perform 1
  from public.knowledge_processing_generations g
  where g.id = v_generation_id
    and g.asset_id = v_asset_id
    and g.workspace_id = new.workspace_id
    and g.status = 'SUCCEEDED'
  for key share;

  if not found then
    raise exception 'typed lesson material binding references a missing or unsuccessful Knowledge generation';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_design_material_binding_reference_guard
  on public.lesson_design_extensions;

create trigger lesson_design_material_binding_reference_guard
before insert or update on public.lesson_design_extensions
for each row
execute function private.enforce_lesson_material_binding_reference_integrity();

create or replace function public.delete_own_knowledge_asset(p_asset_id uuid)
returns table (
  deleted boolean,
  storage_bucket text,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_source_provider text;
  v_source_metadata jsonb;
begin
  if (select auth.uid()) is null then
    return query select false, null::text, null::text;
    return;
  end if;

  select a.workspace_id, a.source_provider, a.source_metadata
    into v_workspace_id, v_source_provider, v_source_metadata
  from public.knowledge_assets a
  where a.id = p_asset_id
    and a.created_by = (select auth.uid())
    and private.is_workspace_member(a.workspace_id)
  for update;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.lesson_design_extensions e
    where e.workspace_id = v_workspace_id
      and e.status = 'ACCEPTED'
      and e.dismissed_at is null
      and e.payload -> 'materialBinding' ->> 'schema' = 'docente-os.lesson-material-binding.v1'
      and e.payload -> 'materialBinding' -> 'materialRef' ->> 'assetId' = p_asset_id::text
  ) then
    raise exception 'accepted lesson material binding exists; detach or replace the material binding before deletion';
  end if;

  update public.knowledge_assets
  set current_generation_id = null
  where id = p_asset_id;

  delete from public.knowledge_documents
  where asset_id = p_asset_id;

  delete from public.knowledge_assets
  where id = p_asset_id;

  return query
  select
    true,
    case
      when v_source_provider = 'UPLOAD' then coalesce(v_source_metadata ->> 'storageBucket', 'knowledge-assets')
      else null
    end,
    case
      when v_source_provider = 'UPLOAD' then v_source_metadata ->> 'storagePath'
      else null
    end;
end;
$$;

create or replace function public.detach_and_delete_own_knowledge_asset(p_asset_id uuid)
returns table (
  deleted boolean,
  storage_bucket text,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_extension record;
begin
  if (select auth.uid()) is null then
    return query select false, null::text, null::text;
    return;
  end if;

  -- Hold the same asset lock used by ordinary deletion for the complete detach
  -- transaction. New typed acceptance must acquire FOR KEY SHARE and therefore
  -- cannot become authoritative between dismissal and deletion.
  select a.workspace_id
    into v_workspace_id
  from public.knowledge_assets a
  where a.id = p_asset_id
    and a.created_by = (select auth.uid())
    and private.is_workspace_member(a.workspace_id)
  for update;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  for v_extension in
    select e.id
    from public.lesson_design_extensions e
    where e.workspace_id = v_workspace_id
      and e.status = 'ACCEPTED'
      and e.dismissed_at is null
      and e.payload -> 'materialBinding' ->> 'schema' = 'docente-os.lesson-material-binding.v1'
      and e.payload -> 'materialBinding' -> 'materialRef' ->> 'assetId' = p_asset_id::text
    order by e.id
  loop
    perform public.dismiss_lesson_design_extension(v_extension.id);
  end loop;

  return query
  select d.deleted, d.storage_bucket, d.storage_path
  from public.delete_own_knowledge_asset(p_asset_id) d;
end;
$$;

revoke all on function public.delete_own_knowledge_asset(uuid) from public;
revoke all on function public.delete_own_knowledge_asset(uuid) from anon;
grant execute on function public.delete_own_knowledge_asset(uuid) to authenticated;

revoke all on function public.detach_and_delete_own_knowledge_asset(uuid) from public;
revoke all on function public.detach_and_delete_own_knowledge_asset(uuid) from anon;
grant execute on function public.detach_and_delete_own_knowledge_asset(uuid) to authenticated;

comment on function public.delete_own_knowledge_asset(uuid) is
  'Deletes an owned Knowledge asset only when no ACCEPTED docente-os.lesson-material-binding.v1 reference remains.';
comment on function public.detach_and_delete_own_knowledge_asset(uuid) is
  'Explicitly dismisses ACCEPTED typed lesson material bindings, preserving lifecycle history, then deletes the owned Knowledge asset atomically.';

select private.advance_runtime_schema_contract(
  '0103_material_reference_safety'
);

commit;
