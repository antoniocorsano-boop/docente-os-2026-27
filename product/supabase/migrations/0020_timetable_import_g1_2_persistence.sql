-- DOS-TT-IMPORT-01 / G1.2
-- Governed persistence materialization. Does not implement upload/parser/UI.

alter table public.timetable_versions
  add column if not exists revision bigint not null default 0 check (revision >= 0);

create table public.timetable_import_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  source_fingerprint text not null check (char_length(btrim(source_fingerprint)) between 1 and 256),
  source_kind text not null default 'INSTITUTION_DOCUMENT' check (source_kind = 'INSTITUTION_DOCUMENT'),
  source_label text not null check (char_length(btrim(source_label)) between 1 and 240),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  effective_from_candidate date null,
  source_is_provisional boolean not null default true,
  state text not null default 'DRAFT' check (state in ('DRAFT','READY_TO_CONFIRM','APPLIED_TO_DRAFT','REJECTED','EXPIRED')),
  revision bigint not null default 1 check (revision >= 1),
  parser_version text not null check (char_length(btrim(parser_version)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (expires_at <= created_at + interval '30 days')
);

create unique index timetable_import_one_live_source_uq
  on public.timetable_import_candidates(workspace_id, academic_year_id, source_fingerprint)
  where state in ('DRAFT','READY_TO_CONFIRM');
create index idx_timetable_import_candidates_workspace_year_state
  on public.timetable_import_candidates(workspace_id, academic_year_id, state);
create index idx_timetable_import_candidates_expires_at on public.timetable_import_candidates(expires_at);

create table public.timetable_import_candidate_rows (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.timetable_import_candidates(id) on delete cascade,
  candidate_revision bigint not null check (candidate_revision >= 1),
  row_key text not null check (char_length(btrim(row_key)) between 1 and 160),
  weekday smallint null check (weekday between 1 and 6),
  ordinal smallint null check (ordinal between 1 and 20),
  start_time time null,
  end_time time null,
  source_class_label text null check (source_class_label is null or char_length(source_class_label) <= 80),
  resolved_section_id uuid null references public.annual_plan_sections(id) on delete restrict,
  resolved_assignment_id uuid null references public.teaching_assignments(id) on delete restrict,
  proposed_slot_kind text null check (proposed_slot_kind is null or proposed_slot_kind in ('LESSON','DISPOSITION','RECEPTION','OTHER')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNRESOLVED')),
  review_state text not null check (review_state in ('AUTO_RESOLVED','REVIEW_REQUIRED','CONFIRMED','REJECTED')),
  evidence_ref text null check (evidence_ref is null or char_length(evidence_ref) <= 500),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, candidate_revision, row_key),
  check (start_time is null or end_time is null or end_time > start_time)
);
create index idx_timetable_import_rows_candidate_revision
  on public.timetable_import_candidate_rows(candidate_id, candidate_revision);

create table public.timetable_import_apply_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  candidate_id uuid not null references public.timetable_import_candidates(id) on delete restrict,
  candidate_revision bigint not null check (candidate_revision >= 1),
  confirmation_request_id uuid not null,
  draft_version_id uuid not null references public.timetable_versions(id) on delete restrict,
  expected_draft_revision bigint not null check (expected_draft_revision >= 0),
  resulting_draft_revision bigint not null check (resulting_draft_revision >= 1),
  operations_digest text not null check (char_length(operations_digest) = 64),
  applied_at timestamptz not null,
  applied_by uuid not null references auth.users(id) on delete restrict,
  unique(workspace_id, confirmation_request_id)
);

create or replace function private.enforce_timetable_import_candidate()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare y_workspace uuid; y_start date; y_end date;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id or new.academic_year_id <> old.academic_year_id
      or new.source_fingerprint <> old.source_fingerprint or new.created_by <> old.created_by then
      raise exception 'timetable import candidate identity is immutable';
    end if;
    if old.state = 'APPLIED_TO_DRAFT' then raise exception 'applied candidate is immutable'; end if;
    if new.state = 'APPLIED_TO_DRAFT' and current_user <> 'postgres' then
      raise exception 'applied state is governed';
    end if;
    new.created_at := old.created_at;
  end if;
  select workspace_id, starts_on, ends_on into y_workspace, y_start, y_end
  from public.academic_years where id = new.academic_year_id;
  if y_workspace is null or y_workspace <> new.workspace_id then raise exception 'candidate academic year outside workspace'; end if;
  if new.effective_from_candidate is not null and (new.effective_from_candidate < y_start or new.effective_from_candidate > y_end) then
    raise exception 'candidate effective date outside academic year';
  end if;
  new.source_fingerprint := btrim(new.source_fingerprint);
  new.source_label := btrim(new.source_label);
  new.source_ref := nullif(btrim(coalesce(new.source_ref,'')), '');
  new.parser_version := btrim(new.parser_version);
  new.updated_at := now();
  return new;
