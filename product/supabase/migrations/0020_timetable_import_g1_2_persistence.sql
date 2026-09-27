-- DOS-TT-IMPORT-01 / G1.2
-- Governed persistence materialization. Does not implement upload/parser/UI.

alter table public.timetable_versions
  add column if not exists revision bigint not null default 0 check (revision >= 0);

create table public.timetable_import_candidates (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  source_fingerprint text not null check (char_length(btrim(source_fingerprint)) between 1 and 256),
  source_kind text not null default 'INSTITUTION_DOCUMENT' check (source_kind='INSTITUTION_DOCUMENT'),
  source_label text not null check (char_length(btrim(source_label)) between 1 and 240), source_ref text null,
  effective_from_candidate date null, source_is_provisional boolean not null default true,
  state text not null default 'DRAFT' check (state in ('DRAFT','READY_TO_CONFIRM','APPLIED_TO_DRAFT','REJECTED','EXPIRED')),
  revision bigint not null default 1 check (revision>=1), parser_version text not null,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '30 days'),
  check (expires_at <= created_at + interval '30 days')
);
create unique index timetable_import_one_live_source_uq on public.timetable_import_candidates(workspace_id,academic_year_id,source_fingerprint) where state in ('DRAFT','READY_TO_CONFIRM');
create index idx_timetable_import_candidates_workspace_year_state on public.timetable_import_candidates(workspace_id,academic_year_id,state);
create index idx_timetable_import_candidates_expires_at on public.timetable_import_candidates(expires_at);

create table public.timetable_import_candidate_rows (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.timetable_import_candidates(id) on delete cascade,
  candidate_revision bigint not null check(candidate_revision>=1), row_key text not null check(char_length(btrim(row_key)) between 1 and 160),
  weekday smallint null check(weekday between 1 and 6), ordinal smallint null check(ordinal between 1 and 20), start_time time null, end_time time null,
  source_class_label text null, resolved_section_id uuid null references public.annual_plan_sections(id) on delete restrict,
  resolved_assignment_id uuid null references public.teaching_assignments(id) on delete restrict,
  proposed_slot_kind text null check(proposed_slot_kind is null or proposed_slot_kind in ('LESSON','DISPOSITION','RECEPTION','OTHER')),
  confidence text not null check(confidence in ('HIGH','MEDIUM','LOW','UNRESOLVED')),
  review_state text not null check(review_state in ('AUTO_RESOLVED','REVIEW_REQUIRED','CONFIRMED','REJECTED')),
  evidence_ref text null, warnings jsonb not null default '[]'::jsonb check(jsonb_typeof(warnings)='array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(candidate_id,candidate_revision,row_key), check(start_time is null or end_time is null or end_time>start_time)
);
create index idx_timetable_import_rows_candidate_revision on public.timetable_import_candidate_rows(candidate_id,candidate_revision);

create table public.timetable_import_apply_receipts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete restrict,
  candidate_id uuid not null references public.timetable_import_candidates(id) on delete restrict, candidate_revision bigint not null,
  confirmation_request_id uuid not null, draft_version_id uuid not null references public.timetable_versions(id) on delete restrict,
  expected_draft_revision bigint not null, resulting_draft_revision bigint not null, operations_digest text not null check(char_length(operations_digest)=64),
  applied_at timestamptz not null, applied_by uuid not null references auth.users(id) on delete restrict,
  unique(workspace_id,confirmation_request_id)
);

-- Non-forgeable internal transaction capability: no client role has table privileges.
create table private.timetable_import_apply_context(backend_pid integer not null, transaction_id bigint not null, candidate_id uuid not null, primary key(backend_pid,transaction_id));
revoke all on private.timetable_import_apply_context from public, anon, authenticated;
create or replace function private.has_timetable_import_apply_context(p_candidate_id uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.timetable_import_apply_context c where c.backend_pid=pg_backend_pid() and c.transaction_id=txid_current() and (p_candidate_id is null or c.candidate_id=p_candidate_id))
$$;
revoke all on function private.has_timetable_import_apply_context(uuid) from public,anon,authenticated;

