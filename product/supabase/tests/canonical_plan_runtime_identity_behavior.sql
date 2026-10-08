begin;

do $cpri_behavior$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  workspace_a uuid := gen_random_uuid();
  workspace_b uuid := gen_random_uuid();
  year_a uuid := gen_random_uuid();
  year_b uuid := gen_random_uuid();
  asset_a uuid := gen_random_uuid();
  asset_a2 uuid := gen_random_uuid();
  asset_b uuid := gen_random_uuid();
  generation_a uuid := gen_random_uuid();
  generation_a_running uuid := gen_random_uuid();
  generation_a2 uuid := gen_random_uuid();
  generation_b uuid := gen_random_uuid();
  generation_wrong_workspace uuid := gen_random_uuid();
  binding_id uuid;
  rejected boolean;
begin
  insert into auth.users(id, email)
  values
    (user_a, 'cpri-' || user_a::text || '@example.invalid'),
    (user_b, 'cpri-' || user_b::text || '@example.invalid');

  insert into public.workspaces(id, kind, name, owner_user_id)
  values
    (workspace_a, 'PERSONAL', 'CPRI behavior workspace A', user_a),
    (workspace_b, 'PERSONAL', 'CPRI behavior workspace B', user_b);

  insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
  values
    (year_a, workspace_a, 'CPRI-A', date '2026-09-01', date '2027-08-31', true),
    (year_b, workspace_b, 'CPRI-B', date '2026-09-01', date '2027-08-31', true);

  insert into public.knowledge_assets(
    id, workspace_id, academic_year_id, asset_kind, source_provider,
    original_name, processing_status, source_metadata, created_by
  ) values
    (asset_a, workspace_a, year_a, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN A', 'INDEXED', '{}'::jsonb, user_a),
    (asset_a2, workspace_a, year_a, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN A2', 'INDEXED', '{}'::jsonb, user_a),
    (asset_b, workspace_b, year_b, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN B', 'INDEXED', '{}'::jsonb, user_b);

  insert into public.knowledge_processing_generations(
    id, asset_id, workspace_id, generation_no, status, processor_label, finished_at
  ) values
    (generation_a, asset_a, workspace_a, 1, 'SUCCEEDED', 'cpri-test', now()),
    (generation_a_running, asset_a, workspace_a, 2, 'RUNNING', 'cpri-test', null),
    (generation_a2, asset_a2, workspace_a, 1, 'SUCCEEDED', 'cpri-test', now()),
    (generation_b, asset_b, workspace_b, 1, 'SUCCEEDED', 'cpri-test', now()),
    (generation_wrong_workspace, asset_a, workspace_b, 3, 'SUCCEEDED', 'cpri-test', now());

  insert into public.canonical_plan_runtime_bindings(
    workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
  ) values (
    workspace_a, year_a, 'CAN-PLAN-1', asset_a, generation_a
  ) returning id into binding_id;

  if binding_id is null then
    raise exception 'CPRI behavior: valid binding was not created';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_a, 'CAN-PLAN-1', asset_a2, generation_a2
    );
  exception
    when unique_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'CPRI behavior: duplicate workspace/year/code binding was accepted';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_a, 'CAN-PLAN-2', asset_b, generation_b
    );
  exception
    when others then
      if sqlerrm = 'canonical plan asset must belong to the binding workspace and academic year' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: cross-workspace asset binding was accepted';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_b, 'CAN-PLAN-2', asset_a, generation_a
    );
  exception
    when others then
      if sqlerrm = 'canonical plan academic year must belong to the binding workspace' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: cross-workspace academic year binding was accepted';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_a, 'CAN-PLAN-2', asset_a, generation_a2
    );
  exception
    when others then
      if sqlerrm = 'canonical plan generation must belong to the bound asset and workspace' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: generation from another asset was accepted';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_a, 'CAN-PLAN-2', asset_a, generation_wrong_workspace
    );
  exception
    when others then
      if sqlerrm = 'canonical plan generation must belong to the bound asset and workspace' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: generation from another workspace was accepted';
  end if;

  rejected := false;
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (
      workspace_a, year_a, 'CAN-PLAN-2', asset_a, generation_a_running
    );
  exception
    when others then
      if sqlerrm = 'canonical plan generation must be SUCCEEDED before binding' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: non-SUCCEEDED generation was accepted';
  end if;

  rejected := false;
  begin
    update public.canonical_plan_runtime_bindings
    set canonical_plan_code = 'CAN-PLAN-2'
    where id = binding_id;
  exception
    when others then
      if sqlerrm = 'canonical plan binding identity is immutable' then
        rejected := true;
      else
        raise;
      end if;
  end;
  if not rejected then
    raise exception 'CPRI behavior: binding identity mutation was accepted';
  end if;

  binding_id := public.bind_canonical_plan_runtime_source(
    workspace_a, year_a, 'CAN-PLAN-3', asset_a, generation_a
  );
  if binding_id is null then
    raise exception 'CPRI behavior: governed provisioning RPC did not create a valid binding';
  end if;

  binding_id := public.bind_canonical_plan_runtime_source(
    workspace_a, year_a, 'CAN-PLAN-3', asset_a2, generation_a2
  );
  if not exists (
    select 1
    from public.canonical_plan_runtime_bindings b
    where b.id = binding_id
      and b.workspace_id = workspace_a
      and b.academic_year_id = year_a
      and b.canonical_plan_code = 'CAN-PLAN-3'
      and b.asset_id = asset_a2
      and b.generation_id = generation_a2
  ) then
    raise exception 'CPRI behavior: explicit governed rebinding did not update the active materialization';
  end if;
end;
$cpri_behavior$;

rollback;
