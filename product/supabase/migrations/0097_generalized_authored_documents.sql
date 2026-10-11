begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (97, '0097_generalized_authored_documents')
on conflict (version) do update
set migration_id = excluded.migration_id;

alter table public.authored_documents
  add column if not exists section_id uuid null references public.annual_plan_sections(id) on delete restrict,
  add column if not exists teaching_discipline_id uuid null references public.teaching_disciplines(id) on delete restrict;

alter table public.authored_documents
  alter column source_asset_id drop not null;

alter table public.authored_documents
  drop constraint if exists authored_documents_document_kind_check,
  drop constraint if exists authored_documents_workspace_id_source_asset_id_document_kind_key;

alter table public.authored_documents
  add constraint authored_documents_document_kind_check
    check (document_kind in ('UDA', 'FINAL_REPORT')),
  add constraint authored_documents_context_check
    check (
      (document_kind = 'UDA' and source_asset_id is not null)
      or
      (
        document_kind = 'FINAL_REPORT'
        and source_asset_id is null
        and academic_year_id is not null
        and section_id is not null
        and teaching_discipline_id is not null
      )
    );

create unique index authored_documents_uda_source_unique
  on public.authored_documents(workspace_id, source_asset_id)
  where document_kind = 'UDA';

create unique index authored_documents_final_report_context_unique
  on public.authored_documents(
    workspace_id,
    academic_year_id,
    section_id,
    teaching_discipline_id
  )
  where document_kind = 'FINAL_REPORT';

create index if not exists idx_authored_documents_section
  on public.authored_documents(section_id)
  where section_id is not null;

create index if not exists idx_authored_documents_teaching_discipline
  on public.authored_documents(teaching_discipline_id)
  where teaching_discipline_id is not null;

create or replace function public.save_authored_document_version(
  target_document_id uuid,
  expected_current_version integer,
  next_title text,
  next_body_markdown text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_no integer;
  workspace uuid;
  current_kind text;
  new_no integer;
  safe_title text := nullif(trim(next_title), '');
begin
  if uid is null then raise exception 'authentication required'; end if;
  if safe_title is null or length(safe_title) > 300 then raise exception 'invalid title'; end if;
  if length(coalesce(next_body_markdown, '')) > 250000 then raise exception 'document body too large'; end if;

  select d.workspace_id, d.current_version_no, d.document_kind
    into workspace, current_no, current_kind
  from public.authored_documents d
  where d.id = target_document_id
  for update;

  if workspace is null or not private.is_workspace_member(workspace) then
    raise exception 'document not available';
  end if;

  if current_kind = 'FINAL_REPORT' then
    raise exception 'FINAL_REPORT_USES_STRUCTURED_SAVE';
  end if;

  if current_no <> expected_current_version then
    raise exception 'document changed; reload before saving';
  end if;

  new_no := current_no + 1;
  insert into public.authored_document_versions(document_id, version_no, title, body_markdown, created_by)
  values (target_document_id, new_no, safe_title, coalesce(next_body_markdown, ''), uid);

  update public.authored_documents
  set title = safe_title, current_version_no = new_no, updated_at = now()
  where id = target_document_id;

  return new_no;
end;
$$;

revoke all on function public.save_authored_document_version(uuid, integer, text, text) from public;
grant execute on function public.save_authored_document_version(uuid, integer, text, text) to authenticated;

select private.advance_runtime_schema_contract('0097_generalized_authored_documents');

commit;
