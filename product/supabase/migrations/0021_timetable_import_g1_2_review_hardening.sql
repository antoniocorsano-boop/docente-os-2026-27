-- DOS-TT-IMPORT-01 / G1.2 review hardening
-- Addresses independent review findings without changing the governed scope.

alter table public.timetable_import_candidate_rows
  drop constraint if exists timetable_import_candidate_rows_proposed_slot_kind_check;

alter table public.timetable_import_candidate_rows
  add constraint timetable_import_candidate_rows_proposed_slot_kind_check
  check (proposed_slot_kind is null or proposed_slot_kind in ('LESSON','CLASS_PRESENCE','DISPOSITION','RECEPTION','OTHER'));

alter table public.timetable_import_candidate_rows
  add column if not exists proposed_manual_class_label text null,
  add column if not exists proposed_presence_kind text null;

alter table public.timetable_import_candidate_rows
  add constraint timetable_import_candidate_rows_presence_ck check (
    (proposed_slot_kind = 'CLASS_PRESENCE'
      and proposed_manual_class_label is not null
      and char_length(btrim(proposed_manual_class_label)) between 1 and 12
      and proposed_presence_kind in ('SUBSTITUTION','CO_TEACHING','SUPERVISION','PROJECT','OTHER'))
    or (proposed_slot_kind is distinct from 'CLASS_PRESENCE'
      and proposed_manual_class_label is null
      and proposed_presence_kind is null)
  );

