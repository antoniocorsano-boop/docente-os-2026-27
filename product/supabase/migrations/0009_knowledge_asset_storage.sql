insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-assets',
  'knowledge-assets',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists knowledge_assets_storage_select_member on storage.objects;
drop policy if exists knowledge_assets_storage_insert_member on storage.objects;

create policy knowledge_assets_storage_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'knowledge-assets'
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

create policy knowledge_assets_storage_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'knowledge-assets'
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);
