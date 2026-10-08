begin;

-- CPRI-01 behavioral contract. All fixtures are synthetic and rolled back.
do $cpri$
declare
  user_id constant uuid := '10000000-0000-4000-8000-000000000001';
  workspace_a constant uuid := '20000000-0000-4000-8000-000000000001';
  workspace_b constant uuid := '20000000-0000-4000-8000-000000000002';
  year_a constant uuid := '30000000-0000-4000-8000-000000000001';
  year_b constant uuid := '30000000-0000-4000-8000-000000000002';
  asset_a constant uuid := '40000000-0000-4000-8000-000000000001';
  asset_a_peer constant uuid := '40000000-0000-4000-8000-000000000002';
  asset_b constant uuid := '40000000-0000-4000-8000-000000000003';
  generation_a constant uuid := '50000000-0000-4000-8000-000000000001';
  generation_a_peer constant uuid := '50000000-0000-4000-8000-000000000002';
  generation_a_running constant uuid := '50000000-0000-4000-8000-000000000003';
  generation_b constant uuid := '50000000-0000-4000-8000-000000000004';
begin
  insert into auth.users(id) values (user_id);

  insert into public.workspaces(id, kind, name, owner_user_id)
  values
    (workspace_a, 'PERSONAL', 'CPRI fixture A', user_id),
    (workspace_b, 'PERSONAL', 'CPRI fixture B', user_id);

  insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
  values
    (year_a, workspace_a, 'CPRI-2026-A', '2026-09-01', '2027-08-31', true),
    (year_b, workspace_b, 'CPRI-2026-B', '2026-09-01', '2027-08-31', true);

  insert into public.knowledge_assets(
    id, workspace_id, academic_year_id, asset_kind, source_provider,
    original_name, processing_status, source_metadata, created_by
  ) values
    (asset_a, workspace_a, year_a, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN A', 'INDEXED', '{}'::jsonb, user_id),
    (asset_a_peer, workspace_a, year_a, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN A peer', 'INDEXED', '{}'::jsonb, user_id),
    (asset_b, workspace_b, year_b, 'GENERATED', 'SYSTEM', 'CPRI CAN-PLAN B', 'INDEXED', '{}'::jsonb, user_id);

  insert into public.knowledge_processing_generations(
    id, asset_id, workspace_id, generation_no, status, processor_label, finished_at
  ) values
    (generation_a, asset_a, workspace_a, 1, 'SUCCEEDED', 'cpri-test', now()),
    (generation_a_peer, asset_a_peer, workspace_a, 1, 'SUCCEEDED', 'cpri-test', now()),
    (generation_a_running, asset_a, workspace_a, 2, 'RUNNING', 'cpri-test', null),
    (generation_b, asset_b, workspace_b, 1, 'SUCCEEDED', 'cpri-test', now());

  -- Valid local materialization is accepted.
  insert into public.canonical_plan_runtime_bindings(
    workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
  ) values (workspace_a, year_a, 'CAN-PLAN-1', asset_a, generation_a);

  if not exists (
    select 1 from public.canonical_plan_runtime_bindings
    where workspace_id = workspace_a
      and academic_year_id = year_a
      and canonical_plan_code = 'CAN-PLAN-1'
      and asset_id = asset_a
      and generation_id = generation_a
  ) then
    raise exception 'CPRI_TEST: valid local binding was not persisted';
  end if;

  -- Exactly one binding per workspace/year/CAN-PLAN.
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (workspace_a, year_a, 'CAN-PLAN-1', asset_a, generation_a);
    raise exception 'CPRI_EXPECTED_FAILURE_NOT_RAISED: duplicate binding';
  exception
    when unique_violation then null;
  end;

  -- Academic year must belong to the same workspace.
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (workspace_a, year_b, 'CAN-PLAN-2', asset_a, generation_a);
    raise exception 'CPRI_EXPECTED_FAILURE_NOT_RAISED: cross-workspace academic year';
  exception
    when others then
      if sqlerrm like 'CPRI_EXPECTED_FAILURE_NOT_RAISED:%' then raise; end if;
      if position('academic year must belong to the binding workspace' in sqlerrm) = 0 then
        raise exception 'CPRI_TEST: unexpected academic-year failure: %', sqlerrm;
      end if;
  end;

  -- Asset from another workspace/year must be rejected.
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (workspace_a, year_a, 'CAN-PLAN-2', asset_b, generation_b);
    raise exception 'CPRI_EXPECTED_FAILURE_NOT_RAISED: cross-workspace asset';
  exception
    when others then
      if sqlerrm like 'CPRI_EXPECTED_FAILURE_NOT_RAISED:%' then raise; end if;
      if position('asset must belong to the binding workspace and academic year' in sqlerrm) = 0 then
        raise exception 'CPRI_TEST: unexpected asset failure: %', sqlerrm;
      end if;
  end;

  -- Generation must belong to the exact bound asset, not merely the workspace/year.
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (workspace_a, year_a, 'CAN-PLAN-2', asset_a, generation_a_peer);
    raise exception 'CPRI_EXPECTED_FAILURE_NOT_RAISED: generation-to-asset mismatch';
  exception
    when others then
      if sqlerrm like 'CPRI_EXPECTED_FAILURE_NOT_RAISED:%' then raise; end if;
      if position('generation must belong to the bound asset and workspace' in sqlerrm) = 0 then
        raise exception 'CPRI_TEST: unexpected generation/asset failure: %', sqlerrm;
      end if;
  end;

  -- Only completed Knowledge generations may become active bindings.
  begin
    insert into public.canonical_plan_runtime_bindings(
      workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id
    ) values (workspace_a, year_a, 'CAN-PLAN-3', asset_a, generation_a_running);
    raise exception 'CPRI_EXPECTED_FAILURE_NOT_RAISED: non-SUCCEEDED generation';
  exception
    when others then
      if sqlerrm like 'CPRI_EXPECTED_FAILURE_NOT_RAISED:%' then raise; end if;
      if position('generation must be SUCCEEDED before binding' in sqlerrm) = 0 then
        raise exception 'CPRI_TEST: unexpected generation-status failure: %', sqlerrm;
      end if;
  end;

  -- Missing bindings stay missing; no metadata or UUID fallback is materialized by DB behavior.
  if exists (
    select 1 from public.canonical_plan_runtime_bindings
    where workspace_id = workspace_b
      and academic_year_id = year_b
      and canonical_plan_code = 'CAN-PLAN-3'
  ) then
    raise exception 'CPRI_TEST: unexpected implicit binding materialization';
  end if;
end;
$cpri$;

rollback;
