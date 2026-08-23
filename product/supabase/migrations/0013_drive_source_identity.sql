create unique index if not exists uq_knowledge_assets_workspace_drive_source
  on public.knowledge_assets (workspace_id, source_locator)
  where source_provider = 'DRIVE' and source_locator is not null;

comment on index public.uq_knowledge_assets_workspace_drive_source is
  'Prevents duplicate acquisition of the same immutable Google Drive file identity inside a workspace.';
