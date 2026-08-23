begin;

alter table public.knowledge_assets
  add column content_category text not null default 'OTHER'
    check (content_category in ('CIRCULAR', 'MODEL', 'PROGRAMMING', 'UDA', 'ASSESSMENT', 'TEACHING_RESOURCE', 'COMMUNICATION', 'OTHER')),
  add column disciplines text[] not null default '{}',
  add column class_labels text[] not null default '{}',
  add column context_status text not null default 'UNCLASSIFIED'
    check (context_status in ('UNCLASSIFIED', 'REVIEWED', 'NEEDS_REVIEW')),
  add column reliability text not null default 'AUTO'
    check (reliability in ('AUTO', 'VERIFIED', 'TO_VERIFY'));

create index knowledge_assets_context_idx on public.knowledge_assets (workspace_id, content_category, context_status);
create index knowledge_assets_disciplines_gin_idx on public.knowledge_assets using gin (disciplines);
create index knowledge_assets_class_labels_gin_idx on public.knowledge_assets using gin (class_labels);

comment on column public.knowledge_assets.content_category is 'Human-reviewable professional content category.';
comment on column public.knowledge_assets.disciplines is 'Discipline labels pending the canonical teaching registry.';
comment on column public.knowledge_assets.class_labels is 'Class and section labels such as 1A or 3C.';
comment on column public.knowledge_assets.context_status is 'Classification workflow status.';
comment on column public.knowledge_assets.reliability is 'Reliability assessment of the asset context.';

commit;
