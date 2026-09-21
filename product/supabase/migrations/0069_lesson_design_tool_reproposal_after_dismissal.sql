drop index if exists public.uq_lesson_design_extensions_context_dedupe_key;

create unique index uq_lesson_design_extensions_context_dedupe_key
  on public.lesson_design_extensions (
    workspace_id,
    academic_year_id,
    section_id,
    canonical_plan_asset_id,
    canonical_generation_id,
    block_id,
    projection_id,
    (payload ->> 'dedupeKey')
  )
  where nullif(btrim(payload ->> 'dedupeKey'), '') is not null
    and status <> 'DISMISSED';

comment on index public.uq_lesson_design_extensions_context_dedupe_key is
  'Atomically prevents duplicate active tool-generated lesson proposals in the same canonical lesson projection while allowing a new proposal after the teacher dismisses the previous one. Dismissed rows remain immutable audit history.';