create or replace function private.enforce_timetable_import_candidate() returns trigger language plpgsql security invoker set search_path='' as $$
declare y_workspace uuid; y_start date; y_end date;
begin
 if tg_op='UPDATE' then
  if new.workspace_id<>old.workspace_id or new.academic_year_id<>old.academic_year_id or new.source_fingerprint<>old.source_fingerprint or new.created_by<>old.created_by then raise exception 'candidate identity is immutable'; end if;
  if old.state='APPLIED_TO_DRAFT' then raise exception 'applied candidate is immutable'; end if;
  if new.state='APPLIED_TO_DRAFT' and not private.has_timetable_import_apply_context(new.id) then raise exception 'applied state is governed'; end if;
  if new.revision<>old.revision and not private.has_timetable_import_apply_context(new.id) then raise exception 'candidate revision is server controlled'; end if;
  if new.state is distinct from old.state and new.state in ('DRAFT','READY_TO_CONFIRM') and old.state in ('DRAFT','READY_TO_CONFIRM') and not private.has_timetable_import_apply_context(new.id) then new.revision:=old.revision+1; end if;
  new.created_at:=old.created_at;
 end if;
 select workspace_id,starts_on,ends_on into y_workspace,y_start,y_end from public.academic_years where id=new.academic_year_id;
 if y_workspace is null or y_workspace<>new.workspace_id then raise exception 'candidate academic year outside workspace'; end if;
 if new.effective_from_candidate is not null and (new.effective_from_candidate<y_start or new.effective_from_candidate>y_end) then raise exception 'candidate effective date outside academic year'; end if;
 new.source_fingerprint:=btrim(new.source_fingerprint); new.source_label:=btrim(new.source_label); new.updated_at:=now(); return new;
end $$;
create trigger timetable_import_candidates_enforce before insert or update on public.timetable_import_candidates for each row execute function private.enforce_timetable_import_candidate();

-- Rows are editable only in DRAFT. READY seals a revision; reopening/sealing advances it.
create or replace function private.sync_timetable_import_row_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revision is distinct from old.revision then
  insert into private.timetable_import_apply_context values(pg_backend_pid(),txid_current(),new.id) on conflict(backend_pid,transaction_id) do update set candidate_id=excluded.candidate_id;
  update public.timetable_import_candidate_rows set candidate_revision=new.revision,updated_at=now() where candidate_id=new.id and candidate_revision=old.revision;
  delete from private.timetable_import_apply_context where backend_pid=pg_backend_pid() and transaction_id=txid_current();
 end if; return null;
end $$;
revoke all on function private.sync_timetable_import_row_revision() from public,anon,authenticated;
create trigger timetable_import_candidates_sync_row_revision after update of revision on public.timetable_import_candidates for each row execute function private.sync_timetable_import_row_revision();

create or replace function private.enforce_timetable_import_row() returns trigger language plpgsql security invoker set search_path='' as $$
declare cw uuid; cy uuid; cr bigint; cs text; aw uuid; ay uuid; asection uuid; sw uuid; sy uuid;
begin
 select workspace_id,academic_year_id,revision,state into cw,cy,cr,cs from public.timetable_import_candidates where id=new.candidate_id;
 if cw is null then raise exception 'candidate not found'; end if;
 if not private.has_timetable_import_apply_context(new.candidate_id) and cs<>'DRAFT' then raise exception 'candidate rows mutable only in DRAFT'; end if;
 if new.candidate_revision<>cr and not private.has_timetable_import_apply_context(new.candidate_id) then raise exception 'candidate row revision mismatch'; end if;
 if tg_op='UPDATE' and (new.candidate_id<>old.candidate_id or new.row_key<>old.row_key) then raise exception 'candidate row identity immutable'; end if;
 if new.resolved_assignment_id is not null then
  select workspace_id,academic_year_id,section_id into aw,ay,asection from public.teaching_assignments where id=new.resolved_assignment_id;
  if aw is null or aw<>cw or ay<>cy then raise exception 'candidate assignment context mismatch'; end if;
  if new.resolved_section_id is null then new.resolved_section_id:=asection; end if;
  if new.resolved_section_id<>asection then raise exception 'candidate section/assignment mismatch'; end if;
 elsif new.resolved_section_id is not null then
  select workspace_id,academic_year_id into sw,sy from public.annual_plan_sections where id=new.resolved_section_id;
  if sw is null or sw<>cw or sy<>cy then raise exception 'candidate section context mismatch'; end if;
 end if;
 new.row_key:=btrim(new.row_key); if tg_op='UPDATE' then new.created_at:=old.created_at; end if; new.updated_at:=now(); return new;
