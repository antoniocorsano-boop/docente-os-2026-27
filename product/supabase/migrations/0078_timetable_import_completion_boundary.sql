begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (78, '0078_timetable_import_completion_boundary')
on conflict (version) do update
set migration_id = excluded.migration_id;

alter table public.timetable_import_candidates
  add column if not exists source_scope text not null default 'UNKNOWN'
  check (source_scope in ('UNKNOWN','TEACHER_COMPLETE'));

create or replace function private.timetable_draft_revision_token(
  p_version_id uuid,
  p_revision bigint
) returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select 'TTDR-1|' || char_length(p_version_id::text)::text || ':' || p_version_id::text
    || '|' || char_length(p_revision::text)::text || ':' || p_revision::text
$$;

revoke all on function private.timetable_draft_revision_token(uuid,bigint)
  from public, anon, authenticated;

create or replace function public.read_timetable_draft_revision_token(
  p_version_id uuid
) returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  st text;
  rev bigint;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  select workspace_id,status,revision
    into ws,st,rev
  from public.timetable_versions
  where id=p_version_id;

  if ws is null or not private.is_workspace_member(ws) then
    raise exception 'draft not accessible';
  end if;
  if st<>'DRAFT' then
    raise exception 'target not DRAFT';
  end if;

  return private.timetable_draft_revision_token(p_version_id,rev);
end
$$;

revoke all on function public.read_timetable_draft_revision_token(uuid)
  from public, anon;
grant execute on function public.read_timetable_draft_revision_token(uuid)
  to authenticated;

