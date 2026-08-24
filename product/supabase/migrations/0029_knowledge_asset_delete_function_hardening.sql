revoke delete on public.knowledge_assets from authenticated;
drop policy if exists knowledge_assets_delete_own on public.knowledge_assets;

drop policy if exists knowledge_assets_storage_delete_member on storage.objects;
create policy knowledge_assets_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'knowledge-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

create or replace function public.delete_own_knowledge_asset(p_asset_id uuid)
returns table (
  deleted boolean,
  storage_bucket text,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_provider text;
  v_source_metadata jsonb;
begin
  if (select auth.uid()) is null then
    return query select false, null::text, null::text;
    return;
  end if;

  select a.source_provider, a.source_metadata
    into v_source_provider, v_source_metadata
  from public.knowledge_assets a
  where a.id = p_asset_id
    and a.created_by = (select auth.uid())
    and private.is_workspace_member(a.workspace_id)
  for update;

  if not found then
    return query select false, null::text, null::text;
    return;
  end if;

  update public.knowledge_assets
  set current_generation_id = null
  where id = p_asset_id;

  delete from public.knowledge_documents
  where asset_id = p_asset_id;

  delete from public.knowledge_assets
  where id = p_asset_id;

  return query
  select
    true,
    case
      when v_source_provider = 'UPLOAD' then coalesce(v_source_metadata ->> 'storageBucket', 'knowledge-assets')
      else null
    end,
    case
      when v_source_provider = 'UPLOAD' then v_source_metadata ->> 'storagePath'
      else null
    end;
end;
$$;

revoke all on function public.delete_own_knowledge_asset(uuid) from public;
revoke all on function public.delete_own_knowledge_asset(uuid) from anon;
grant execute on function public.delete_own_knowledge_asset(uuid) to authenticated;
