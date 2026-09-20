alter table public.annual_plan_curriculum_adoptions
  add column if not exists authority_quarantined_at timestamptz null,
  add column if not exists authority_quarantine_reason text null;

update public.annual_plan_curriculum_adoptions
set
  authority_quarantined_at = coalesce(authority_quarantined_at, now()),
  authority_quarantine_reason = coalesce(
    authority_quarantine_reason,
    'PRE_VERIFIABLE_ARENA_AUTHORITY_CHANNEL'
  )
where curriculum_state = 'APPROVED'
  and authority_quarantined_at is null;

alter table public.annual_plan_curriculum_adoptions
  drop constraint if exists annual_plan_curriculum_adoptions_quarantine_ck;

alter table public.annual_plan_curriculum_adoptions
  add constraint annual_plan_curriculum_adoptions_quarantine_ck check (
    (authority_quarantined_at is null and authority_quarantine_reason is null)
    or
    (authority_quarantined_at is not null
      and authority_quarantine_reason is not null
      and curriculum_state = 'APPROVED')
  );

drop policy if exists annual_plan_curriculum_adoptions_insert_member
  on public.annual_plan_curriculum_adoptions;

create policy annual_plan_curriculum_adoptions_insert_member
  on public.annual_plan_curriculum_adoptions
  for insert
  to authenticated
  with check (
    applied_by = (select auth.uid())
    and exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
    and curriculum_state = 'PROVISIONAL_COMPLETE'
    and alignment_authority = 'PROVISIONAL_BASELINE'
    and requires_revalidation_on_approval = true
    and transition_remodulation_state <> 'APPROVED'
    and authority_quarantined_at is null
    and authority_quarantine_reason is null
    and curricular_context->>'curriculumState' = 'PROVISIONAL_COMPLETE'
    and not (curricular_context ? 'approvalDecisionRef')
    and coalesce(curricular_context #>> '{transitionRemodulation,state}', '') <> 'APPROVED'
    and coalesce(curricular_context #>> '{transitionRemodulation,institutionallyApproved}', 'false') <> 'true'
    and (curricular_context #>> '{transitionRemodulation,approvalDecisionRef}') is null
  );

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

  if target_curriculum_state <> 'PROVISIONAL_COMPLETE'
    or target_alignment_authority <> 'PROVISIONAL_BASELINE'
    or target_requires_revalidation_on_approval <> true
    or target_transition_remodulation_state = 'APPROVED'
    or target_curricular_context->>'curriculumState' <> 'PROVISIONAL_COMPLETE'
    or target_curricular_context ? 'approvalDecisionRef'
    or coalesce(target_curricular_context #>> '{transitionRemodulation,state}', '') = 'APPROVED'
    or coalesce(target_curricular_context #>> '{transitionRemodulation,institutionallyApproved}', 'false') = 'true'
    or (target_curricular_context #>> '{transitionRemodulation,approvalDecisionRef}') is not null then
    raise exception 'local curriculum intake cannot establish institutional approval authority';
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
    and a.source_handoff_footprint_hash = target_source_handoff_footprint_hash
    and a.authority_quarantined_at is null;

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
    and a.authority_quarantined_at is null
  order by a.accepted_at desc, a.applied_at desc
  limit 1
$$;

comment on column public.annual_plan_curriculum_adoptions.authority_quarantined_at is
  'Set for pre-verifiable-channel APPROVED rows so they remain audit evidence but cannot act as current institutional authority.';

comment on column public.annual_plan_curriculum_adoptions.authority_quarantine_reason is
  'Reason an APPROVED adoption receipt is excluded from current authority reads.';

comment on function public.persist_annual_plan_curriculum_adoption is
  'Authenticated local intake boundary. Until a separately governed server-verifiable Arena channel exists, this boundary accepts provisional curriculum only.';

comment on function public.annual_plan_curriculum_current is
  'Returns the latest non-quarantined curriculum/framework adoption receipt for one annual-plan section and discipline.';
