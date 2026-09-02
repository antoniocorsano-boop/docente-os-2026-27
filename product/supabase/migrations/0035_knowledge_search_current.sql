create or replace function public.search_current_knowledge_units(
  p_workspace_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table (
  unit_id uuid,
  document_id uuid,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    u.id as unit_id,
    d.id as document_id,
    ts_rank_cd(
      u.search_vector,
      websearch_to_tsquery('italian', p_query)
    )::real as rank
  from public.knowledge_units u
  join public.knowledge_documents d
    on d.id = u.document_id
   and d.workspace_id = p_workspace_id
  join public.knowledge_assets a
    on a.id = d.asset_id
   and a.workspace_id = p_workspace_id
   and a.current_generation_id = d.generation_id
  where u.workspace_id = p_workspace_id
    and btrim(coalesce(p_query, '')) <> ''
    and u.search_vector @@ websearch_to_tsquery('italian', p_query)
  order by rank desc, u.id
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.search_current_knowledge_units(uuid, text, integer) from public;
revoke all on function public.search_current_knowledge_units(uuid, text, integer) from anon;
grant execute on function public.search_current_knowledge_units(uuid, text, integer) to authenticated;