end $$;
create trigger timetable_import_candidates_enforce
before insert or update on public.timetable_import_candidates
for each row execute function private.enforce_timetable_import_candidate();

create or replace function private.enforce_timetable_import_row()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare c_workspace uuid; c_year uuid; c_revision bigint; a_workspace uuid; a_year uuid; a_section uuid; s_workspace uuid; s_year uuid;
begin
  select workspace_id, academic_year_id, revision into c_workspace, c_year, c_revision
  from public.timetable_import_candidates where id = new.candidate_id;
  if c_workspace is null then raise exception 'candidate not found'; end if;
  if new.candidate_revision <> c_revision then raise exception 'candidate row revision mismatch'; end if;
  if new.resolved_assignment_id is not null then
    select workspace_id, academic_year_id, section_id into a_workspace, a_year, a_section
    from public.teaching_assignments where id = new.resolved_assignment_id;
    if a_workspace is null or a_workspace <> c_workspace or a_year <> c_year then raise exception 'candidate assignment context mismatch'; end if;
    if new.resolved_section_id is null then new.resolved_section_id := a_section; end if;
    if new.resolved_section_id <> a_section then raise exception 'candidate section/assignment mismatch'; end if;
  elsif new.resolved_section_id is not null then
    select workspace_id, academic_year_id into s_workspace, s_year from public.annual_plan_sections where id = new.resolved_section_id;
    if s_workspace is null or s_workspace <> c_workspace or s_year <> c_year then raise exception 'candidate section context mismatch'; end if;
  end if;
  new.row_key := btrim(new.row_key);
  new.source_class_label := nullif(btrim(coalesce(new.source_class_label,'')), '');
  new.evidence_ref := nullif(btrim(coalesce(new.evidence_ref,'')), '');
  if tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger timetable_import_rows_enforce
before insert or update on public.timetable_import_candidate_rows
for each row execute function private.enforce_timetable_import_row();

-- Manual T1 edits bump revision. The governed apply uses an internal transaction-local marker.
create or replace function private.bump_timetable_draft_revision_from_slot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  v_id := case when tg_op = 'DELETE' then old.timetable_version_id else new.timetable_version_id end;
  select status into v_status from public.timetable_versions where id = v_id;
  if v_status <> 'DRAFT' then return null; end if;
  if current_setting('docente_os.timetable_apply_token', true) is distinct from txid_current()::text then
    update public.timetable_versions set revision = revision + 1 where id = v_id and status = 'DRAFT';
  end if;
  return null;
end $$;
revoke all on function private.bump_timetable_draft_revision_from_slot() from public, anon, authenticated;
create trigger timetable_slots_bump_draft_revision
after insert or update or delete on public.timetable_slots
for each row execute function private.bump_timetable_draft_revision_from_slot();

create or replace function private.bump_timetable_draft_revision_from_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'DRAFT' and new.status = 'DRAFT'
    and (new.label is distinct from old.label or new.effective_from is distinct from old.effective_from
      or new.effective_to is distinct from old.effective_to or new.source_kind is distinct from old.source_kind
      or new.source_ref is distinct from old.source_ref)
    and current_setting('docente_os.timetable_apply_token', true) is distinct from txid_current()::text then
    new.revision := old.revision + 1;
  elsif new.revision <> old.revision and current_setting('docente_os.timetable_apply_token', true) is distinct from txid_current()::text then
    raise exception 'timetable revision is server controlled';
  end if;
  return new;
end $$;
revoke all on function private.bump_timetable_draft_revision_from_version() from public, anon, authenticated;
create trigger timetable_versions_bump_revision
before update on public.timetable_versions
for each row execute function private.bump_timetable_draft_revision_from_version();

