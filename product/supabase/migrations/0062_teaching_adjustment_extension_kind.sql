-- H8-B2: align the persisted lesson-design kind constraint with the governed
-- domain introduced by H8-B. This changes no lifecycle or consumer behavior.

alter table public.lesson_design_extensions
  drop constraint if exists lesson_design_extensions_kind_check;

alter table public.lesson_design_extensions
  add constraint lesson_design_extensions_kind_check check (kind in (
    'HOOK_QUOTE',
    'HOOK_EVENT',
    'HOOK_VIDEO',
    'HOOK_QUESTION',
    'TEACHER_RESOURCE',
    'STUDENT_RESOURCE',
    'FORMATIVE_CHECK',
    'TEACHING_ADJUSTMENT'
  ));

comment on constraint lesson_design_extensions_kind_check on public.lesson_design_extensions is
  'Governed lesson-design extension kinds. TEACHING_ADJUSTMENT remains subject to the same PROPOSED/MODIFIED/ACCEPTED/DISMISSED lifecycle.';
