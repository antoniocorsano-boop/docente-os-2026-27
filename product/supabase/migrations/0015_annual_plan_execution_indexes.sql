create index if not exists idx_annual_plan_sections_academic_year
  on public.annual_plan_sections(academic_year_id);
create index if not exists idx_annual_plan_sections_created_by
  on public.annual_plan_sections(created_by);
create index if not exists idx_annual_plan_sections_confirmed_by
  on public.annual_plan_sections(confirmed_by)
  where confirmed_by is not null;

create index if not exists idx_annual_plan_progress_plan_asset
  on public.annual_plan_block_progress(canonical_plan_asset_id);
create index if not exists idx_annual_plan_progress_generation
  on public.annual_plan_block_progress(canonical_generation_id);
create index if not exists idx_annual_plan_progress_updated_by
  on public.annual_plan_block_progress(updated_by);
