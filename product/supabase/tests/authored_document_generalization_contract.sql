do $contract$
declare
  save_definition text;
  kind_constraint_definition text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authored_documents'
      and column_name = 'section_id'
  ) then
    raise exception 'DOC-01: authored_documents.section_id is missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authored_documents'
      and column_name = 'teaching_discipline_id'
  ) then
    raise exception 'DOC-01: authored_documents.teaching_discipline_id is missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authored_documents'
      and column_name = 'source_asset_id'
      and is_nullable <> 'YES'
  ) then
    raise exception 'DOC-01: authored_documents.source_asset_id must be nullable';
  end if;

  select pg_get_constraintdef(c.oid)
    into kind_constraint_definition
  from pg_constraint c
  where c.conrelid = 'public.authored_documents'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%document_kind%'
  order by c.oid desc
  limit 1;

  if kind_constraint_definition is null
     or position('FINAL_REPORT' in kind_constraint_definition) = 0
     or position('UDA' in kind_constraint_definition) = 0 then
    raise exception 'DOC-01: document_kind constraint must admit UDA and FINAL_REPORT';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'authored_documents'
      and indexname = 'authored_documents_uda_source_unique'
  ) then
    raise exception 'DOC-01: UDA source identity index is missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'authored_documents'
      and indexname = 'authored_documents_final_report_context_unique'
  ) then
    raise exception 'DOC-01: FINAL_REPORT context identity index is missing';
  end if;

  if to_regprocedure('public.open_final_report_authoring(uuid,uuid,uuid,uuid,text,text)') is not null then
    raise exception 'DOC-01: open_final_report_authoring must remain owned by DOC-04';
  end if;

  select pg_get_functiondef(
    'public.save_authored_document_version(uuid,integer,text,text)'::regprocedure
  ) into save_definition;

  if position('FINAL_REPORT_USES_STRUCTURED_SAVE' in save_definition) = 0 then
    raise exception 'DOC-01: generic save must fail closed for FINAL_REPORT';
  end if;
end;
$contract$;
