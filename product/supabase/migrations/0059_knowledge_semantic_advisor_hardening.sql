create index if not exists idx_knowledge_unit_embeddings_generation_id
  on public.knowledge_unit_embeddings(generation_id);

create index if not exists idx_knowledge_unit_embeddings_profile_id
  on public.knowledge_unit_embeddings(profile_id);

create policy knowledge_unit_embeddings_deny_authenticated
  on public.knowledge_unit_embeddings
  for all
  to authenticated
  using (false)
  with check (false);

comment on function public.knowledge_semantic_coverage(uuid) is
  'Intentional SECURITY DEFINER RPC. Requires auth.uid() and workspace membership; exposes aggregate coverage only and never raw embedding vectors.';

comment on function public.search_knowledge_semantic_exact(uuid, text, extensions.vector, uuid, text, text, text, text[], integer) is
  'Intentional SECURITY DEFINER RPC. Requires auth.uid() and workspace membership; enforces active profile, current generation and professional filters before ranking; returns identifiers and rank only, never raw stored vectors.';
