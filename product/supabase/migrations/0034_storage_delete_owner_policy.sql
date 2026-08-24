drop policy if exists knowledge_assets_storage_delete_own on storage.objects;

create policy knowledge_assets_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'knowledge-assets'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);