end $$;
create trigger timetable_import_rows_enforce before insert or update on public.timetable_import_candidate_rows for each row execute function private.enforce_timetable_import_row();
create or replace function private.enforce_timetable_import_row_delete() returns trigger language plpgsql security invoker set search_path='' as $$
declare cs text; begin select state into cs from public.timetable_import_candidates where id=old.candidate_id; if not private.has_timetable_import_apply_context(old.candidate_id) and cs<>'DRAFT' then raise exception 'candidate rows mutable only in DRAFT'; end if; return old; end $$;
create trigger timetable_import_rows_enforce_delete before delete on public.timetable_import_candidate_rows for each row execute function private.enforce_timetable_import_row_delete();

-- Private capability for trusted revision bumps caused by ordinary T1 slot mutations.
create table private.timetable_revision_bump_context(backend_pid integer not null, transaction_id bigint not null, primary key(backend_pid,transaction_id));
revoke all on private.timetable_revision_bump_context from public,anon,authenticated;
create or replace function private.has_timetable_revision_bump_context() returns boolean
language sql stable security definer set search_path='' as $
 select exists(select 1 from private.timetable_revision_bump_context c where c.backend_pid=pg_backend_pid() and c.transaction_id=txid_current())
$;
revoke all on function private.has_timetable_revision_bump_context() from public,anon,authenticated;

-- Manual T1 edits bump revision; only the private capability suppresses per-row bumps during governed apply.
create or replace function private.bump_timetable_draft_revision_from_slot() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid; vs text; begin vid:=case when tg_op='DELETE' then old.timetable_version_id else new.timetable_version_id end; select status into vs from public.timetable_versions where id=vid; if vs='DRAFT' and not private.has_timetable_import_apply_context(null) then insert into private.timetable_revision_bump_context values(pg_backend_pid(),txid_current()) on conflict do nothing; update public.timetable_versions set revision=revision+1 where id=vid and status='DRAFT'; delete from private.timetable_revision_bump_context where backend_pid=pg_backend_pid() and transaction_id=txid_current(); end if; return null; end $$;
revoke all on function private.bump_timetable_draft_revision_from_slot() from public,anon,authenticated;
create trigger timetable_slots_bump_draft_revision after insert or update or delete on public.timetable_slots for each row execute function private.bump_timetable_draft_revision_from_slot();
create or replace function private.bump_timetable_draft_revision_from_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='DRAFT' and new.status='DRAFT' and (new.label is distinct from old.label or new.effective_from is distinct from old.effective_from or new.effective_to is distinct from old.effective_to or new.source_kind is distinct from old.source_kind or new.source_ref is distinct from old.source_ref) and not private.has_timetable_import_apply_context(null) then new.revision:=old.revision+1;
 elsif new.revision<>old.revision and not private.has_timetable_import_apply_context(null) and not private.has_timetable_revision_bump_context() then raise exception 'timetable revision is server controlled'; end if; return new;
end $$;
revoke all on function private.bump_timetable_draft_revision_from_version() from public,anon,authenticated;
create trigger timetable_versions_bump_revision before update on public.timetable_versions for each row execute function private.bump_timetable_draft_revision_from_version();

