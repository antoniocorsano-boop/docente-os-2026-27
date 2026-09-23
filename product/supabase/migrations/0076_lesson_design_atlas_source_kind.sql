begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (76, '0076_lesson_design_atlas_source_kind')
on conflict (version) do update
set migration_id = excluded.migration_id;

alter table public.lesson_design_extensions
  drop constraint if exists lesson_design_extensions_source_kind_check;

alter table public.lesson_design_extensions
  add constraint lesson_design_extensions_source_kind_check
  check (source_kind in (
    'EDITORIAL_KNOWLEDGE',
    'KNOWLEDGE',
    'ATLAS',
    'WEB',
    'AI_TOOL',
    'TEACHER'
  ));

comment on constraint lesson_design_extensions_source_kind_check on public.lesson_design_extensions is
  'Allowed lesson-extension provenance kinds. ATLAS identifies a public Atlas resource proposed to Docente OS; it does not grant Atlas curriculum authority.';

select private.advance_runtime_schema_contract('0076_lesson_design_atlas_source_kind');

commit;
