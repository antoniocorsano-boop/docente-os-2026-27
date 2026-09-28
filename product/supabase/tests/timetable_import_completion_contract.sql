-- DOS-TT-IMPORT-01 completion boundary
-- Behavioral qualification against an isolated disposable database.

begin;

create or replace function pg_temp.assert_true(ok boolean, label text)
returns void language plpgsql as $$
begin
  if not coalesce(ok,false) then raise exception 'TIMETABLE COMPLETION FAIL: %',label; end if;
  raise notice 'PASS: %',label;
end
$$;

select pg_temp.assert_true(
  exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='timetable_import_candidates'
      and column_name='source_scope'
  ),
  '01 teacher-complete source scope materialized'
);

select pg_temp.assert_true(
  to_regprocedure('public.read_timetable_draft_revision_token(uuid)') is not null,
  '02 authoritative draft token reader installed'
);

select pg_temp.assert_true(
  to_regprocedure('public.apply_confirmed_timetable_import_v1(uuid,text,uuid,text,uuid)') is not null,
  '03 completion apply boundary installed'
);

select pg_temp.assert_true(
  has_function_privilege('authenticated','public.apply_confirmed_timetable_import_v1(uuid,text,uuid,text,uuid)','EXECUTE'),
  '04 authenticated can execute only the governed completion apply'
);

select pg_temp.assert_true(
  not has_function_privilege('authenticated','public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)','EXECUTE'),
  '05 legacy apply remains quarantined'
);

insert into auth.users(id,email)
values ('00000000-0000-0000-0000-00000000a625','g1625@example.invalid');

insert into public.workspaces(id,kind,name,owner_user_id)
values ('00000000-0000-0000-0000-00000000b625','PERSONAL','Import completion fixture','00000000-0000-0000-0000-00000000a625');

insert into public.workspace_memberships(workspace_id,user_id,role)
values ('00000000-0000-0000-0000-00000000b625','00000000-0000-0000-0000-00000000a625','OWNER');

insert into public.academic_years(id,workspace_id,label,starts_on,ends_on,is_active)
values ('00000000-0000-0000-0000-00000000c625','00000000-0000-0000-0000-00000000b625','2026/27','2026-09-01','2027-08-31',true);

insert into public.annual_plan_sections(
  id,workspace_id,academic_year_id,grade,section_code,status,created_by
) values (
  '00000000-0000-0000-0000-00000000d625',
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000c625',
  'SECONDA','A','DA_CONFERMARE','00000000-0000-0000-0000-00000000a625'
);

insert into public.teaching_disciplines(
  id,workspace_id,academic_year_id,name,is_active,created_by
) values (
  '00000000-0000-0000-0000-00000000e625',
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000c625',
  'Tecnologia',true,'00000000-0000-0000-0000-00000000a625'
);

insert into public.teaching_assignments(
  id,workspace_id,academic_year_id,section_id,discipline_id,weekly_minutes,status,created_by
) values (
  '00000000-0000-0000-0000-00000000f625',
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000c625',
  '00000000-0000-0000-0000-00000000d625',
  '00000000-0000-0000-0000-00000000e625',
  120,'CONFIRMED','00000000-0000-0000-0000-00000000a625'
);

insert into public.timetable_versions(
  id,workspace_id,academic_year_id,label,status,effective_from,source_kind,created_by
) values (
  '10000000-0000-0000-0000-00000000d625',
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000c625',
  'Old draft','DRAFT','2026-09-01','MANUAL','00000000-0000-0000-0000-00000000a625'
);

insert into public.timetable_slots(
  id,timetable_version_id,weekday,start_time,end_time,slot_kind,
  section_id,discipline_id,teaching_assignment_id,ordinal,created_by
) values (
  '20000000-0000-0000-0000-00000000a625',
  '10000000-0000-0000-0000-00000000d625',
  1,'08:00','09:00','LESSON',
  '00000000-0000-0000-0000-00000000d625',
  '00000000-0000-0000-0000-00000000e625',
  '00000000-0000-0000-0000-00000000f625',
  1,'00000000-0000-0000-0000-00000000a625'
),(
  '20000000-0000-0000-0000-00000000b625',
  '10000000-0000-0000-0000-00000000d625',
  3,'11:00','12:00','OTHER',
  null,null,null,4,'00000000-0000-0000-0000-00000000a625'
);

insert into public.timetable_import_candidates(
  id,workspace_id,academic_year_id,source_fingerprint,source_kind,source_label,source_ref,
  effective_from_candidate,source_is_provisional,state,revision,parser_version,created_by,source_scope
) values (
  '30000000-0000-0000-0000-00000000a625',
  '00000000-0000-0000-0000-00000000b625',
  '00000000-0000-0000-0000-00000000c625',
  repeat('a',64),'INSTITUTION_DOCUMENT','Orario provvisorio dal 28-09-2026',
  'sha256:'||repeat('a',64),'2026-09-28',true,'DRAFT',1,'timetable-completion-v1',
  '00000000-0000-0000-0000-00000000a625','TEACHER_COMPLETE'
);

