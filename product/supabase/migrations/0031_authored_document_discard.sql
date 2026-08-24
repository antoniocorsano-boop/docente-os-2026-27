begin;

create or replace function public.discard_authored_document(target_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  deleted_count integer;
begin
  if uid is null then raise exception 'authentication required'; end if;

  delete from public.authored_documents d
  where d.id = target_document_id
    and d.created_by = uid
    and private.is_workspace_member(d.workspace_id);

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.discard_authored_document(uuid) from public;
grant execute on function public.discard_authored_document(uuid) to authenticated;

commit;
