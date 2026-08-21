alter table public.knowledge_assets
  add column if not exists original_text text null;

alter table public.knowledge_assets
  drop constraint if exists knowledge_assets_original_text_kind_ck;

alter table public.knowledge_assets
  add constraint knowledge_assets_original_text_kind_ck check (
    original_text is null or asset_kind in ('NOTE','GENERATED')
  );
