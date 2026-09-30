begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (80, '0080_timetable_import_creator_scoped_live_source')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- DOS-TT-IMPORT-01 / privacy-first minimized Share Target
-- A live import candidate is unique per creator. This keeps server-derived
-- derivative identity compatible with creator-scoped lookup/replacement.

drop index if exists public.timetable_import_one_live_source_uq;

create unique index timetable_import_one_live_source_creator_uq
  on public.timetable_import_candidates(
    workspace_id,
    academic_year_id,
    created_by,
    source_fingerprint
  )
  where state in ('DRAFT','READY_TO_CONFIRM');

drop policy if exists timetable_import_candidates_delete_member
  on public.timetable_import_candidates;
create policy timetable_import_candidates_delete_creator
  on public.timetable_import_candidates
  for delete
  to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
    and state <> 'APPLIED_TO_DRAFT'
  );

create or replace function public.replace_timetable_import_candidate_v1(
  p_workspace_id uuid,
  p_academic_year_id uuid,
  p_source_fingerprint text,
  p_source_label text,
  p_source_ref text,
  p_effective_from date,
  p_parser_version text,
  p_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $
declare
  uid uuid := auth.uid();
  candidate public.timetable_import_candidates%rowtype;
  row_value jsonb;
  complete boolean;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'candidate rows required';
  end if;
  if p_source_fingerprint is null
     or p_source_fingerprint !~ '^[a-f0-9]{64}
commit;
 then
    raise exception 'source fingerprint invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      uid::text || ':' || p_workspace_id::text || ':' || p_academic_year_id::text || ':' || p_source_fingerprint,
      0
    )
  );

  if exists(
    select 1
    from public.timetable_import_candidates c
    where c.workspace_id = p_workspace_id
      and c.academic_year_id = p_academic_year_id
      and c.created_by = uid
      and c.source_fingerprint = p_source_fingerprint
      and c.state = 'APPLIED_TO_DRAFT'
  ) then
    raise exception 'SOURCE_ALREADY_APPLIED';
  end if;

  delete from public.timetable_import_candidates c
  where c.workspace_id = p_workspace_id
    and c.academic_year_id = p_academic_year_id
    and c.created_by = uid
    and c.source_fingerprint = p_source_fingerprint
    and c.state in ('DRAFT','READY_TO_CONFIRM');

  insert into public.timetable_import_candidates(
    workspace_id,
    academic_year_id,
    source_fingerprint,
    source_kind,
    source_label,
    source_ref,
    effective_from_candidate,
    source_is_provisional,
    state,
    parser_version,
    created_by
  ) values (
    p_workspace_id,
    p_academic_year_id,
    p_source_fingerprint,
    'INSTITUTION_DOCUMENT',
    left(btrim(p_source_label),240),
    left(p_source_ref,1000),
    p_effective_from,
    true,
    'DRAFT',
    left(p_parser_version,160),
    uid
  )
  returning * into candidate;

  for row_value in select value from jsonb_array_elements(p_rows)
  loop
    insert into public.timetable_import_candidate_rows(
      candidate_id,
      candidate_revision,
      row_key,
      weekday,
      ordinal,
      start_time,
      end_time,
      source_class_label,
      resolved_section_id,
      resolved_assignment_id,
      proposed_slot_kind,
      confidence,
      review_state,
      evidence_ref,
      warnings
    ) values (
      candidate.id,
      candidate.revision,
      left(row_value->>'rowKey',160),
      nullif(row_value->>'weekday','')::smallint,
      nullif(row_value->>'ordinal','')::smallint,
      nullif(row_value->>'startTime','')::time,
      nullif(row_value->>'endTime','')::time,
      left(coalesce(row_value->>'sourceClassLabel',''),120),
      nullif(row_value->>'resolvedSectionId','')::uuid,
      nullif(row_value->>'resolvedAssignmentId','')::uuid,
      'LESSON',
      row_value->>'confidence',
      row_value->>'reviewState',
      nullif(row_value->>'evidenceRef',''),
      coalesce(row_value->'warnings','[]'::jsonb)
    );
  end loop;

  select not exists(
    select 1
    from public.timetable_import_candidate_rows r
    where r.candidate_id = candidate.id
      and r.candidate_revision = candidate.revision
      and (
        r.weekday is null
        or r.ordinal is null
        or r.start_time is null
        or r.end_time is null
        or r.resolved_assignment_id is null
        or r.proposed_slot_kind <> 'LESSON'
        or r.review_state not in ('AUTO_RESOLVED','CONFIRMED')
      )
  ) into complete;

  if complete then
    update public.timetable_import_candidates
    set state = 'READY_TO_CONFIRM'
    where id = candidate.id
    returning * into candidate;
  end if;

  return to_jsonb(candidate);
end
$;

revoke all on function public.replace_timetable_import_candidate_v1(
  uuid,uuid,text,text,text,date,text,jsonb
) from public, anon;
grant execute on function public.replace_timetable_import_candidate_v1(
  uuid,uuid,text,text,text,date,text,jsonb
) to authenticated;

comment on function public.replace_timetable_import_candidate_v1(
  uuid,uuid,text,text,text,date,text,jsonb
) is
  'Atomically retires the current creator-owned live candidate and creates, populates and conditionally promotes its replacement. Any failure rolls back the prior candidate deletion.';

select private.advance_runtime_schema_contract('0080_timetable_import_creator_scoped_live_source');

commit;
