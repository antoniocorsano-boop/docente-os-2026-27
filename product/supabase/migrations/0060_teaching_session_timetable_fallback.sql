begin;

alter table public.teaching_sessions
  drop constraint if exists teaching_sessions_projected_source_ck;

alter table public.teaching_sessions
  add constraint teaching_sessions_projected_source_ck check (
    (source_kind = 'MANUAL' and projected_occurrence_logical_id is null)
    or
    (
      source_kind = 'PROJECTED_OCCURRENCE'
      and projected_occurrence_logical_id is not null
      and (
        source_calendar_state = 'SCHOOL_DAY'
        or (
          source_calendar_state = 'UNDETERMINED'
          and source_timetable_version_id is not null
          and source_timetable_slot_id is not null
        )
      )
    )
  );

comment on constraint teaching_sessions_projected_source_ck on public.teaching_sessions is
  'Projected teaching sessions may come from an explicit SCHOOL_DAY or, when Calendar is unclassified, from an identified timetable version and slot. NO_LESSONS is never a recordable projected source.';

commit;
