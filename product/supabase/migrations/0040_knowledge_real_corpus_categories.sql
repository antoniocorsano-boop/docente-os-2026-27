begin;

alter table public.knowledge_assets
  drop constraint if exists knowledge_assets_content_category_check;

alter table public.knowledge_assets
  add constraint knowledge_assets_content_category_check
  check (content_category in (
    'CIRCULAR',
    'MODEL',
    'PROGRAMMING',
    'UDA',
    'ASSESSMENT',
    'TEACHING_RESOURCE',
    'COMMUNICATION',
    'CURRICULUM',
    'REPORT',
    'OTHER'
  ));

comment on column public.knowledge_assets.content_category is
  'Human-reviewable professional content category, including curriculum and collegial/report documents.';

commit;
