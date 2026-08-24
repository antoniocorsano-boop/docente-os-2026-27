begin;

-- X5 authoring RPCs are authenticated application boundaries. They must not be
-- directly executable by the anonymous API role.
revoke execute on function public.open_uda_authoring(uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.authored_document_snapshot(uuid) from public, anon;
revoke execute on function public.save_authored_document_version(uuid, integer, text, text) from public, anon;
revoke execute on function public.discard_authored_document(uuid) from public, anon;

grant execute on function public.open_uda_authoring(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.authored_document_snapshot(uuid) to authenticated;
grant execute on function public.save_authored_document_version(uuid, integer, text, text) to authenticated;
grant execute on function public.discard_authored_document(uuid) to authenticated;

-- Avoid evaluating auth.uid() once per candidate row in the X4 receipt policy.
drop policy if exists assistant_write_proposals_select_own on public.assistant_write_proposals;
create policy assistant_write_proposals_select_own
on public.assistant_write_proposals
for select to authenticated
using (created_by = (select auth.uid()) and private.is_workspace_member(workspace_id));

-- Cover foreign keys introduced by X4/X5 that can participate in lifecycle,
-- cleanup or referential checks as the dataset grows.
create index if not exists assistant_write_proposals_academic_year_idx
  on public.assistant_write_proposals(academic_year_id);
create index if not exists assistant_write_proposals_confirmed_by_idx
  on public.assistant_write_proposals(confirmed_by);
create index if not exists authored_document_versions_created_by_idx
  on public.authored_document_versions(created_by);
create index if not exists authored_documents_academic_year_idx
  on public.authored_documents(academic_year_id);
create index if not exists authored_documents_created_by_idx
  on public.authored_documents(created_by);
create index if not exists authored_documents_source_asset_idx
  on public.authored_documents(source_asset_id);

comment on policy assistant_write_proposals_select_own on public.assistant_write_proposals is
  'X4 receipt visibility: own authenticated receipts in member workspaces; auth.uid() is initialized once per statement.';

commit;