create or replace function public.apply_timetable_import_to_draft(p_candidate_id uuid,p_candidate_revision bigint,p_expected_draft_version_id uuid,p_expected_draft_revision bigint,p_confirmation_request_id uuid,p_operations jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ws uuid; yr uuid; st text; exp timestamptz; cr bigint; dr bigint; ds text; dg text; receipt public.timetable_import_apply_receipts%rowtype; op jsonb; k text; rk text; sid uuid; r public.timetable_import_candidate_rows%rowtype; seen_rows text[]:=array[]::text[]; destructive uuid[]:=array[]::uuid[]; kept uuid[]:=array[]::uuid[];
begin
 if uid is null then raise exception 'authentication required'; end if; if jsonb_typeof(p_operations)<>'array' then raise exception 'operations must be array'; end if;
 select workspace_id,academic_year_id,state,expires_at,revision into ws,yr,st,exp,cr from public.timetable_import_candidates where id=p_candidate_id;
 if ws is null or not private.is_workspace_member(ws) then raise exception 'candidate not accessible'; end if;
 dg:=encode(digest(convert_to(p_operations::text,'UTF8'),'sha256'),'hex');
 select * into receipt from public.timetable_import_apply_receipts where workspace_id=ws and confirmation_request_id=p_confirmation_request_id;
 if found then if receipt.candidate_id<>p_candidate_id or receipt.candidate_revision<>p_candidate_revision or receipt.draft_version_id<>p_expected_draft_version_id or receipt.expected_draft_revision<>p_expected_draft_revision or receipt.operations_digest<>dg then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if; return to_jsonb(receipt); end if;
 select revision,status into dr,ds from public.timetable_versions where id=p_expected_draft_version_id and workspace_id=ws and academic_year_id=yr for update;
 if ds is null then raise exception 'draft not found'; end if; if ds<>'DRAFT' then raise exception 'target not DRAFT'; end if; if dr<>p_expected_draft_revision then raise exception 'CONFLICT_DETECTED'; end if; if cr<>p_candidate_revision then raise exception 'candidate revision mismatch'; end if; if st<>'READY_TO_CONFIRM' then raise exception 'candidate not ready'; end if; if exp<=now() then raise exception 'candidate expired'; end if;
 insert into private.timetable_import_apply_context values(pg_backend_pid(),txid_current(),p_candidate_id);
 for op in select value from jsonb_array_elements(p_operations) loop
  k:=op->>'kind'; rk:=op->>'candidateRowId'; if k not in ('KEEP','ADD','MOVE','CHANGE','REMOVE','IGNORE') then raise exception 'unsupported operation'; end if;
  if k in ('ADD','MOVE','CHANGE','IGNORE') then if rk is null or rk=any(seen_rows) then raise exception 'DUPLICATE_CANDIDATE_OPERATION'; end if; seen_rows:=array_append(seen_rows,rk); select * into r from public.timetable_import_candidate_rows where candidate_id=p_candidate_id and candidate_revision=p_candidate_revision and row_key=rk; if not found then raise exception 'candidate row not found'; end if; end if;
  if k in ('MOVE','CHANGE','REMOVE','KEEP') then sid:=nullif(op->>'slotId','')::uuid; if sid is null then raise exception 'slot id required'; end if; if k in ('MOVE','CHANGE','REMOVE') then if sid=any(destructive) or sid=any(kept) then raise exception 'CONFLICTING_SLOT_OPERATION'; end if; destructive:=array_append(destructive,sid); else if sid=any(destructive) or sid=any(kept) then raise exception 'DUPLICATE_KEEP_OPERATION'; end if; kept:=array_append(kept,sid); end if; end if;
  if k in ('ADD','MOVE','CHANGE') then if r.review_state not in ('AUTO_RESOLVED','CONFIRMED') or r.weekday is null or r.ordinal is null or r.start_time is null or r.end_time is null or r.proposed_slot_kind is null then raise exception 'candidate row not applicable'; end if; if r.proposed_slot_kind='LESSON' and r.resolved_assignment_id is null then raise exception 'LESSON requires assignment'; end if; end if;
  if k='ADD' then insert into public.timetable_slots(timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id,ordinal,created_by) select p_expected_draft_version_id,r.weekday,r.start_time,r.end_time,r.proposed_slot_kind,r.resolved_section_id,ta.discipline_id,r.resolved_assignment_id,r.ordinal,uid from (select 1)x left join public.teaching_assignments ta on ta.id=r.resolved_assignment_id;
  elsif k in ('MOVE','CHANGE') then update public.timetable_slots s set weekday=r.weekday,start_time=r.start_time,end_time=r.end_time,slot_kind=r.proposed_slot_kind,section_id=r.resolved_section_id,discipline_id=ta.discipline_id,teaching_assignment_id=r.resolved_assignment_id,ordinal=r.ordinal from public.teaching_assignments ta where s.id=sid and s.timetable_version_id=p_expected_draft_version_id and ta.id=r.resolved_assignment_id; if not found then raise exception 'slot/assignment not found'; end if;
  elsif k='REMOVE' then if coalesce((op->>'explicitlyConfirmed')::boolean,false) is not true then raise exception 'REMOVE requires explicit confirmation'; end if; delete from public.timetable_slots where id=sid and timetable_version_id=p_expected_draft_version_id; if not found then raise exception 'slot not found'; end if;
  elsif k='KEEP' then if not exists(select 1 from public.timetable_slots where id=sid and timetable_version_id=p_expected_draft_version_id) then raise exception 'slot not found'; end if; end if;
 end loop;
 update public.timetable_versions set revision=revision+1 where id=p_expected_draft_version_id and revision=p_expected_draft_revision and status='DRAFT' returning revision into dr; if not found then raise exception 'CONFLICT_DETECTED'; end if;
 insert into public.timetable_import_apply_receipts(workspace_id,candidate_id,candidate_revision,confirmation_request_id,draft_version_id,expected_draft_revision,resulting_draft_revision,operations_digest,applied_at,applied_by) values(ws,p_candidate_id,p_candidate_revision,p_confirmation_request_id,p_expected_draft_version_id,p_expected_draft_revision,dr,dg,clock_timestamp(),uid) returning * into receipt;
 update public.timetable_import_candidates set state='APPLIED_TO_DRAFT' where id=p_candidate_id;
 delete from private.timetable_import_apply_context where backend_pid=pg_backend_pid() and transaction_id=txid_current(); return to_jsonb(receipt);
end $$;
revoke all on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) from public,anon;
grant execute on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) to authenticated;

