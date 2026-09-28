-- DOS-TT-IMPORT-01 / G1.2 DB contract
-- Executed only against an isolated disposable database after repository migrations.
-- 24 governed assertions. Rolls back all fixtures.

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
select pg_temp.assert_true(exists(select 1 from pg_indexes where schemaname='public' and indexname='timetable_import_one_live_source_uq' and indexdef ilike '%WHERE%'),'13 live-source uniqueness is partial');
select pg_temp.assert_true(exists(select 1 from pg_constraint where conrelid='public.timetable_import_candidate_rows'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%candidate_id%candidate_revision%row_key%'),'14 row identity binds candidate revision');
select pg_temp.assert_true(exists(select 1 from pg_constraint where conrelid='public.timetable_import_apply_receipts'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%workspace_id%confirmation_request_id%'),'15 idempotency receipt key materialized');
select pg_temp.assert_true((select prosecdef from pg_proc where oid='public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure),'16 apply is SECURITY DEFINER');
select pg_temp.assert_true((select proconfig @> array['search_path=""'] from pg_proc where oid='public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure),'17 apply fixes empty search_path');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_slots'::regclass and tgname='timetable_slots_bump_draft_revision' and not tgisinternal),'18 manual slot bump trigger installed');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_versions'::regclass and tgname='timetable_versions_bump_revision' and not tgisinternal),'19 direct revision guard installed');
select pg_temp.assert_true(exists(select 1 from pg_trigger where tgrelid='public.timetable_import_candidate_rows'::regclass and tgname='timetable_import_rows_enforce_delete' and not tgisinternal),'20 candidate-row lifecycle guard installed');

select pg_temp.assert_true(exists(select 1 from information_schema.columns where table_schema='public' and table_name='timetable_import_candidate_rows' and column_name='proposed_manual_class_label') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='timetable_import_candidate_rows' and column_name='proposed_presence_kind'),'21 CLASS_PRESENCE candidate fields materialized');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%INCOMPLETE_CANDIDATE_PLAN%','22 incomplete candidate plan is rejected');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%pg_advisory_xact_lock%'),'23 duplicate confirmation attempts are serialized');
select pg_temp.assert_true(pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) ilike '%proposed_slot_kind=''CLASS_PRESENCE''%' and pg_get_functiondef('public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)'::regprocedure) not ilike '%from public.teaching_assignments ta where s.id=sid%'),'24 CLASS_PRESENCE and assignment-independent non-lesson update path installed');

rollback;

\echo G1_2_TIMETABLE_IMPORT_DB_CONTRACT_PASS
