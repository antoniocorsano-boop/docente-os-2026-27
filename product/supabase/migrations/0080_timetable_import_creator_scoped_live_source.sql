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
