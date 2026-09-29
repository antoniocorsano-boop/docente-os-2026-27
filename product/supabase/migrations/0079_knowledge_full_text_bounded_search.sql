begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (79, '0079_knowledge_full_text_bounded_search')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function public.search_knowledge_full_text_current(
  p_workspace_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table (
  document_id uuid,
  document_asset_id uuid,
  document_generation_id uuid,
  document_workspace_id uuid,
  document_title text,
  document_type text,
  document_language text,
  document_normalized_text text,
  document_normalized_markdown text,
  document_summary text,
  document_extracted_data jsonb,
  document_processing_version text,
  document_created_at timestamptz,
  document_updated_at timestamptz,
  unit_id uuid,
  unit_document_id uuid,
  unit_workspace_id uuid,
  unit_ordinal integer,
  unit_type text,
  unit_title text,
  unit_content text,
  unit_structured_data jsonb,
  unit_source_page integer,
  unit_start_offset integer,
  unit_end_offset integer,
  unit_confidence double precision,
  unit_validation_status text,
  unit_created_at timestamptz,
  unit_updated_at timestamptz,
  rank double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_tsquery tsquery;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;
  if v_query = '' then
    return;
  end if;

  v_tsquery := websearch_to_tsquery('italian'::regconfig, v_query);

  return query
  select
    d.id,
    d.asset_id,
    d.generation_id,
    d.workspace_id,
    d.title,
    d.document_type,
    d.language,
    d.normalized_text,
    d.normalized_markdown,
    d.summary,
    d.extracted_data,
    d.processing_version,
    d.created_at,
    d.updated_at,
    u.id,
    u.document_id,
    u.workspace_id,
    u.ordinal,
    u.unit_type,
    u.title,
    u.content,
    u.structured_data,
    u.source_page,
    u.start_offset,
    u.end_offset,
    u.confidence,
    u.validation_status,
    u.created_at,
    u.updated_at,
    ts_rank_cd(u.search_vector, v_tsquery)::double precision as rank
  from public.knowledge_units u
  join public.knowledge_documents d
    on d.id = u.document_id
   and d.workspace_id = p_workspace_id
  join public.knowledge_assets a
    on a.id = d.asset_id
   and a.workspace_id = p_workspace_id
  where u.workspace_id = p_workspace_id
    and a.processing_status = 'INDEXED'
    and a.current_generation_id = d.generation_id
    and u.validation_status <> 'REJECTED'
    and u.search_vector @@ v_tsquery
  order by rank desc, u.id asc
  limit v_limit;
end;
$$;

revoke all on function public.search_knowledge_full_text_current(uuid,text,integer)
  from public, anon;
grant execute on function public.search_knowledge_full_text_current(uuid,text,integer)
  to authenticated;

comment on function public.search_knowledge_full_text_current(uuid,text,integer) is
  'Bounded current-generation full-text Knowledge search. Enforces AAL2 workspace membership, INDEXED current generation, non-rejected units and DB-side limit before transfer.';

select private.advance_runtime_schema_contract('0079_knowledge_full_text_bounded_search');

commit;
