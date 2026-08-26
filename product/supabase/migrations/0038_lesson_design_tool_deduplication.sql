create unique index if not exists uq_lesson_design_extensions_context_dedupe_key
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
  where nullif(btrim(payload ->> 'dedupeKey'), '') is not null;

comment on index public.uq_lesson_design_extensions_context_dedupe_key is
  'Atomically prevents duplicate tool-generated lesson proposals that declare the same dedupeKey in the same canonical lesson projection.';