create or replace function public.apply_confirmed_timetable_import_v1(
  p_candidate_id uuid,
  p_candidate_revision text,
  p_expected_draft_version_id uuid,
  p_expected_draft_token text,
  p_confirmation_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  yr uuid;
  candidate_state text;
  candidate_scope text;
  candidate_exp timestamptz;
  candidate_revision bigint;
  candidate_effective_from date;
  candidate_source_ref text;
  candidate_source_label text;
  actual_candidate_revision bigint;
  draft_revision bigint;
  draft_status text;
  expected_token text;
  digest_text text;
  receipt public.timetable_import_apply_receipts%rowtype;
  row_count bigint;
  invalid_count bigint;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  if p_candidate_revision is null or p_candidate_revision !~ '^(0|[1-9][0-9]*)$' then
    raise exception 'candidate revision invalid';
  end if;
  candidate_revision := p_candidate_revision::bigint;

  select workspace_id,academic_year_id,state,source_scope,expires_at,revision,
         effective_from_candidate,source_ref,source_label
    into ws,yr,candidate_state,candidate_scope,candidate_exp,actual_candidate_revision,
         candidate_effective_from,candidate_source_ref,candidate_source_label
  from public.timetable_import_candidates
  where id=p_candidate_id
  for update;

  if ws is null or not private.is_workspace_member(ws) then
    raise exception 'candidate not accessible';
  end if;
  if actual_candidate_revision<>candidate_revision then
    raise exception 'candidate revision mismatch';
  end if;
  if candidate_state<>'READY_TO_CONFIRM' then
    raise exception 'candidate not ready';
  end if;
  if candidate_scope<>'TEACHER_COMPLETE' then
    raise exception 'candidate source is not teacher-complete';
  end if;
  if candidate_exp<=now() then
    raise exception 'candidate expired';
  end if;
  if candidate_effective_from is null then
    raise exception 'candidate effective date required';
  end if;

  select count(*),
         count(*) filter (
           where review_state not in ('AUTO_RESOLVED','CONFIRMED')
              or weekday is null
              or ordinal is null
              or start_time is null
              or end_time is null
              or proposed_slot_kind<>'LESSON'
              or resolved_assignment_id is null
         )
    into row_count,invalid_count
  from public.timetable_import_candidate_rows
  where candidate_id=p_candidate_id
    and candidate_revision=candidate_revision;

  if row_count=0 then
    raise exception 'candidate has no rows';
  end if;
  if invalid_count<>0 then
    raise exception 'candidate rows incomplete';
  end if;

  select encode(
    digest(
      convert_to(
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'rowKey',row_key,
              'weekday',weekday,
              'ordinal',ordinal,
              'startTime',start_time::text,
              'endTime',end_time::text,
              'assignmentId',resolved_assignment_id::text,
              'reviewState',review_state
            )
            order by row_key
          )::text
          from public.timetable_import_candidate_rows
          where candidate_id=p_candidate_id
            and candidate_revision=candidate_revision
        ),'[]'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) into digest_text;

  perform pg_advisory_xact_lock(
    hashtextextended(ws::text || ':' || p_confirmation_request_id::text,0)
  );

  select *
    into receipt
  from public.timetable_import_apply_receipts
  where workspace_id=ws
    and confirmation_request_id=p_confirmation_request_id;

  if found then
    expected_token := private.timetable_draft_revision_token(
      receipt.draft_version_id,
      receipt.expected_draft_revision
    );
    if receipt.candidate_id<>p_candidate_id
      or receipt.candidate_revision<>candidate_revision
      or receipt.draft_version_id<>p_expected_draft_version_id
      or receipt.operations_digest<>digest_text
      or expected_token<>p_expected_draft_token then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return to_jsonb(receipt);
  end if;

  select revision,status
    into draft_revision,draft_status
  from public.timetable_versions
  where id=p_expected_draft_version_id
    and workspace_id=ws
    and academic_year_id=yr
  for update;

  if draft_status is null then
    raise exception 'draft not found';
  end if;
  if draft_status<>'DRAFT' then
    raise exception 'target not DRAFT';
  end if;

  expected_token := private.timetable_draft_revision_token(
    p_expected_draft_version_id,
    draft_revision
  );
  if expected_token<>p_expected_draft_token then
    raise exception 'CONFLICT_DETECTED';
  end if;

  insert into private.timetable_import_apply_context(
    backend_pid,transaction_id,candidate_id
  ) values(
    pg_backend_pid(),txid_current(),p_candidate_id
  )
  on conflict(backend_pid,transaction_id)
  do update set candidate_id=excluded.candidate_id;

  delete from public.timetable_slots
  where timetable_version_id=p_expected_draft_version_id
    and slot_kind='LESSON';

  insert into public.timetable_slots(
    timetable_version_id,
    weekday,
    start_time,
    end_time,
    slot_kind,
    section_id,
    discipline_id,
    teaching_assignment_id,
    ordinal,
    created_by
  )
  select
    p_expected_draft_version_id,
    r.weekday,
    r.start_time,
    r.end_time,
    'LESSON',
    a.section_id,
    a.discipline_id,
    a.id,
    r.ordinal,
    uid
  from public.timetable_import_candidate_rows r
  join public.teaching_assignments a
    on a.id=r.resolved_assignment_id
   and a.workspace_id=ws
   and a.academic_year_id=yr
  where r.candidate_id=p_candidate_id
    and r.candidate_revision=candidate_revision
  order by r.weekday,r.ordinal,r.row_key;

  if (select count(*) from public.timetable_slots
      where timetable_version_id=p_expected_draft_version_id
        and slot_kind='LESSON')<>row_count then
    raise exception 'candidate assignment materialization mismatch';
  end if;

  update public.timetable_versions
  set
    label=left('Orario · ' || candidate_source_label,160),
    effective_from=candidate_effective_from,
    source_kind='IMPORT',
    source_ref=candidate_source_ref,
    revision=revision+1
  where id=p_expected_draft_version_id
    and revision=draft_revision
    and status='DRAFT'
  returning revision into draft_revision;

  if not found then
    raise exception 'CONFLICT_DETECTED';
  end if;

  insert into public.timetable_import_apply_receipts(
    workspace_id,
    candidate_id,
    candidate_revision,
    confirmation_request_id,
    draft_version_id,
    expected_draft_revision,
    resulting_draft_revision,
    operations_digest,
    applied_at,
    applied_by
  ) values(
    ws,
    p_candidate_id,
    candidate_revision,
    p_confirmation_request_id,
    p_expected_draft_version_id,
    draft_revision-1,
    draft_revision,
    digest_text,
    clock_timestamp(),
    uid
  )
  returning * into receipt;

  update public.timetable_import_candidates
  set state='APPLIED_TO_DRAFT'
  where id=p_candidate_id;

  delete from private.timetable_import_apply_context
  where backend_pid=pg_backend_pid()
    and transaction_id=txid_current();

  return to_jsonb(receipt);
end
$$;

revoke all on function public.apply_confirmed_timetable_import_v1(uuid,text,uuid,text,uuid)
  from public, anon;
grant execute on function public.apply_confirmed_timetable_import_v1(uuid,text,uuid,text,uuid)
  to authenticated;

comment on function public.apply_confirmed_timetable_import_v1(uuid,text,uuid,text,uuid) is
  'DOS-TT-IMPORT-01 completion boundary. Atomically replaces only DRAFT LESSON slots from a human-confirmed TEACHER_COMPLETE candidate. Never activates the timetable or replans lessons.';

select private.advance_runtime_schema_contract('0078_timetable_import_completion_boundary');

commit;
