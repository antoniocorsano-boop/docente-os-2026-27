begin;

create index if not exists idx_teaching_session_drive_outbox_year
  on public.teaching_session_drive_outbox(academic_year_id);

create index if not exists idx_teaching_session_drive_outbox_section
  on public.teaching_session_drive_outbox(section_id);

create index if not exists idx_teaching_session_drive_outbox_created_by
  on public.teaching_session_drive_outbox(created_by);

commit;