alter table public.timetable_import_candidates enable row level security; alter table public.timetable_import_candidate_rows enable row level security; alter table public.timetable_import_apply_receipts enable row level security;
create policy timetable_import_candidates_select_member on public.timetable_import_candidates for select to authenticated using(private.is_workspace_member(workspace_id));
create policy timetable_import_candidates_insert_member on public.timetable_import_candidates for insert to authenticated with check(private.is_workspace_member(workspace_id) and created_by=(select auth.uid()) and state='DRAFT');
create policy timetable_import_candidates_update_member on public.timetable_import_candidates for update to authenticated using(private.is_workspace_member(workspace_id) and state<>'APPLIED_TO_DRAFT') with check(private.is_workspace_member(workspace_id) and state<>'APPLIED_TO_DRAFT');
create policy timetable_import_candidates_delete_member on public.timetable_import_candidates for delete to authenticated using(private.is_workspace_member(workspace_id) and state='DRAFT');
create policy timetable_import_rows_select_member on public.timetable_import_candidate_rows for select to authenticated using(exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id)));
create policy timetable_import_rows_insert_member on public.timetable_import_candidate_rows for insert to authenticated with check(exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state='DRAFT' and c.revision=candidate_revision));
create policy timetable_import_rows_update_member on public.timetable_import_candidate_rows for update to authenticated using(exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state='DRAFT')) with check(exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state='DRAFT' and c.revision=candidate_revision));
create policy timetable_import_rows_delete_member on public.timetable_import_candidate_rows for delete to authenticated using(exists(select 1 from public.timetable_import_candidates c where c.id=candidate_id and private.is_workspace_member(c.workspace_id) and c.state='DRAFT'));
create policy timetable_import_receipts_select_member on public.timetable_import_apply_receipts for select to authenticated using(private.is_workspace_member(workspace_id));
grant select,insert,update,delete on public.timetable_import_candidates to authenticated; grant select,insert,update,delete on public.timetable_import_candidate_rows to authenticated; grant select on public.timetable_import_apply_receipts to authenticated;
revoke all on public.timetable_import_candidates from anon; revoke all on public.timetable_import_candidate_rows from anon; revoke all on public.timetable_import_apply_receipts from anon;