create or replace function public.apply_timetable_import_to_draft(
  p_candidate_id uuid,
  p_candidate_revision bigint,
  p_expected_draft_version_id uuid,
  p_expected_draft_revision bigint,
  p_confirmation_request_id uuid,
  p_operations jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_workspace uuid; v_year uuid; v_state text; v_expires timestamptz; v_candidate_revision bigint;
  v_draft_revision bigint; v_draft_status text; v_digest text; v_receipt public.timetable_import_apply_receipts%rowtype;
  op jsonb; v_kind text; v_row_key text; v_slot_id uuid; v_row public.timetable_import_candidate_rows%rowtype;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_operations) <> 'array' then raise exception 'operations must be an array'; end if;

  select workspace_id, academic_year_id, state, expires_at, revision
    into v_workspace, v_year, v_state, v_expires, v_candidate_revision
  from public.timetable_import_candidates where id = p_candidate_id;
  if v_workspace is null or not private.is_workspace_member(v_workspace) then raise exception 'candidate not accessible'; end if;

  -- Digest is canonical for jsonb textual representation and computed server-side.
  v_digest := encode(digest(convert_to(p_operations::text, 'UTF8'), 'sha256'), 'hex');
  select * into v_receipt from public.timetable_import_apply_receipts
  where workspace_id = v_workspace and confirmation_request_id = p_confirmation_request_id;
  if found then
    if v_receipt.candidate_id <> p_candidate_id or v_receipt.candidate_revision <> p_candidate_revision
      or v_receipt.draft_version_id <> p_expected_draft_version_id or v_receipt.expected_draft_revision <> p_expected_draft_revision
      or v_receipt.operations_digest <> v_digest then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return to_jsonb(v_receipt);
  end if;

  select revision, status into v_draft_revision, v_draft_status from public.timetable_versions
  where id = p_expected_draft_version_id and workspace_id = v_workspace and academic_year_id = v_year for update;
  if v_draft_status is null then raise exception 'draft not found'; end if;
  if v_draft_status <> 'DRAFT' then raise exception 'target is not DRAFT'; end if;
  if v_draft_revision <> p_expected_draft_revision then raise exception 'CONFLICT_DETECTED'; end if;
  if v_candidate_revision <> p_candidate_revision then raise exception 'candidate revision mismatch'; end if;
  if v_state <> 'READY_TO_CONFIRM' then raise exception 'candidate not ready'; end if;
  if v_expires <= now() then raise exception 'candidate expired'; end if;

  perform set_config('docente_os.timetable_apply_token', txid_current()::text, true);

  for op in select value from jsonb_array_elements(p_operations) loop
    v_kind := op->>'kind'; v_row_key := op->>'candidateRowId';
    if v_kind not in ('KEEP','ADD','MOVE','CHANGE','REMOVE','IGNORE') then raise exception 'unsupported operation'; end if;
    if v_kind in ('ADD','MOVE','CHANGE','IGNORE') then
      select * into v_row from public.timetable_import_candidate_rows
      where candidate_id = p_candidate_id and candidate_revision = p_candidate_revision and row_key = v_row_key;
      if not found then raise exception 'candidate row not found'; end if;
    end if;
    if v_kind in ('ADD','MOVE','CHANGE') then
      if v_row.review_state not in ('AUTO_RESOLVED','CONFIRMED') or v_row.weekday is null or v_row.start_time is null or v_row.end_time is null or v_row.proposed_slot_kind is null then
        raise exception 'candidate row is not applicable';
      end if;
    end if;
    if v_kind = 'ADD' then
      insert into public.timetable_slots(timetable_version_id, weekday, start_time, end_time, slot_kind, section_id, discipline_id, teaching_assignment_id, ordinal, created_by)
      select p_expected_draft_version_id, v_row.weekday, v_row.start_time, v_row.end_time, v_row.proposed_slot_kind,
        v_row.resolved_section_id, ta.discipline_id, v_row.resolved_assignment_id, v_row.ordinal, v_uid
      from (select 1) x left join public.teaching_assignments ta on ta.id = v_row.resolved_assignment_id;
    elsif v_kind in ('MOVE','CHANGE') then
      v_slot_id := (op->>'slotId')::uuid;
      update public.timetable_slots s set weekday=v_row.weekday, start_time=v_row.start_time, end_time=v_row.end_time,
        slot_kind=v_row.proposed_slot_kind, section_id=v_row.resolved_section_id, discipline_id=ta.discipline_id,
        teaching_assignment_id=v_row.resolved_assignment_id, ordinal=v_row.ordinal
      from public.teaching_assignments ta
      where s.id=v_slot_id and s.timetable_version_id=p_expected_draft_version_id and ta.id=v_row.resolved_assignment_id;
      if not found then raise exception 'slot/assignment not found for change'; end if;
    elsif v_kind = 'REMOVE' then
      if coalesce((op->>'explicitlyConfirmed')::boolean, false) is not true then raise exception 'REMOVE requires explicit confirmation'; end if;
      v_slot_id := (op->>'slotId')::uuid;
      delete from public.timetable_slots where id=v_slot_id and timetable_version_id=p_expected_draft_version_id;
      if not found then raise exception 'slot not found for removal'; end if;
    elsif v_kind = 'KEEP' then
      v_slot_id := (op->>'slotId')::uuid;
      if not exists(select 1 from public.timetable_slots where id=v_slot_id and timetable_version_id=p_expected_draft_version_id) then raise exception 'slot not found for keep'; end if;
    end if;
  end loop;

  update public.timetable_versions set revision = revision + 1 where id=p_expected_draft_version_id and revision=p_expected_draft_revision and status='DRAFT'
  returning revision into v_draft_revision;
  if not found then raise exception 'CONFLICT_DETECTED'; end if;

  insert into public.timetable_import_apply_receipts(workspace_id,candidate_id,candidate_revision,confirmation_request_id,draft_version_id,expected_draft_revision,resulting_draft_revision,operations_digest,applied_at,applied_by)
  values(v_workspace,p_candidate_id,p_candidate_revision,p_confirmation_request_id,p_expected_draft_version_id,p_expected_draft_revision,v_draft_revision,v_digest,clock_timestamp(),v_uid)
  returning * into v_receipt;

  update public.timetable_import_candidates set state='APPLIED_TO_DRAFT' where id=p_candidate_id;
  return to_jsonb(v_receipt);
