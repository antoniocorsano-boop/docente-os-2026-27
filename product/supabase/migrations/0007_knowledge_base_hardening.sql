drop policy if exists knowledge_documents_member_all on public.knowledge_documents;
drop policy if exists knowledge_units_member_all on public.knowledge_units;
drop policy if exists knowledge_links_member_all on public.knowledge_links;
drop policy if exists knowledge_ingestion_member_all on public.knowledge_ingestion_runs;

create policy knowledge_documents_select_member on public.knowledge_documents for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_documents_insert_member on public.knowledge_documents for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_documents.workspace_id
  )
);
create policy knowledge_documents_update_member on public.knowledge_documents for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_documents.workspace_id
  )
);

create policy knowledge_units_select_member on public.knowledge_units for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_units_insert_member on public.knowledge_units for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_documents d
    where d.id = document_id and d.workspace_id = knowledge_units.workspace_id
  )
);
create policy knowledge_units_update_member on public.knowledge_units for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_documents d
    where d.id = document_id and d.workspace_id = knowledge_units.workspace_id
  )
);

create policy knowledge_links_select_member on public.knowledge_links for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_links_insert_member on public.knowledge_links for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
  and (
    (asset_id is not null and exists (
      select 1 from public.knowledge_assets a
      where a.id = asset_id and a.workspace_id = knowledge_links.workspace_id
    ))
    or
    (unit_id is not null and exists (
      select 1 from public.knowledge_units u
      where u.id = unit_id and u.workspace_id = knowledge_links.workspace_id
    ))
  )
);
create policy knowledge_links_update_member on public.knowledge_links for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and (
    (asset_id is not null and exists (
      select 1 from public.knowledge_assets a
      where a.id = asset_id and a.workspace_id = knowledge_links.workspace_id
    ))
    or
    (unit_id is not null and exists (
      select 1 from public.knowledge_units u
      where u.id = unit_id and u.workspace_id = knowledge_links.workspace_id
    ))
  )
);

create policy knowledge_ingestion_select_member on public.knowledge_ingestion_runs for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_ingestion_insert_member on public.knowledge_ingestion_runs for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_ingestion_runs.workspace_id
  )
);
create policy knowledge_ingestion_update_member on public.knowledge_ingestion_runs for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_ingestion_runs.workspace_id
  )
);

create or replace function private.enforce_knowledge_document_invariants()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id then raise exception 'knowledge document workspace_id is immutable'; end if;
  if new.asset_id <> old.asset_id then raise exception 'knowledge document asset_id is immutable'; end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists knowledge_documents_touch on public.knowledge_documents;
create trigger knowledge_documents_enforce before update on public.knowledge_documents
for each row execute function private.enforce_knowledge_document_invariants();

create or replace function private.enforce_knowledge_unit_invariants()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id then raise exception 'knowledge unit workspace_id is immutable'; end if;
  if new.document_id <> old.document_id then raise exception 'knowledge unit document_id is immutable'; end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists knowledge_units_touch on public.knowledge_units;
create trigger knowledge_units_enforce before update on public.knowledge_units
for each row execute function private.enforce_knowledge_unit_invariants();

create or replace function private.enforce_knowledge_link_invariants()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id then raise exception 'knowledge link workspace_id is immutable'; end if;
  if new.created_by <> old.created_by then raise exception 'knowledge link created_by is immutable'; end if;
  if new.asset_id is distinct from old.asset_id or new.unit_id is distinct from old.unit_id then
    raise exception 'knowledge link source is immutable';
  end if;
  return new;
end;
$$;

create trigger knowledge_links_enforce before update on public.knowledge_links
for each row execute function private.enforce_knowledge_link_invariants();

create or replace function private.enforce_ingestion_run_invariants()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id then raise exception 'ingestion workspace_id is immutable'; end if;
  if new.asset_id <> old.asset_id then raise exception 'ingestion asset_id is immutable'; end if;
  if new.stage <> old.stage then raise exception 'ingestion stage is immutable'; end if;
  if new.processor <> old.processor then raise exception 'ingestion processor is immutable'; end if;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger knowledge_ingestion_enforce before update on public.knowledge_ingestion_runs
for each row execute function private.enforce_ingestion_run_invariants();

revoke delete on public.knowledge_documents from authenticated;
revoke delete on public.knowledge_units from authenticated;
revoke delete on public.knowledge_links from authenticated;
revoke delete on public.knowledge_ingestion_runs from authenticated;

revoke delete on public.knowledge_assets from authenticated;
