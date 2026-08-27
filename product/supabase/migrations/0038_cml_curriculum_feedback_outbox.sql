create table if not exists public.cml_curriculum_feedback_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  feedback_id text not null check (char_length(btrim(feedback_id)) between 1 and 200),
  curricular_context_id text not null check (char_length(btrim(curricular_context_id)) between 1 and 300),
  curriculum_version_ref jsonb not null check (jsonb_typeof(curriculum_version_ref) = 'object'),
  source_handoff_footprint_hash text not null check (source_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  source_framework_message_id text not null check (char_length(btrim(source_framework_message_id)) between 1 and 300),
  category text not null check (category in ('SEQUENCING','PREREQUISITE','SCOPE','WORDING','FEASIBILITY','OTHER')),
  envelope jsonb not null check (jsonb_typeof(envelope) = 'object'),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 500),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint cml_curriculum_feedback_outbox_feedback_uq unique (workspace_id, feedback_id),
  constraint cml_curriculum_feedback_outbox_idempotency_uq unique (workspace_id, idempotency_key)
);

create index if not exists idx_cml_curriculum_feedback_outbox_context
  on public.cml_curriculum_feedback_outbox(workspace_id, academic_year_id, section_id, curricular_context_id, submitted_at desc);

create or replace function private.enforce_cml_curriculum_feedback_outbox_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_workspace_id uuid;
  section_academic_year_id uuid;
begin
  select s.workspace_id, s.academic_year_id
    into section_workspace_id, section_academic_year_id
  from public.annual_plan_sections s
  where s.id = new.section_id;

  if section_workspace_id is null
    or section_workspace_id <> new.workspace_id
    or section_academic_year_id <> new.academic_year_id then
    raise exception 'curriculum feedback section is outside the active workspace/year';
  end if;

  if new.envelope->>'contract' <> 'CML_INTEROP_V1'
    or new.envelope->>'messageType' <> 'CURRICULUM_FEEDBACK_SUBMITTED'
    or new.envelope->>'sourceProduct' <> 'DOCENTE_OS'
    or new.envelope->>'privacyClass' <> 'PROFESSIONAL_NON_PERSONAL'
    or new.envelope#>>'{payload,teacherConfirmed}' <> 'true' then
    raise exception 'curriculum feedback envelope violates reverse interop contract';
  end if;

  if new.envelope->>'messageId' <> new.feedback_id then
    raise exception 'curriculum feedback message identity mismatch';
  end if;

  new.feedback_id := btrim(new.feedback_id);
  new.curricular_context_id := btrim(new.curricular_context_id);
  new.source_framework_message_id := btrim(new.source_framework_message_id);
  new.idempotency_key := btrim(new.idempotency_key);
  new.submitted_by := coalesce(auth.uid(), new.submitted_by);
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;

create trigger cml_curriculum_feedback_outbox_enforce_invariants
before insert on public.cml_curriculum_feedback_outbox
for each row execute function private.enforce_cml_curriculum_feedback_outbox_invariants();

alter table public.cml_curriculum_feedback_outbox enable row level security;

create policy cml_curriculum_feedback_outbox_select_member
  on public.cml_curriculum_feedback_outbox
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy cml_curriculum_feedback_outbox_insert_member
  on public.cml_curriculum_feedback_outbox
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and submitted_by = (select auth.uid())
  );

grant select, insert on public.cml_curriculum_feedback_outbox to authenticated;
revoke update, delete on public.cml_curriculum_feedback_outbox from authenticated;
revoke all on public.cml_curriculum_feedback_outbox from anon;

comment on table public.cml_curriculum_feedback_outbox is
  'Append-only local receipts for teacher-confirmed PROFESSIONAL_NON_PERSONAL curriculum feedback. No cross-app transport is performed by this table.';
