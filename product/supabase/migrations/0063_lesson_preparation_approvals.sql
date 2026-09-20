begin;

create table public.lesson_preparation_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete cascade,
  canonical_plan_asset_id uuid not null references public.knowledge_assets(id) on delete restrict,
  canonical_generation_id uuid not null references public.knowledge_processing_generations(id) on delete restrict,
  block_id text not null check (block_id ~ '^B(0[1-9]|[12][0-9]|3[0-3])$'),
  projection_id text not null check (char_length(trim(projection_id)) > 0),
  curriculum_source_handoff_footprint_hash text not null check (curriculum_source_handoff_footprint_hash ~ '^[0-9a-f]{8}$'),
  curriculum_baseline_fingerprint text not null check (curriculum_baseline_fingerprint ~ '^[0-9a-f]{64}$'),
  preparation_fingerprint text not null check (preparation_fingerprint ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot->>'schemaVersion' = '1'
  ),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  constraint lesson_preparation_approvals_receipt_uq unique (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    preparation_fingerprint
  )
);

create index idx_lesson_preparation_approvals_latest
  on public.lesson_preparation_approvals(
    workspace_id,
    academic_year_id,
    section_id,
    canonical_generation_id,
    block_id,
    projection_id,
    approved_at desc
  );

create or replace function private.prevent_lesson_preparation_approval_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'lesson preparation approval receipts are append-only';
end;
$$;

create trigger lesson_preparation_approvals_append_only
before update or delete on public.lesson_preparation_approvals
for each row execute function private.prevent_lesson_preparation_approval_mutation();

alter table public.lesson_preparation_approvals enable row level security;

create policy lesson_preparation_approvals_select_member
  on public.lesson_preparation_approvals
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

revoke all on public.lesson_preparation_approvals from public, anon, authenticated, service_role;
grant select on public.lesson_preparation_approvals to authenticated;
grant select, insert on public.lesson_preparation_approvals to service_role;

comment on table public.lesson_preparation_approvals is
  'Append-only teacher approval receipts for an exact effective lesson preparation. Authenticated clients may read their workspace receipts but cannot insert, update, delete, or invoke an approval RPC. Writes are server-only through the application secret-key boundary.';

commit;
