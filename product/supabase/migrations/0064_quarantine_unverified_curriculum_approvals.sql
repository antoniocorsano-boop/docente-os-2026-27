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
where authority_quarantined_at is null
  and (
    curriculum_state = 'APPROVED'
    or alignment_authority = 'APPROVED_INSTITUTIONAL'
    or transition_remodulation_state = 'APPROVED'
    or curricular_context->>'curriculumState' = 'APPROVED'
    or curricular_context ? 'approvalDecisionRef'
    or coalesce(curricular_context #>> '{transitionRemodulation,state}', '') = 'APPROVED'
    or coalesce(curricular_context #>> '{transitionRemodulation,institutionallyApproved}', 'false') = 'true'
    or (curricular_context #>> '{transitionRemodulation,approvalDecisionRef}') is not null
    or curriculum_coverage->>'authority' = 'APPROVED_INSTITUTIONAL'
    or coalesce(curriculum_coverage->>'requiresRevalidationOnApproval', 'true') = 'false'
  );

alter table public.annual_plan_curriculum_adoptions
  drop constraint if exists annual_plan_curriculum_adoptions_quarantine_ck;

alter table public.annual_plan_curriculum_adoptions
  add constraint annual_plan_curriculum_adoptions_quarantine_ck check (
    (authority_quarantined_at is null and authority_quarantine_reason is null)
    or
    (authority_quarantined_at is not null and authority_quarantine_reason is not null)
  );

create or replace function private.enforce_annual_plan_curriculum_adoption_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace_id uuid;
  section_academic_year_id uuid;
  year_label text;
begin
  select s.workspace_id, s.academic_year_id
    into section_workspace_id, section_academic_year_id
  from public.annual_plan_sections s
  where s.id = new.section_id;

  if section_workspace_id is null then
    raise exception 'annual plan curriculum adoption references missing section';
  end if;

  select ay.label
    into year_label
  from public.academic_years ay
  where ay.id = section_academic_year_id
    and ay.workspace_id = section_workspace_id;

  if year_label is null then
    raise exception 'annual plan curriculum adoption references missing academic year';
  end if;

  if replace(year_label, '/', '-') <> replace(new.school_year_ref, '/', '-') then
    raise exception 'annual plan curriculum adoption school year does not match section';
  end if;

  if new.curriculum_state = 'PROVISIONAL_COMPLETE'
    and exists (
      select 1
      from public.annual_plan_curriculum_adoptions existing
      where existing.section_id = new.section_id
        and existing.discipline_ref = new.discipline_ref
        and existing.school_year_ref = new.school_year_ref
        and existing.alignment_authority = 'APPROVED_INSTITUTIONAL'
        and existing.authority_quarantined_at is null
    ) then
    raise exception 'approved curriculum baseline cannot be downgraded to provisional';
  end if;

  new.applied_by := coalesce(auth.uid(), new.applied_by);
  new.applied_at := coalesce(new.applied_at, now());
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

drop policy if exists annual_plan_curriculum_adoptions_insert_member
  on public.annual_plan_curriculum_adoptions;

revoke insert on public.annual_plan_curriculum_adoptions from authenticated;

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
begin
  raise exception 'client-facing curriculum persistence is disabled; use the governed server-only ECO-02 boundary';
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

revoke all on function public.persist_annual_plan_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.persist_annual_plan_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
) to service_role;

comment on column public.annual_plan_curriculum_adoptions.authority_quarantined_at is
  'Set for pre-verifiable-channel APPROVED rows so they remain audit evidence but cannot act as current institutional authority.';

comment on column public.annual_plan_curriculum_adoptions.authority_quarantine_reason is
  'Reason an APPROVED adoption receipt is excluded from current authority reads.';

comment on function public.persist_annual_plan_curriculum_adoption is
  'Legacy client-facing boundary disabled. ECO-02 writes now pass through a server-only repository that enforces the exact configured pilot identity and provisional-only authority.';

comment on function public.annual_plan_curriculum_current is
  'Returns the latest non-quarantined curriculum/framework adoption receipt for one annual-plan section and discipline.';