end $$;

revoke all on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) from public, anon;
grant execute on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) to authenticated;

alter table public.timetable_import_candidates enable row level security;
alter table public.timetable_import_candidate_rows enable row level security;
alter table public.timetable_import_apply_receipts enable row level security;

create policy timetable_import_candidates_select_member on public.timetable_import_candidates for select to authenticated using (private.is_workspace_member(workspace_id));
create policy timetable_import_candidates_insert_member on public.timetable_import_candidates for insert to authenticated with check (private.is_workspace_member(workspace_id) and created_by=(select auth.uid()) and state <> 'APPLIED_TO_DRAFT');
create policy timetable_import_candidates_update_member on public.timetable_import_candidates for update to authenticated using (private.is_workspace_member(workspace_id) and state <> 'APPLIED_TO_DRAFT') with check (private.is_workspace_member(workspace_id) and state <> 'APPLIED_TO_DRAFT');
create policy timetable_import_candidates_delete_member on public.timetable_import_candidates for delete to authenticated using (private.is_workspace_member(workspace_id) and state <> 'APPLIED_TO_DRAFT');

create policy timetable_import_rows_select_member on public.timetable_import_candidate_rows for select to authenticated using (exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id)));
create policy timetable_import_rows_insert_member on public.timetable_import_candidate_rows for insert to authenticated with check (exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state <> 'APPLIED_TO_DRAFT'));
create policy timetable_import_rows_update_member on public.timetable_import_candidate_rows for update to authenticated using (exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state <> 'APPLIED_TO_DRAFT')) with check (exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state <> 'APPLIED_TO_DRAFT'));
create policy timetable_import_rows_delete_member on public.timetable_import_candidate_rows for delete to authenticated using (exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state <> 'APPLIED_TO_DRAFT'));

create policy timetable_import_receipts_select_member on public.timetable_import_apply_receipts for select to authenticated using (private.is_workspace_member(workspace_id));

-- Receipt writes are intentionally absent from authenticated grants/policies.
grant select, insert, update, delete on public.timetable_import_candidates to authenticated;
grant select, insert, update, delete on public.timetable_import_candidate_rows to authenticated;
grant select on public.timetable_import_apply_receipts to authenticated;
revoke all on public.timetable_import_candidates from anon;
revoke all on public.timetable_import_candidate_rows from anon;
revoke all on public.timetable_import_apply_receipts from anon;