insert into public.timetable_import_candidate_rows(
  candidate_id,candidate_revision,row_key,weekday,ordinal,start_time,end_time,
  source_class_label,resolved_section_id,resolved_assignment_id,proposed_slot_kind,
  confidence,review_state,evidence_ref
) values (
  '30000000-0000-0000-0000-00000000a625',1,'1:1:2A',1,1,'08:00','09:00',
  '2A','00000000-0000-0000-0000-00000000d625','00000000-0000-0000-0000-00000000f625',
  'LESSON','HIGH','AUTO_RESOLVED','page:1'
),(
  '30000000-0000-0000-0000-00000000a625',1,'4:2:2A',4,2,'09:00','10:00',
  '2A','00000000-0000-0000-0000-00000000d625','00000000-0000-0000-0000-00000000f625',
  'LESSON','HIGH','AUTO_RESOLVED','page:1'
);

update public.timetable_import_candidates
set state='READY_TO_CONFIRM'
where id='30000000-0000-0000-0000-00000000a625';

select pg_temp.assert_true(
  (select revision from public.timetable_import_candidates where id='30000000-0000-0000-0000-00000000a625')=2,
  '06 ready transition advances candidate revision'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000a625',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a625","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  before_revision bigint;
  after_revision bigint;
  token_before text;
  token_after text;
  first_receipt jsonb;
  retry_receipt jsonb;
begin
  select revision into before_revision
  from public.timetable_versions
  where id='10000000-0000-0000-0000-00000000d625';

  token_before := public.read_timetable_draft_revision_token(
    '10000000-0000-0000-0000-00000000d625'
  );

  perform pg_temp.assert_true(
    token_before = 'TTDR-1|36:10000000-0000-0000-0000-00000000d625|'
      || char_length(before_revision::text)::text || ':' || before_revision::text,
    '07 token reader reflects exact DB revision'
  );

  first_receipt := public.apply_confirmed_timetable_import_v1(
    '30000000-0000-0000-0000-00000000a625',
    '2',
    '10000000-0000-0000-0000-00000000d625',
    token_before,
    '40000000-0000-0000-0000-00000000a625'
  );

  select revision into after_revision
  from public.timetable_versions
  where id='10000000-0000-0000-0000-00000000d625';

  perform pg_temp.assert_true(
    after_revision=before_revision+1,
    '08 completion apply performs one logical DRAFT revision bump'
  );

  perform pg_temp.assert_true(
    (select count(*) from public.timetable_slots
      where timetable_version_id='10000000-0000-0000-0000-00000000d625'
        and slot_kind='LESSON')=2,
    '09 confirmed candidate replaces DRAFT LESSON slots'
  );

  perform pg_temp.assert_true(
    exists(select 1 from public.timetable_slots
      where id='20000000-0000-0000-0000-00000000b625'
        and slot_kind='OTHER'),
    '10 non-LESSON slots are preserved'
  );

  perform pg_temp.assert_true(
    (select effective_from from public.timetable_versions
      where id='10000000-0000-0000-0000-00000000d625')='2026-09-28'::date
    and
    (select source_kind from public.timetable_versions
      where id='10000000-0000-0000-0000-00000000d625')='IMPORT',
    '11 effective date and import provenance are applied atomically'
  );

  perform pg_temp.assert_true(
    (select state from public.timetable_import_candidates
      where id='30000000-0000-0000-0000-00000000a625')='APPLIED_TO_DRAFT',
    '12 candidate reaches APPLIED_TO_DRAFT only through completion boundary'
  );

  token_after := public.read_timetable_draft_revision_token(
    '10000000-0000-0000-0000-00000000d625'
  );
  perform pg_temp.assert_true(
    token_after<>token_before,
    '13 pre-apply revision token becomes stale after apply'
  );

  retry_receipt := public.apply_confirmed_timetable_import_v1(
    '30000000-0000-0000-0000-00000000a625',
    '2',
    '10000000-0000-0000-0000-00000000d625',
    token_before,
    '40000000-0000-0000-0000-00000000a625'
  );

  perform pg_temp.assert_true(
    retry_receipt->>'id'=first_receipt->>'id',
    '14 exact confirmation retry is idempotent'
  );

  perform pg_temp.assert_true(
    (select revision from public.timetable_versions
      where id='10000000-0000-0000-0000-00000000d625')=after_revision,
    '15 idempotent retry does not mutate DRAFT again'
  );
end
$$;

reset role;
rollback;

\echo TIMETABLE_IMPORT_COMPLETION_CONTRACT_PASS
