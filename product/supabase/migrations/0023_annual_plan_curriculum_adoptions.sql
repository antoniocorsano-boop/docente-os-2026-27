create table if not exists public.annual_plan_curriculum_adoptions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  curricular_context_id text not null check (char_length(trim(curricular_context_id)) > 0),
  school_year_ref text not null check (char_length(trim(school_year_ref)) > 0),
  discipline_ref text not null check (char_length(trim(discipline_ref)) > 0),
  grade_ref text not null check (char_length(trim(grade_ref)) > 0),
  section_ref text null,
  cohort_ref text null,
  curriculum_version_ref jsonb not null check (jsonb_typeof(curriculum_version_ref) = 'object'),
  curriculum_state text not null check (curriculum_state in ('PROVISIONAL_COMPLETE','APPROVED')),
  alignment_authority text not null check (alignment_authority in ('PROVISIONAL_BASELINE','APPROVED_INSTITUTIONAL')),
  requires_revalidation_on_approval boolean not null,
  applicability_status text not null check (applicability_status in ('APPLICABLE','TRANSITIONAL')),
  transition_remodulation_state text not null check (transition_remodulation_state in ('NOT_REQUIRED','HYPOTHESIS','APPROVED')),
  source_handoff_footprint_hash text not null check (source_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  source_framework_message_id text not null check (char_length(trim(source_framework_message_id)) > 0),
  acceptance_decision_id text not null check (char_length(trim(acceptance_decision_id)) > 0),
  accepted_at timestamptz not null,
  reviewed_framework jsonb not null check (jsonb_typeof(reviewed_framework) = 'object'),
  curriculum_coverage jsonb not null check (jsonb_typeof(curriculum_coverage) = 'object'),
  curricular_context jsonb not null check (jsonb_typeof(curricular_context) = 'object'),
  applied_by uuid not null references auth.users(id) on delete restrict,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint annual_plan_curriculum_adoptions_scope_ck check (section_ref is not null or cohort_ref is not null),
  constraint annual_plan_curriculum_adoptions_authority_ck check (
    (curriculum_state = 'PROVISIONAL_COMPLETE'
      and alignment_authority = 'PROVISIONAL_BASELINE'
      and requires_revalidation_on_approval = true)
    or
    (curriculum_state = 'APPROVED'
      and alignment_authority = 'APPROVED_INSTITUTIONAL')
  ),
  constraint annual_plan_curriculum_adoptions_idempotency_uq
    unique (section_id, discipline_ref, source_handoff_footprint_hash)
);

create index if not exists idx_annual_plan_curriculum_adoptions_current
  on public.annual_plan_curriculum_adoptions(section_id, discipline_ref, accepted_at desc, applied_at desc);

create index if not exists idx_annual_plan_curriculum_adoptions_context
  on public.annual_plan_curriculum_adoptions(section_id, discipline_ref, curricular_context_id);

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
    ) then
    raise exception 'approved curriculum baseline cannot be downgraded to provisional';
  end if;

  new.applied_by := coalesce(auth.uid(), new.applied_by);
  new.applied_at := coalesce(new.applied_at, now());
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

create trigger annual_plan_curriculum_adoptions_enforce_invariants
before insert on public.annual_plan_curriculum_adoptions
for each row execute function private.enforce_annual_plan_curriculum_adoption_invariants();

alter table public.annual_plan_curriculum_adoptions enable row level security;

create policy annual_plan_curriculum_adoptions_select_member
  on public.annual_plan_curriculum_adoptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.annual_plan_sections s
      where s.id = section_id
        and private.is_workspace_member(s.workspace_id)
    )
  );

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
  );

grant select, insert on public.annual_plan_curriculum_adoptions to authenticated;
revoke all on public.annual_plan_curriculum_adoptions from anon;

comment on table public.annual_plan_curriculum_adoptions is
  'Append-only curriculum/framework adoption receipts for annual-plan sections. Preserves provisional versus approved authority, Arena provenance, teacher acceptance, and curriculum coverage without mutating B01-B33 execution history.';
