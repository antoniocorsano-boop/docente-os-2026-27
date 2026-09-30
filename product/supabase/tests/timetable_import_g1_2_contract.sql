-- DOS-TT-IMPORT-01 / G1.2 DB contract
-- Executed only against an isolated disposable database after repository migrations.
-- 35 governed assertions. Rolls back all fixtures.

begin;

create or replace function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'G1.2 FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;

select pg_temp.assert_true((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='timetable_import_candidates'),'01 candidate RLS enabled');
select pg_temp.assert_true((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='timetable_import_candidate_rows'),'02 row RLS enabled');
select pg_temp.assert_true((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='timetable_import_apply_receipts'),'03 receipt RLS enabled');
select pg_temp.assert_true(not has_table_privilege('anon','public.timetable_import_candidates','SELECT'),'04 anon candidate access denied');
select pg_temp.assert_true(not has_table_privilege('anon','public.timetable_import_candidate_rows','SELECT'),'05 anon row access denied');
select pg_temp.assert_true(not has_table_privilege('anon','public.timetable_import_apply_receipts','SELECT'),'06 anon receipt access denied');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.timetable_import_apply_receipts','INSERT') and not has_table_privilege('authenticated','public.timetable_import_apply_receipts','UPDATE') and not has_table_privilege('authenticated','public.timetable_import_apply_receipts','DELETE'),'07 receipt writes denied to client');
select pg_temp.assert_true(not has_table_privilege('authenticated','private.timetable_import_apply_context','INSERT') and not has_table_privilege('authenticated','private.timetable_revision_bump_context','INSERT'),'08 private bump/apply capabilities non-forgeable');
select pg_temp.assert_true(not has_function_privilege('authenticated','private.has_timetable_import_apply_context(uuid)','EXECUTE') and not has_function_privilege('authenticated','private.has_timetable_revision_bump_context()','EXECUTE'),'09 private capability functions not executable by client');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)','EXECUTE'),'10 legacy apply RPC quarantined from authenticated');
select pg_temp.assert_true(to_regprocedure('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)') is not null,'10b legacy apply RPC retained but non-executable by client');
select pg_temp.assert_true(exists(select 1 from information_schema.columns where table_schema='public' and table_name='timetable_versions' and column_name='revision' and data_type='bigint'),'11 DRAFT monotonic revision materialized');
select pg_temp.assert_true(not exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('timetable_import_candidates','timetable_import_candidate_rows','timetable_import_apply_receipts') and column_name='source_teacher_label'),'12 teacher source label is not persisted');
select pg_temp.assert_true(exists(select 1 from pg_indexes where schemaname='public' and indexname='timetable_import_one_live_source_uq' and indexdef ilike '%workspace_id%' and indexdef ilike '%academic_year_id%' and indexdef ilike '%source_fingerprint%' and indexdef not ilike '%created_by%' and indexdef ilike '%WHERE%'),'13 live-source uniqueness is partial and preserves canonical workspace/year/source identity');
select pg_temp.assert_true(exists(select 1 from pg_policies where schemaname='public' and tablename='timetable_import_candidates' and policyname='timetable_import_candidates_delete_member' and qual ilike '%is_workspace_member%'),'13b candidate delete remains workspace-member scoped as qualified by G1.2');
select pg_temp.assert_true(to_regprocedure('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)') is not null,'13c atomic candidate replacement RPC installed');
select pg_temp.assert_true((select prosecdef from pg_proc where oid='public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure),'13d atomic replacement RPC is SECURITY DEFINER');
select pg_temp.assert_true(pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%pg_advisory_xact_lock%' and pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%revision = c.revision + 1%' and pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%where c.id = candidate.id%','13e correction is serialized and increments revision on the same candidate id');
select pg_temp.assert_true(pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%set state = ''EXPIRED''%' and pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%expires_at <= now()%' and pg_get_functiondef('public.replace_timetable_import_candidate_v1(uuid,uuid,text,text,text,date,text,jsonb)'::regprocedure) ilike '%expires_at > now()%','13f expired live candidates are retired before selecting a reusable candidate');
select pg_temp.assert_true(exists(select 1 from pg_constraint where conrelid='public.timetable_import_candidate_rows'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%candidate_id%candidate_revision%row_key%'),'14 row identity binds candidate revision');
select pg_temp.assert_true(exists(select 1 from pg_constraint where conrelid='public.timetable_import_apply_receipts'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%workspace_id%confirmation_request_id%'),'15 idempotency receipt key materialized');
select pg_temp.assert_true((select prosecdef from pg_proc where oid='public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure),'16 apply is SECURITY DEFINER');
select pg_temp.assert_true((select proconfig @> array['search_path=""'] from pg_proc where oid='public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure),'17 apply fixes empty search_path');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_slots'::regclass and tgname='timetable_slots_bump_draft_revision' and not tgisinternal),'18 manual slot bump trigger installed');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_versions'::regclass and tgname='timetable_versions_bump_revision' and not tgisinternal),'19 direct revision guard installed');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_import_candidate_rows'::regclass and tgname='timetable_import_rows_enforce_delete' and not tgisinternal),'20 candidate-row lifecycle guard installed');

select pg_temp.assert_true(exists(select 1 from information_schema.columns where table_schema='public' and table_name='timetable_import_candidate_rows' and column_name='proposed_manual_class_label') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='timetable_import_candidate_rows' and column_name='proposed_presence_kind'),'21 CLASS_PRESENCE candidate fields materialized');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%INCOMPLETE_CANDIDATE_PLAN%','22 incomplete candidate plan is rejected');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%pg_advisory_xact_lock%','23 duplicate confirmation attempts are serialized');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%proposed_slot_kind=''CLASS_PRESENCE''%' and pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) not ilike '%from public.teaching_assignments ta where s.id=sid%','24 CLASS_PRESENCE and assignment-independent non-lesson update path installed');

-- G1.6-J behavioral evidence: exercise the real revision triggers on disposable fixtures.
insert into auth.users(id,email)
values ('00000000-0000-0000-0000-00000000a624','g16j@example.invalid');

insert into public.workspaces(id,kind,name,owner_user_id)
values ('00000000-0000-0000-0000-00000000b624','PERSONAL','G1.6-J revision fixture','00000000-0000-0000-0000-00000000a624');

insert into public.academic_years(id,workspace_id,label,starts_on,ends_on,is_active)
values ('00000000-0000-0000-0000-00000000c624','00000000-0000-0000-0000-00000000b624','G1.6-J 2026/27','2026-09-01','2027-08-31',false);

insert into public.timetable_versions(id,workspace_id,academic_year_id,label,status,effective_from,created_by)
values ('00000000-0000-0000-0000-00000000d624','00000000-0000-0000-0000-00000000b624','00000000-0000-0000-0000-00000000c624','Fixture','DRAFT','2026-09-28','00000000-0000-0000-0000-00000000a624');

update public.timetable_versions
set label='Fixture updated'
where id='00000000-0000-0000-0000-00000000d624';

select pg_temp.assert_true(
  (select revision from public.timetable_versions where id='00000000-0000-0000-0000-00000000d624')=1,
  '25 relevant DRAFT metadata update increments revision'
);

update public.timetable_versions
set label='Fixture updated'
where id='00000000-0000-0000-0000-00000000d624';

select pg_temp.assert_true(
  (select revision from public.timetable_versions where id='00000000-0000-0000-0000-00000000d624')=1,
  '26 no-op DRAFT metadata update does not increment revision'
);

insert into public.timetable_slots(
  id,timetable_version_id,weekday,start_time,end_time,slot_kind,ordinal,created_by
) values (
  '00000000-0000-0000-0000-00000000e624',
  '00000000-0000-0000-0000-00000000d624',
  1,'08:00','09:00','OTHER',1,'00000000-0000-0000-0000-00000000a624'
);

select pg_temp.assert_true(
  (select revision from public.timetable_versions where id='00000000-0000-0000-0000-00000000d624')=2,
  '27 slot INSERT increments DRAFT revision'
);

update public.timetable_slots
set note='behavioral revision proof'
where id='00000000-0000-0000-0000-00000000e624';

select pg_temp.assert_true(
  (select revision from public.timetable_versions where id='00000000-0000-0000-0000-00000000d624')=3,
  '28 slot UPDATE increments DRAFT revision'
);

delete from public.timetable_slots
where id='00000000-0000-0000-0000-00000000e624';

select pg_temp.assert_true(
  (select revision from public.timetable_versions where id='00000000-0000-0000-0000-00000000d624')=4,
  '29 slot DELETE increments DRAFT revision'
);

-- G1.2 behavioral evidence for the same-source candidate revision RPC.
insert into public.teaching_disciplines(
  id,workspace_id,academic_year_id,name,is_active,created_by
) values (
  '00000000-0000-0000-0000-00000000f624',
  '00000000-0000-0000-0000-00000000b624',
  '00000000-0000-0000-0000-00000000c624',
  'Tecnologia',true,
  '00000000-0000-0000-0000-00000000a624'
);

insert into public.annual_plan_sections(
  id,workspace_id,academic_year_id,grade,section_code,status,created_by
) values (
  '00000000-0000-0000-0000-00000000a625',
  '00000000-0000-0000-0000-00000000b624',
  '00000000-0000-0000-0000-00000000c624',
  'SECONDA','C','DA_CONFERMARE',
  '00000000-0000-0000-0000-00000000a624'
);

insert into public.teaching_assignments(
  id,workspace_id,academic_year_id,section_id,discipline_id,weekly_minutes,status,created_by
) values (
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000b624',
  '00000000-0000-0000-0000-00000000c624',
  '00000000-0000-0000-0000-00000000a625',
  '00000000-0000-0000-0000-00000000f624',
  120,'CONFIRMED',
  '00000000-0000-0000-0000-00000000a624'
);

insert into public.workspace_memberships(workspace_id,user_id,role)
values (
  '00000000-0000-0000-0000-00000000b624',
  '00000000-0000-0000-0000-00000000a624',
  'OWNER'
);

create temporary table g12_replace_probe(
  first_id uuid,
  current_id uuid
) on commit drop;

create or replace function pg_temp.expect_replace_failure() returns void
language plpgsql
as $expect$
begin
  perform public.replace_timetable_import_candidate_v1(
    '00000000-0000-0000-0000-00000000b624',
    '00000000-0000-0000-0000-00000000c624',
    repeat('a',64),
    'Broken fixture',
    'client-whole-document-sha256:' || repeat('a',64),
    '2026-09-28',
    'fixture@broken',
    jsonb_build_array(jsonb_build_object(
      'rowKey','broken',
      'weekday',9,
      'ordinal',1,
      'startTime','08:00',
      'endTime','09:00',
      'sourceClassLabel','2C',
      'resolvedSectionId','00000000-0000-0000-0000-00000000a625',
      'resolvedAssignmentId','00000000-0000-0000-0000-00000000b625',
      'confidence','HIGH',
      'reviewState','AUTO_RESOLVED',
      'warnings',jsonb_build_array()
    ))
  );
  raise exception 'EXPECTED_REPLACEMENT_FAILURE_MISSING';
exception
  when check_violation then
    null;
end
$expect$;

create or replace function pg_temp.expect_already_applied() returns void
language plpgsql
as $applied$
begin
  perform public.replace_timetable_import_candidate_v1(
    '00000000-0000-0000-0000-00000000b624',
    '00000000-0000-0000-0000-00000000c624',
    repeat('a',64),
    'Must be rejected',
    'client-whole-document-sha256:' || repeat('a',64),
    '2026-09-28',
    'fixture@reimport',
    jsonb_build_array(jsonb_build_object(
      'rowKey','r-applied',
      'weekday',4,
      'ordinal',4,
      'startTime','11:00',
      'endTime','12:00',
      'sourceClassLabel','2C',
      'resolvedSectionId','00000000-0000-0000-0000-00000000a625',
      'resolvedAssignmentId','00000000-0000-0000-0000-00000000b625',
      'confidence','HIGH',
      'reviewState','AUTO_RESOLVED',
      'warnings',jsonb_build_array()
    ))
  );
  raise exception 'EXPECTED_ALREADY_APPLIED_MISSING';
exception
  when others then
    if sqlerrm <> 'SOURCE_ALREADY_APPLIED' then
      raise;
    end if;
end
$applied$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a624","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

with result as (
  select public.replace_timetable_import_candidate_v1(
    '00000000-0000-0000-0000-00000000b624',
    '00000000-0000-0000-0000-00000000c624',
    repeat('a',64),
    'Fixture import',
    'client-whole-document-sha256:' || repeat('a',64),
    '2026-09-28',
    'fixture@1',
    jsonb_build_array(jsonb_build_object(
      'rowKey','r1',
      'weekday',1,
      'ordinal',1,
      'startTime','08:00',
      'endTime','09:00',
      'sourceClassLabel','2C',
      'resolvedSectionId','00000000-0000-0000-0000-00000000a625',
      'resolvedAssignmentId','00000000-0000-0000-0000-00000000b625',
      'confidence','HIGH',
      'reviewState','AUTO_RESOLVED',
      'evidenceRef','fixture:r1',
      'warnings',jsonb_build_array()
    ))
  ) as payload
)
insert into g12_replace_probe(first_id,current_id)
select (payload->>'id')::uuid,(payload->>'id')::uuid from result;

select pg_temp.assert_true(
  (select revision from public.timetable_import_candidates where id=(select first_id from g12_replace_probe))=1
  and (select state from public.timetable_import_candidates where id=(select first_id from g12_replace_probe))='READY_TO_CONFIRM',
  '30 first atomic replacement creates READY candidate at revision 1'
);

with result as (
  select public.replace_timetable_import_candidate_v1(
    '00000000-0000-0000-0000-00000000b624',
    '00000000-0000-0000-0000-00000000c624',
    repeat('a',64),
    'Fixture import corrected',
    'client-whole-document-sha256:' || repeat('a',64),
    '2026-09-28',
    'fixture@2',
    jsonb_build_array(jsonb_build_object(
      'rowKey','r1',
      'weekday',2,
      'ordinal',2,
      'startTime','09:00',
      'endTime','10:00',
      'sourceClassLabel','2C',
      'resolvedSectionId','00000000-0000-0000-0000-00000000a625',
      'resolvedAssignmentId','00000000-0000-0000-0000-00000000b625',
      'confidence','HIGH',
      'reviewState','AUTO_RESOLVED',
      'evidenceRef','fixture:r1-v2',
      'warnings',jsonb_build_array()
    ))
  ) as payload
)
update g12_replace_probe set current_id=(select (payload->>'id')::uuid from result);

select pg_temp.assert_true(
  (select current_id=first_id from g12_replace_probe)
  and (select revision from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))=2
  and (select state from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))='READY_TO_CONFIRM',
  '31 same source keeps candidate id and increments exactly one revision'
);

select pg_temp.assert_true(
  (select count(*) from public.timetable_import_candidate_rows where candidate_id=(select current_id from g12_replace_probe))=1
  and (select min(candidate_revision) from public.timetable_import_candidate_rows where candidate_id=(select current_id from g12_replace_probe))=2,
  '32 replacement rows bind exactly to the new candidate revision'
);

select pg_temp.expect_replace_failure();

select pg_temp.assert_true(
  (select revision from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))=2
  and (select state from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))='READY_TO_CONFIRM'
  and (select count(*) from public.timetable_import_candidate_rows where candidate_id=(select current_id from g12_replace_probe) and candidate_revision=2)=1,
  '33 failed replacement rolls back candidate revision and rows'
);

update public.timetable_import_candidates
set expires_at=now()-interval '1 minute'
where id=(select current_id from g12_replace_probe);

with result as (
  select public.replace_timetable_import_candidate_v1(
    '00000000-0000-0000-0000-00000000b624',
    '00000000-0000-0000-0000-00000000c624',
    repeat('a',64),
    'Fixture after expiry',
    'client-whole-document-sha256:' || repeat('a',64),
    '2026-09-28',
    'fixture@3',
    jsonb_build_array(jsonb_build_object(
      'rowKey','r1',
      'weekday',3,
      'ordinal',3,
      'startTime','10:00',
      'endTime','11:00',
      'sourceClassLabel','2C',
      'resolvedSectionId','00000000-0000-0000-0000-00000000a625',
      'resolvedAssignmentId','00000000-0000-0000-0000-00000000b625',
      'confidence','HIGH',
      'reviewState','AUTO_RESOLVED',
      'evidenceRef','fixture:r1-v3',
      'warnings',jsonb_build_array()
    ))
  ) as payload
)
update g12_replace_probe set current_id=(select (payload->>'id')::uuid from result);

select pg_temp.assert_true(
  (select state from public.timetable_import_candidates where id=(select first_id from g12_replace_probe))='EXPIRED'
  and (select current_id<>first_id from g12_replace_probe)
  and (select revision from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))=1
  and (select state from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))='READY_TO_CONFIRM',
  '34 expired live candidate is retired and replaced by a usable revision-1 candidate'
);

reset role;
insert into private.timetable_import_apply_context(
  backend_pid,transaction_id,candidate_id
) values (
  pg_backend_pid(),txid_current(),(select current_id from g12_replace_probe)
)
on conflict (backend_pid,transaction_id)
do update set candidate_id=excluded.candidate_id;

update public.timetable_import_candidates
set state='APPLIED_TO_DRAFT'
where id=(select current_id from g12_replace_probe);

delete from private.timetable_import_apply_context
where backend_pid=pg_backend_pid()
  and transaction_id=txid_current();

set local role authenticated;
select pg_temp.expect_already_applied();

select pg_temp.assert_true(
  (select count(*) from public.timetable_import_candidates
   where workspace_id='00000000-0000-0000-0000-00000000b624'
     and academic_year_id='00000000-0000-0000-0000-00000000c624'
     and source_fingerprint=repeat('a',64))=2
  and (select state from public.timetable_import_candidates where id=(select current_id from g12_replace_probe))='APPLIED_TO_DRAFT',
  '35 already-applied source is rejected without creating another live candidate'
);

reset role;
rollback;

\echo G1_2_TIMETABLE_IMPORT_DB_CONTRACT_PASS