create or replace function public.apply_timetable_import_to_draft(
  p_candidate_id uuid,
  p_candidate_revision bigint,
  p_expected_draft_version_id uuid,
  p_expected_draft_revision bigint,
  p_confirmation_request_id uuid,
  p_operations jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=auth.uid(); ws uuid; yr uuid; st text; exp timestamptz; cr bigint;
  dr bigint; ds text; dg text; receipt public.timetable_import_apply_receipts%rowtype;
  op jsonb; k text; rk text; sid uuid; r public.timetable_import_candidate_rows%rowtype;
  seen_rows text[]:=array[]::text[]; destructive uuid[]:=array[]::uuid[]; kept uuid[]:=array[]::uuid[];
  candidate_row_count bigint;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_operations)<>'array' then raise exception 'operations must be array'; end if;

  select workspace_id,academic_year_id,state,expires_at,revision
    into ws,yr,st,exp,cr from public.timetable_import_candidates where id=p_candidate_id;
  if ws is null or not private.is_workspace_member(ws) then raise exception 'candidate not accessible'; end if;

  dg:=encode(digest(convert_to(p_operations::text,'UTF8'),'sha256'),'hex');

  -- Serialize all attempts for the same workspace/idempotency key before receipt lookup.
  perform pg_advisory_xact_lock(hashtextextended(ws::text || ':' || p_confirmation_request_id::text, 0));
  select * into receipt from public.timetable_import_apply_receipts
    where workspace_id=ws and confirmation_request_id=p_confirmation_request_id;
  if found then
    if receipt.candidate_id<>p_candidate_id
      or receipt.candidate_revision<>p_candidate_revision
      or receipt.draft_version_id<>p_expected_draft_version_id
      or receipt.expected_draft_revision<>p_expected_draft_revision
      or receipt.operations_digest<>dg then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return to_jsonb(receipt);
  end if;

  select revision,status into dr,ds from public.timetable_versions
    where id=p_expected_draft_version_id and workspace_id=ws and academic_year_id=yr for update;
  if ds is null then raise exception 'draft not found'; end if;
  if ds<>'DRAFT' then raise exception 'target not DRAFT'; end if;
  if dr<>p_expected_draft_revision then raise exception 'CONFLICT_DETECTED'; end if;
  if cr<>p_candidate_revision then raise exception 'candidate revision mismatch'; end if;
  if st<>'READY_TO_CONFIRM' then raise exception 'candidate not ready'; end if;
  if exp<=now() then raise exception 'candidate expired'; end if;

  insert into private.timetable_import_apply_context values(pg_backend_pid(),txid_current(),p_candidate_id);

  for op in select value from jsonb_array_elements(p_operations) loop
    k:=op->>'kind'; rk:=op->>'candidateRowId';
    if k not in('KEEP','ADD','MOVE','CHANGE','REMOVE','IGNORE') then raise exception 'unsupported operation'; end if;

    if k in('ADD','MOVE','CHANGE','IGNORE') then
      if rk is null or rk=any(seen_rows) then raise exception 'DUPLICATE_CANDIDATE_OPERATION'; end if;
      seen_rows:=array_append(seen_rows,rk);
      select * into r from public.timetable_import_candidate_rows
        where candidate_id=p_candidate_id and candidate_revision=p_candidate_revision and row_key=rk;
      if not found then raise exception 'candidate row not found'; end if;
    end if;

    if k in('MOVE','CHANGE','REMOVE','KEEP') then
      sid:=nullif(op->>'slotId','')::uuid;
      if sid is null then raise exception 'slot id required'; end if;
      if k in('MOVE','CHANGE','REMOVE') then
        if sid=any(destructive) or sid=any(kept) then raise exception 'CONFLICTING_SLOT_OPERATION'; end if;
        destructive:=array_append(destructive,sid);
      else
        if sid=any(destructive) or sid=any(kept) then raise exception 'DUPLICATE_KEEP_OPERATION'; end if;
        kept:=array_append(kept,sid);
      end if;
    end if;

    if k in('ADD','MOVE','CHANGE') then
      if r.review_state not in('AUTO_RESOLVED','CONFIRMED') or r.weekday is null or r.ordinal is null
        or r.start_time is null or r.end_time is null or r.proposed_slot_kind is null then
        raise exception 'candidate row not applicable';
      end if;
      if r.proposed_slot_kind='LESSON' and r.resolved_assignment_id is null then raise exception 'LESSON requires assignment'; end if;
      if r.proposed_slot_kind='CLASS_PRESENCE'
        and (r.proposed_manual_class_label is null or r.proposed_presence_kind is null) then
        raise exception 'CLASS_PRESENCE requires class label and presence kind';
      end if;
    end if;

    if k='ADD' then
      insert into public.timetable_slots(
        timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,
        teaching_assignment_id,manual_class_label,presence_kind,ordinal,created_by)
      values(
        p_expected_draft_version_id,r.weekday,r.start_time,r.end_time,r.proposed_slot_kind,
        case when r.proposed_slot_kind='LESSON' then r.resolved_section_id else null end,
        case when r.proposed_slot_kind='LESSON' then (select ta.discipline_id from public.teaching_assignments ta where ta.id=r.resolved_assignment_id) else null end,
        case when r.proposed_slot_kind='LESSON' then r.resolved_assignment_id else null end,
        case when r.proposed_slot_kind='CLASS_PRESENCE' then r.proposed_manual_class_label else null end,
        case when r.proposed_slot_kind='CLASS_PRESENCE' then r.proposed_presence_kind else null end,
        r.ordinal,uid);
    elsif k in('MOVE','CHANGE') then
      update public.timetable_slots s set
        weekday=r.weekday,start_time=r.start_time,end_time=r.end_time,slot_kind=r.proposed_slot_kind,
        section_id=case when r.proposed_slot_kind='LESSON' then r.resolved_section_id else null end,
        discipline_id=case when r.proposed_slot_kind='LESSON' then (select ta.discipline_id from public.teaching_assignments ta where ta.id=r.resolved_assignment_id) else null end,
        teaching_assignment_id=case when r.proposed_slot_kind='LESSON' then r.resolved_assignment_id else null end,
        manual_class_label=case when r.proposed_slot_kind='CLASS_PRESENCE' then r.proposed_manual_class_label else null end,
        presence_kind=case when r.proposed_slot_kind='CLASS_PRESENCE' then r.proposed_presence_kind else null end,
        ordinal=r.ordinal
      where s.id=sid and s.timetable_version_id=p_expected_draft_version_id;
      if not found then raise exception 'slot not found'; end if;
    elsif k='REMOVE' then
      if coalesce((op->>'explicitlyConfirmed')::boolean,false) is not true then raise exception 'REMOVE requires explicit confirmation'; end if;
      delete from public.timetable_slots where id=sid and timetable_version_id=p_expected_draft_version_id;
      if not found then raise exception 'slot not found'; end if;
    elsif k='KEEP' then
      if not exists(select 1 from public.timetable_slots where id=sid and timetable_version_id=p_expected_draft_version_id) then
        raise exception 'slot not found';
      end if;
    end if;
  end loop;

  -- Every candidate row must have one explicit disposition before finalization.
  select count(*) into candidate_row_count from public.timetable_import_candidate_rows
    where candidate_id=p_candidate_id and candidate_revision=p_candidate_revision;
  if cardinality(seen_rows)<>candidate_row_count then raise exception 'INCOMPLETE_CANDIDATE_PLAN'; end if;

  update public.timetable_versions set revision=revision+1
    where id=p_expected_draft_version_id and revision=p_expected_draft_revision and status='DRAFT'
    returning revision into dr;
  if not found then raise exception 'CONFLICT_DETECTED'; end if;

  insert into public.timetable_import_apply_receipts(
    workspace_id,candidate_id,candidate_revision,confirmation_request_id,draft_version_id,
    expected_draft_revision,resulting_draft_revision,operations_digest,applied_at,applied_by)
  values(ws,p_candidate_id,p_candidate_revision,p_confirmation_request_id,p_expected_draft_version_id,
    p_expected_draft_revision,dr,dg,clock_timestamp(),uid) returning * into receipt;

  update public.timetable_import_candidates set state='APPLIED_TO_DRAFT' where id=p_candidate_id;
  delete from private.timetable_import_apply_context where backend_pid=pg_backend_pid() and transaction_id=txid_current();
  return to_jsonb(receipt);
end $$;

revoke all on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) from public,anon;
grant execute on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) to authenticated;
