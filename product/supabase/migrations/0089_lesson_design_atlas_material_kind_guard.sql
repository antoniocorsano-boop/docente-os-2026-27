begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (89, '0089_lesson_design_atlas_material_kind_guard')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function public.accept_atlas_material_bundle(
  p_workspace_id uuid,
  p_academic_year_id uuid,
  p_section_id uuid,
  p_canonical_plan_asset_id uuid,
  p_canonical_generation_id uuid,
  p_block_id text,
  p_projection_id text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  item jsonb;
  item_payload jsonb;
  dedupe_key text;
  target_extension_id uuid;
  target_status text;
  item_minutes integer;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'Atlas material bundle is outside caller workspace';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Atlas material bundle must contain at least one item';
  end if;

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Atlas material bundle item must be an object';
    end if;

    item_payload := coalesce(item -> 'payload', '{}'::jsonb);
    if jsonb_typeof(item_payload) <> 'object' then
      raise exception 'Atlas material bundle item payload must be an object';
    end if;

    dedupe_key := nullif(btrim(item_payload ->> 'dedupeKey'), '');
    if dedupe_key is null then
      raise exception 'Atlas material bundle item requires a dedupe key';
    end if;

    if nullif(btrim(item ->> 'kind'), '') is null
       or nullif(btrim(item ->> 'insertionPosition'), '') is null
       or nullif(btrim(item ->> 'title'), '') is null
       or nullif(btrim(item ->> 'body'), '') is null then
      raise exception 'Atlas material bundle item is incomplete';
    end if;

    if nullif(btrim(item ->> 'kind'), '') not in (
      'TEACHER_RESOURCE',
      'STUDENT_RESOURCE'
    ) then
      raise exception 'Atlas material bundle item kind must be a material resource';
    end if;

    if item ? 'minutes' and item -> 'minutes' <> 'null'::jsonb then
      item_minutes := (item ->> 'minutes')::integer;
    else
      item_minutes := null;
    end if;

    target_extension_id := null;
    target_status := null;

    insert into public.lesson_design_extensions (
      workspace_id,
      academic_year_id,
      section_id,
      canonical_plan_asset_id,
      canonical_generation_id,
      block_id,
      projection_id,
      kind,
      status,
      insertion_position,
      anchor_step_id,
      title,
      body,
      cue,
      minutes,
      source_kind,
      source_ref,
      source_label,
      payload,
      created_by
    ) values (
      p_workspace_id,
      p_academic_year_id,
      p_section_id,
      p_canonical_plan_asset_id,
      p_canonical_generation_id,
      p_block_id,
      p_projection_id,
      item ->> 'kind',
      'PROPOSED',
      item ->> 'insertionPosition',
      nullif(btrim(item ->> 'anchorStepId'), ''),
      item ->> 'title',
      item ->> 'body',
      nullif(btrim(item ->> 'cue'), ''),
      item_minutes,
      'ATLAS',
      nullif(btrim(item ->> 'sourceRef'), ''),
      nullif(btrim(item ->> 'sourceLabel'), ''),
      item_payload,
      caller_id
    )
    on conflict do nothing
    returning id, status into target_extension_id, target_status;

    if target_extension_id is null then
      select e.id, e.status
        into target_extension_id, target_status
      from public.lesson_design_extensions e
      where e.workspace_id = p_workspace_id
        and e.academic_year_id = p_academic_year_id
        and e.section_id = p_section_id
        and e.canonical_plan_asset_id = p_canonical_plan_asset_id
        and e.canonical_generation_id = p_canonical_generation_id
        and e.block_id = p_block_id
        and e.projection_id = p_projection_id
        and e.source_kind = 'ATLAS'
        and e.payload ->> 'dedupeKey' = dedupe_key
        and e.status <> 'DISMISSED'
      limit 1;
    end if;

    if target_extension_id is null then
      raise exception 'Atlas material bundle uniqueness conflict could not be resolved';
    end if;

    if target_status <> 'ACCEPTED' then
      perform public.accept_lesson_design_extension(target_extension_id);
    end if;
  end loop;
end;
$$;

revoke all on function public.accept_atlas_material_bundle(uuid, uuid, uuid, uuid, uuid, text, text, jsonb) from public;
revoke all on function public.accept_atlas_material_bundle(uuid, uuid, uuid, uuid, uuid, text, text, jsonb) from anon;
grant execute on function public.accept_atlas_material_bundle(uuid, uuid, uuid, uuid, uuid, text, text, jsonb) to authenticated;

comment on function public.accept_atlas_material_bundle(uuid, uuid, uuid, uuid, uuid, text, text, jsonb) is
  'Atomically persists and accepts one teacher-confirmed Studio Atlas MaterialBundle inside a single canonical lesson context. Only teacher/student resources are admitted; any item failure rolls back the whole bundle.';

select private.advance_runtime_schema_contract('0089_lesson_design_atlas_material_kind_guard');

commit;
