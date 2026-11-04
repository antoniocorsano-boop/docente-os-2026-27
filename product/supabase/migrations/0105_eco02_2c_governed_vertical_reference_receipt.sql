-- ECO02-2C-R4A: dormant, fail-closed vertical reference receipt boundary.
-- The trusted-source and institution registers start EMPTY and disabled.
-- This migration never adopts or upgrades the legacy P7 baseline.
begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (105, '0105_eco02_2c_governed_vertical_reference_receipt')
on conflict (version) do update
set migration_id = excluded.migration_id;

create table private.arena_2c_verified_sources (
  id uuid primary key default gen_random_uuid(),
  institution_id text not null check (char_length(btrim(institution_id)) between 2 and 180),
  school_year_ref text not null check (school_year_ref in ('2026/2027', '2026-2027')),
  source_master_version text not null check (source_master_version = '1.3'),
  source_revision_id text not null check (source_revision_id = '27'),
  source_content_footprint text not null check (source_content_footprint ~ '^[0-9a-f]{8}$'),
  release_structural_footprint text not null check (release_structural_footprint ~ '^[0-9a-f]{8}$'),
  segment_id text not null check (char_length(btrim(segment_id)) between 1 and 240),
  framework text not null check (framework = 'IN2012'),
  source_authority text not null check (source_authority = 'PROVISIONAL_COMPLETE'),
  curricolo_vigente boolean not null default false check (curricolo_vigente = false),
  qualification_receipt_ref text not null check (char_length(btrim(qualification_receipt_ref)) between 8 and 240),
  qualified_by uuid not null references auth.users(id) on delete restrict,
  qualified_at timestamptz not null default now(),
  enabled boolean not null default false,
  unique (institution_id, school_year_ref, source_revision_id, segment_id, release_structural_footprint)
);

create table private.arena_2c_institution_bindings (
  workspace_id uuid primary key references public.workspaces(id) on delete restrict,
  school_code text not null check (char_length(btrim(school_code)) between 3 and 40),
  institution_id text not null check (char_length(btrim(institution_id)) between 2 and 180),
  attestation_ref text not null check (char_length(btrim(attestation_ref)) between 8 and 240),
  attested_by uuid not null references auth.users(id) on delete restrict,
  attested_at timestamptz not null default now(),
  enabled boolean not null default false
);

-- No client can install an identity assertion or qualify a source from JSON.
alter table private.arena_2c_verified_sources enable row level security;
alter table private.arena_2c_institution_bindings enable row level security;
revoke all on private.arena_2c_verified_sources from public, anon, authenticated;
revoke all on private.arena_2c_institution_bindings from public, anon, authenticated;

create table public.annual_plan_2c_vertical_reference_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  section_id uuid not null references public.annual_plan_sections(id) on delete restrict,
  discipline_ref text not null default 'technology' check (discipline_ref = 'technology'),
  legacy_adoption_id uuid not null references public.annual_plan_curriculum_adoptions(id) on delete restrict,
  preparation_receipt_id uuid not null references public.lesson_preparation_receipts(id) on delete restrict,
  source_evidence_id uuid not null references private.arena_2c_verified_sources(id) on delete restrict,
  binding_workspace_id uuid not null references private.arena_2c_institution_bindings(workspace_id) on delete restrict,
  decision_request_id uuid not null,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  reference_authority text not null default 'PROVISIONAL_BASELINE'
    check (reference_authority = 'PROVISIONAL_BASELINE'),
  curricolo_vigente boolean not null default false check (curricolo_vigente = false),
  unique (workspace_id, academic_year_id, section_id, decision_request_id),
  unique (section_id, source_evidence_id),
  check (binding_workspace_id = workspace_id)
);

create function private.prevent_2c_vertical_reference_receipt_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '2C vertical reference receipts are append-only';
end;
$$;

create trigger annual_plan_2c_vertical_reference_receipts_append_only
before update or delete on public.annual_plan_2c_vertical_reference_receipts
for each row execute function private.prevent_2c_vertical_reference_receipt_mutation();

alter table public.annual_plan_2c_vertical_reference_receipts enable row level security;
create policy annual_plan_2c_vertical_reference_receipts_select_member
on public.annual_plan_2c_vertical_reference_receipts
for select to authenticated
using (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.annual_plan_sections s
    where s.id = section_id
      and s.workspace_id = workspace_id
      and s.academic_year_id = academic_year_id
  )
);

