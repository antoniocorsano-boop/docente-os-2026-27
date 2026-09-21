create table if not exists private.eco02_curriculum_intake_scopes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  discipline_ref text not null check (discipline_ref = 'technology'),
  allowed_handoff_footprint_hash text not null check (allowed_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  allowed_framework_message_id text not null check (char_length(trim(allowed_framework_message_id)) > 0),
  allowed_curricular_context jsonb not null check (jsonb_typeof(allowed_curricular_context) = 'object'),
  allowed_reviewed_framework jsonb not null check (jsonb_typeof(allowed_reviewed_framework) = 'object'),
  enabled boolean not null default true,
  configured_at timestamptz not null default now(),
  primary key (section_id, discipline_ref)
);

revoke all on private.eco02_curriculum_intake_scopes from public, anon, authenticated;

create or replace function public.persist_eco02_provisional_curriculum_adoption(
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
  target_reviewed_framework jsonb,
  target_curriculum_coverage jsonb,
  target_curricular_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  configured_scope private.eco02_curriculum_intake_scopes%rowtype;
  section_grade text;
  section_code text;
  year_label text;
  existing_row public.annual_plan_curriculum_adoptions%rowtype;
  requirement jsonb;
  normalized_section_ref text;
  expected_grade_ref text;
begin
  if actor_id is null then
    raise exception 'authenticated user required';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  select *
    into configured_scope
  from private.eco02_curriculum_intake_scopes s
  where s.workspace_id = target_workspace_id
    and s.academic_year_id = target_academic_year_id
    and s.section_id = target_section_id
    and s.discipline_ref = target_discipline_ref
    and s.enabled = true;

  if configured_scope.section_id is null then
    raise exception 'ECO-02 provisional curriculum intake scope is not enabled';
  end if;

  select s.grade, s.section_code, ay.label
    into section_grade, section_code, year_label
  from public.annual_plan_sections s
  join public.academic_years ay
    on ay.id = s.academic_year_id
   and ay.workspace_id = s.workspace_id
  where s.id = target_section_id
    and s.workspace_id = target_workspace_id
    and s.academic_year_id = target_academic_year_id;

  if section_grade is null then
    raise exception 'annual plan section is outside the configured workspace/year';
  end if;

  expected_grade_ref := case section_grade
    when 'PRIMA' then 'grade-1'
    when 'SECONDA' then 'grade-2'
    when 'TERZA' then 'grade-3'
    else null
  end;

  if expected_grade_ref is null or target_grade_ref <> expected_grade_ref then
    raise exception 'curricular grade does not match configured pilot section';
  end if;

  if replace(year_label, '/', '-') <> replace(target_school_year_ref, '/', '-') then
    raise exception 'curricular school year does not match configured pilot section';
  end if;

  if target_discipline_ref <> 'technology' then
    raise exception 'ECO-02 provisional intake accepts only the canonical Technology discipline key';
  end if;

  normalized_section_ref := regexp_replace(upper(coalesce(target_section_ref, '')), '[^A-Z0-9]', '', 'g');
  if normalized_section_ref not in (
    upper(section_code),
    case section_grade when 'PRIMA' then '1' when 'SECONDA' then '2' else '3' end || upper(section_code)
  ) then
    raise exception 'curricular section does not match configured pilot section';
  end if;

  if target_source_handoff_footprint_hash <> configured_scope.allowed_handoff_footprint_hash
    or target_source_framework_message_id <> configured_scope.allowed_framework_message_id
    or target_curricular_context <> configured_scope.allowed_curricular_context
    or target_reviewed_framework <> configured_scope.allowed_reviewed_framework then
    raise exception 'Arena handoff does not match the configured ECO-02 pilot payload';
  end if;

  if target_curricular_context_id <> target_curricular_context->>'contextId'
    or target_school_year_ref <> target_curricular_context->>'schoolYearRef'
    or target_grade_ref <> target_curricular_context->>'gradeRef'
    or lower(target_curricular_context->>'disciplineRef') not in ('tecnologia', 'technology')
    or target_curriculum_version_ref <> target_curricular_context->'curriculumVersionRef' then
    raise exception 'curriculum persistence fields do not match the Arena curricular context';
  end if;

  if target_curriculum_state <> 'PROVISIONAL_COMPLETE'
    or target_alignment_authority <> 'PROVISIONAL_BASELINE'
    or target_requires_revalidation_on_approval is not true
    or target_curricular_context->>'curriculumState' <> 'PROVISIONAL_COMPLETE'
    or target_curricular_context ? 'approvalDecisionRef'
    or coalesce((target_curricular_context->>'completeForPlanning')::boolean, false) is not true then
    raise exception 'local Arena intake cannot establish institutional curriculum authority';
  end if;

  if target_transition_remodulation_state = 'APPROVED'
    or coalesce(target_curricular_context #>> '{transitionRemodulation,state}', '') = 'APPROVED'
    or coalesce((target_curricular_context #>> '{transitionRemodulation,institutionallyApproved}')::boolean, false) is true
    or coalesce((target_curricular_context #>> '{transitionRemodulation,usableForPlanning}')::boolean, false) is not true
    or (target_curricular_context #>> '{transitionRemodulation,approvalDecisionRef}') is not null then
    raise exception 'local Arena intake cannot establish approved transition authority';
  end if;

  if jsonb_typeof(target_curriculum_coverage) <> 'object'
    or target_curriculum_coverage->>'status' <> 'SATISFIED'
    or target_curriculum_coverage->>'authority' <> 'PROVISIONAL_BASELINE'
    or coalesce((target_curriculum_coverage->>'requiresRevalidationOnApproval')::boolean, false) is not true
    or target_curriculum_coverage->>'contextId' <> target_curricular_context_id
    or target_curriculum_coverage->'curriculumVersionRef' <> target_curriculum_version_ref
    or jsonb_typeof(target_curriculum_coverage->'requirementCoverage') <> 'array'
    or jsonb_array_length(coalesce(target_curriculum_coverage->'blockingRequirementIds', '[]'::jsonb)) <> 0 then
    raise exception 'curriculum coverage is not a satisfied provisional baseline';
  end if;

  if jsonb_typeof(target_reviewed_framework->'periods') <> 'array'
    or jsonb_array_length(target_reviewed_framework->'periods') = 0
    or jsonb_typeof(target_reviewed_framework->'constraints') <> 'array' then
    raise exception 'reviewed annual framework is incomplete';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(target_curricular_context->'requirements') r
    where coalesce((r->>'coverageRequired')::boolean, false) = true
  ) then
    raise exception 'curricular context contains no mandatory requirements';
  end if;

  for requirement in
    select r
    from jsonb_array_elements(target_curricular_context->'requirements') r
    where coalesce((r->>'coverageRequired')::boolean, false) = true
  loop
    if not exists (
      select 1
      from jsonb_array_elements(target_curriculum_coverage->'requirementCoverage') c
      where c->>'requirementId' = requirement->>'requirementId'
        and coalesce((c->>'coverageRequired')::boolean, false) = true
        and coalesce((c->>'satisfied')::boolean, false) = true
        and c->'curriculumNodeRef' = requirement->'curriculumNodeRef'
    ) then
      raise exception 'mandatory curriculum requirement is not satisfied: %', requirement->>'requirementId';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(target_reviewed_framework->'periods') p,
           jsonb_array_elements(coalesce(p->'suggestedNodeRefs', '[]'::jsonb)) node_ref
      where node_ref = requirement->'curriculumNodeRef'
    ) then
      raise exception 'mandatory curriculum node is absent from reviewed framework: %', requirement->>'requirementId';
    end if;
  end loop;

  select *
    into existing_row
  from public.annual_plan_curriculum_adoptions a
  where a.section_id = target_section_id
    and a.discipline_ref = target_discipline_ref
    and a.authority_quarantined_at is null
  order by a.accepted_at desc, a.applied_at desc
  limit 1;

  if existing_row.id is not null then
    if existing_row.source_handoff_footprint_hash <> target_source_handoff_footprint_hash then
      raise exception 'current Arena baseline differs; governed revalidation is required';
    end if;
    if existing_row.curricular_context_id <> target_curricular_context_id
      or existing_row.source_framework_message_id <> target_source_framework_message_id then
      raise exception 'idempotency conflict for curriculum adoption fingerprint';
    end if;
    return to_jsonb(existing_row);
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
    now(),
    target_reviewed_framework,
    target_curriculum_coverage,
    target_curricular_context,
    actor_id
  )
  returning * into existing_row;

  return to_jsonb(existing_row);
exception
  when unique_violation then
    select *
      into existing_row
    from public.annual_plan_curriculum_adoptions a
    where a.section_id = target_section_id
      and a.discipline_ref = target_discipline_ref
      and a.source_handoff_footprint_hash = target_source_handoff_footprint_hash
      and a.authority_quarantined_at is null
    limit 1;
    if existing_row.id is null then
      raise;
    end if;
    return to_jsonb(existing_row);
end;
$$;

revoke all on function public.persist_eco02_provisional_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, jsonb, jsonb, jsonb
) from public, anon;

grant execute on function public.persist_eco02_provisional_curriculum_adoption(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, boolean,
  text, text, text, text, text, jsonb, jsonb, jsonb
) to authenticated;

comment on table private.eco02_curriculum_intake_scopes is
  'Server-governed allowlist for exact ECO-02 provisional curriculum handoff payloads. No client role may read or write this table.';

comment on function public.persist_eco02_provisional_curriculum_adoption is
  'DB-enforced ECO-02 provisional curriculum intake. Requires authenticated workspace membership plus an exact enabled server-governed payload scope; cannot establish institutional authority.';
