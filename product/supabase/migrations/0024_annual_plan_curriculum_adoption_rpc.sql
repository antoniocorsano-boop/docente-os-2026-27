create or replace function public.persist_annual_plan_curriculum_adoption(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_curricular_context_id text,
  target_school_year_ref text,
  target_discipline_ref text,
  target_grade_ref text,
  target_section_ref text,
  target_cohort_ref text,
  target_curriculum_version_ref jsonb,
  target_curriculum_state text,
  target_alignment_authority text,
  target_requires_revalidation_on_approval boolean,
  target_applicability_status text,
  target_transition_remodulation_state text,
  target_source_handoff_footprint_hash text,
  target_source_framework_message_id text,
  target_acceptance_decision_id text,
  target_accepted_at timestamptz,
  target_reviewed_framework jsonb,
  target_curriculum_coverage jsonb,
  target_curricular_context jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  receipt jsonb;
begin
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  if not exists (
    select 1
    from public.annual_plan_sections s
    where s.id = target_section_id
      and s.workspace_id = target_workspace_id
      and s.academic_year_id = target_academic_year_id
  ) then
    raise exception 'annual plan section is outside the active workspace/year';
  end if;

  insert into public.annual_plan_curriculum_adoptions (
    section_id,
    curricular_context_id,
    school_year_ref,
    discipline_ref,
    grade_ref,
    section_ref,
    cohort_ref,
    curriculum_version_ref,
    curriculum_state,
    alignment_authority,
    requires_revalidation_on_approval,
    applicability_status,
    transition_remodulation_state,
    source_handoff_footprint_hash,
    source_framework_message_id,
    acceptance_decision_id,
    accepted_at,
    reviewed_framework,
    curriculum_coverage,
    curricular_context,
    applied_by
  ) values (
    target_section_id,
    target_curricular_context_id,
    target_school_year_ref,
    target_discipline_ref,
    target_grade_ref,
    target_section_ref,
    target_cohort_ref,
    target_curriculum_version_ref,
    target_curriculum_state,
    target_alignment_authority,
    target_requires_revalidation_on_approval,
    target_applicability_status,
    target_transition_remodulation_state,
    target_source_handoff_footprint_hash,
    target_source_framework_message_id,
    target_acceptance_decision_id,
    target_accepted_at,
    target_reviewed_framework,
    target_curriculum_coverage,
    target_curricular_context,
    actor_id
  )
  on conflict (section_id, discipline_ref, source_handoff_footprint_hash) do nothing;

  select to_jsonb(a)
    into receipt
  from public.annual_plan_curriculum_adoptions a
  where a.section_id = target_section_id
    and a.discipline_ref = target_discipline_ref
    and a.source_handoff_footprint_hash = target_source_handoff_footprint_hash;

  if receipt is null then
    raise exception 'annual plan curriculum adoption receipt was not persisted';
  end if;

  if receipt->>'curricular_context_id' <> target_curricular_context_id
    or receipt->>'acceptance_decision_id' <> target_acceptance_decision_id
    or receipt->>'source_framework_message_id' <> target_source_framework_message_id then
    raise exception 'idempotency conflict for curriculum adoption fingerprint';
  end if;

  return receipt;
end;
$$;

create or replace function public.annual_plan_curriculum_current(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_discipline_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select to_jsonb(a)
  from public.annual_plan_curriculum_adoptions a
  join public.annual_plan_sections s on s.id = a.section_id
  where s.id = target_section_id
    and s.workspace_id = target_workspace_id
    and s.academic_year_id = target_academic_year_id
    and private.is_workspace_member(s.workspace_id)
    and a.discipline_ref = target_discipline_ref
  order by a.accepted_at desc, a.applied_at desc
  limit 1
$$;

revoke all on function public.persist_annual_plan_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.persist_annual_plan_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
) to authenticated;

revoke all on function public.annual_plan_curriculum_current(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.annual_plan_curriculum_current(uuid, uuid, uuid, text) to authenticated;

comment on function public.persist_annual_plan_curriculum_adoption is
  'Atomic idempotent write boundary for teacher-accepted, curriculum-satisfied CML handoff v2 annual-plan framework adoption.';
comment on function public.annual_plan_curriculum_current is
  'Returns the latest persisted curriculum/framework adoption receipt for one annual-plan section and discipline.';