revoke all on public.annual_plan_2c_vertical_reference_receipts from public, anon, authenticated, service_role;
grant select on public.annual_plan_2c_vertical_reference_receipts to authenticated;

-- The RPC is an independent, dormant write boundary. It will reject every
-- request until a governed process populates and enables BOTH private registers.
-- The input provides record IDs, never permission to self-attest source/identity.
create function public.confirm_eco02_2c_vertical_reference(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_discipline_ref text,
  target_source_evidence_id uuid,
  expected_legacy_adoption_id uuid,
  expected_legacy_source_hash text,
  decision_request_id uuid,
  confirmed_provisional_reference boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  section_grade text;
  section_code text;
  year_label text;
  v_scope private.eco02_curriculum_intake_scopes%rowtype;
  v_legacy public.annual_plan_curriculum_adoptions%rowtype;
  v_source private.arena_2c_verified_sources%rowtype;
  v_binding private.arena_2c_institution_bindings%rowtype;
  v_previous public.annual_plan_2c_vertical_reference_receipts%rowtype;
  v_new public.annual_plan_2c_vertical_reference_receipts%rowtype;
begin
  if v_actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) is true then
    raise exception 'registered authenticated user required';
  end if;
  if confirmed_provisional_reference is not true then
    raise exception 'explicit teacher confirmation is required';
  end if;
  if decision_request_id is null or target_source_evidence_id is null
    or expected_legacy_adoption_id is null then
    raise exception 'exact source, baseline and idempotency identifiers are required';
  end if;
  if target_discipline_ref is distinct from 'technology' then
    raise exception 'only Technology is eligible for the 2C pilot';
  end if;
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace membership required';
  end if;

  -- Locks the class row: the baseline and earlier link must be rechecked
  -- after competing decisions for this precise section have serialized.
  select s.grade, s.section_code, ay.label
    into section_grade, section_code, year_label
  from public.annual_plan_sections s
  join public.academic_years ay
    on ay.id = s.academic_year_id and ay.workspace_id = s.workspace_id
  where s.id = target_section_id
    and s.workspace_id = target_workspace_id
    and s.academic_year_id = target_academic_year_id
  for update of s;

  if section_grade <> 'SECONDA' or section_code <> 'C'
    or replace(coalesce(year_label, ''), '/', '-') <> '2026-2027'
    or section_grade is null then
    raise exception 'this receipt boundary is restricted to the exact 2C pilot in 2026/2027';
  end if;

  select * into v_scope
  from private.eco02_curriculum_intake_scopes scope
  where scope.workspace_id = target_workspace_id
    and scope.academic_year_id = target_academic_year_id
    and scope.section_id = target_section_id
    and scope.discipline_ref = 'technology'
    and target_discipline_ref = 'technology'
    and scope.enabled = true;

  if v_scope.section_id is null then
    raise exception 'ECO-02 2C pilot is not enabled in this workspace';
  end if;

  if expected_legacy_source_hash is distinct from v_scope.allowed_handoff_footprint_hash
    or expected_legacy_source_hash is distinct from '7bb48175' then
    raise exception 'historical P7 source no longer matches the pilot';
  end if;

  -- The exact documented preparation P7 must still exist in this class.
  if not exists (
    select 1
    from public.lesson_preparation_receipts p
    where p.id = '1fe4769d-16a8-4cf1-bf1b-af6f12177b24'::uuid
      and p.workspace_id = target_workspace_id
      and p.academic_year_id = target_academic_year_id
      and p.section_id = target_section_id
      and p.block_id = 'B01'
      and p.projection_id = 'HTC-SECONDA-B01-v1'
      and p.curriculum_source_handoff_footprint_hash = expected_legacy_source_hash
      and p.preparation_fingerprint = '311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e'
      and p.confirmed_at::date = date '2026-09-21'
  ) then
    raise exception 'original P7 lesson preparation receipt was not verified';
  end if;

  -- Preserve the last accepted old baseline and reject stale previews.
  select a.* into v_legacy
  from public.annual_plan_curriculum_adoptions a
  where a.section_id = target_section_id
    and a.discipline_ref = 'technology'
  order by a.accepted_at desc, a.applied_at desc
  limit 1;

  if v_legacy.id is null
    or v_legacy.id is distinct from expected_legacy_adoption_id
    or v_legacy.source_handoff_footprint_hash is distinct from expected_legacy_source_hash
    or v_legacy.alignment_authority <> 'PROVISIONAL_BASELINE'
    or v_legacy.curriculum_state <> 'PROVISIONAL_COMPLETE'
    or v_legacy.requires_revalidation_on_approval is not true then
    raise exception 'historical 2C baseline drift or authority change requires review';
  end if;

  select * into v_source from private.arena_2c_verified_sources s
  where s.id = target_source_evidence_id
    and s.enabled = true
    and replace(s.school_year_ref, '/', '-') = '2026-2027';

  if v_source.id is null
    or v_source.source_master_version <> '1.3'
    or v_source.source_revision_id <> '27'
    or v_source.source_content_footprint <> '99c4ccc3'
    or v_source.release_structural_footprint <> '8588371c'
    or v_source.segment_id <> 'can-curr-master-00-secondaria-tecnologia-2'
    or v_source.framework <> 'IN2012'
    or v_source.source_authority <> 'PROVISIONAL_COMPLETE'
    or v_source.curricolo_vigente is not false
    or btrim(v_source.qualification_receipt_ref) = '' then
    raise exception 'trusted Arena source evidence is absent or mismatched';
  end if;

  select * into v_binding from private.arena_2c_institution_bindings b
  where b.workspace_id = target_workspace_id
    and b.institution_id = v_source.institution_id
    and b.enabled = true;

  if v_binding.workspace_id is null or btrim(v_binding.attestation_ref) = ''
    or not exists (
      select 1 from public.teacher_workspace_settings t
      where t.workspace_id = target_workspace_id
        and t.academic_year_id = target_academic_year_id
        and t.school_code = v_binding.school_code
    ) then
    raise exception 'institution binding is not attested for this workspace';
  end if;

  -- Reject alternative sources and request IDs instead of overwriting P7.
  select * into v_previous
  from public.annual_plan_2c_vertical_reference_receipts r
  where r.section_id = target_section_id
  limit 1;

  if v_previous.id is not null then
    if v_previous.source_evidence_id = target_source_evidence_id
      and v_previous.legacy_adoption_id = expected_legacy_adoption_id
      and v_previous.decision_request_id = decision_request_id
      and v_previous.decided_by = v_actor then
      return jsonb_build_object(
        'status', 'PROVISIONAL_REFERENCE_LINKED',
        'receiptId', v_previous.id,
        'idempotentReplay', true,
        'legacyBaselinePreserved', true,
        'curricoloVigente', false
      );
    end if;
    raise exception '2C vertical reference was already recorded under another decision';
  end if;

  insert into public.annual_plan_2c_vertical_reference_receipts (
    workspace_id, academic_year_id, section_id, legacy_adoption_id,
    preparation_receipt_id, source_evidence_id, binding_workspace_id,
    decision_request_id, decided_by
  ) values (
    target_workspace_id, target_academic_year_id, target_section_id,
    expected_legacy_adoption_id,
    '1fe4769d-16a8-4cf1-bf1b-af6f12177b24'::uuid,
    target_source_evidence_id, target_workspace_id,
    decision_request_id, v_actor
  ) returning * into v_new;

  return jsonb_build_object(
    'status', 'PROVISIONAL_REFERENCE_LINKED',
    'receiptId', v_new.id,
    'idempotentReplay', false,
    'legacyBaselinePreserved', true,
    'curricoloVigente', false
  );
end;
$$;

revoke all on function public.confirm_eco02_2c_vertical_reference(
  uuid, uuid, uuid, text, uuid, uuid, text, uuid, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.confirm_eco02_2c_vertical_reference(
  uuid, uuid, uuid, text, uuid, uuid, text, uuid, boolean
) to authenticated;

comment on table public.annual_plan_2c_vertical_reference_receipts is
  'Append-only teacher decision to link a verified, non-vigente Arena reference to 2C. It does not replace the previously accepted P7 baseline or lesson-preparation receipt.';

select private.advance_runtime_schema_contract('0105_eco02_2c_governed_vertical_reference_receipt');

commit;
