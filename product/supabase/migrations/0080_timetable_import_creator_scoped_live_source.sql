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

select private.advance_runtime_schema_contract('0080_timetable_import_creator_scoped_live_source');

commit;
