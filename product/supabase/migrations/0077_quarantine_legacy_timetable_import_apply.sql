begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (77, '0077_quarantine_legacy_timetable_import_apply')
on conflict (version) do update
set migration_id = excluded.migration_id;

-- G1.6-G: the G1.2 apply RPC remains installed for audit/forward compatibility,
-- but is no longer a client runtime capability while HOLD_PRODUCTION_APPLY is active.
revoke execute on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)
  from public, anon, authenticated;

-- Supabase projects may grant CRUD on new public tables to authenticated through
-- default privileges. G1.2 intended receipts to be client-readable but server-written;
-- GRANT SELECT alone does not remove inherited CRUD grants. Re-establish least privilege
-- explicitly without rewriting the historical 0020 migration.
revoke all on table public.timetable_import_apply_receipts from authenticated;
grant select on table public.timetable_import_apply_receipts to authenticated;
revoke all on table public.timetable_import_apply_receipts from anon;

comment on function public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb) is
  'LEGACY_QUARANTINED by DOS-TT-IMPORT-01 G1.6-G. No client role may execute this function. Re-enablement requires a separately governed runtime boundary and HUMAN REVIEW.';

select private.advance_runtime_schema_contract('0077_quarantine_legacy_timetable_import_apply');

commit;
