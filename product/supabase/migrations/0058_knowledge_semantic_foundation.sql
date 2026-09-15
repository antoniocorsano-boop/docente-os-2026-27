create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_embedding_profiles (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
  provider text not null check (length(btrim(provider)) between 1 and 80),
  model text not null check (length(btrim(model)) between 1 and 160),
  model_revision text not null check (length(btrim(model_revision)) between 1 and 120),
  dimensions integer not null check (dimensions between 1 and 4096),
  distance_metric text not null default 'COSINE' check (distance_metric = 'COSINE'),
  language_scope text not null check (language_scope in ('ITALIAN','MULTILINGUAL')),
  policy_ref text not null check (length(btrim(policy_ref)) between 1 and 240),
  status text not null default 'EVALUATION' check (status in ('EVALUATION','ACTIVE','RETIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_knowledge_embedding_profiles_single_active
  on public.knowledge_embedding_profiles(status)
  where status = 'ACTIVE';

create table if not exists public.knowledge_unit_embeddings (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unit_id uuid not null references public.knowledge_units(id) on delete cascade,
  generation_id uuid not null references public.knowledge_processing_generations(id) on delete cascade,
  profile_id text not null references public.knowledge_embedding_profiles(id) on delete restrict,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  embedding extensions.vector not null,
  embedded_at timestamptz not null default now(),
  primary key (unit_id, profile_id)
);

create index if not exists idx_knowledge_unit_embeddings_scope
  on public.knowledge_unit_embeddings(workspace_id, profile_id, generation_id);

create or replace function private.enforce_knowledge_embedding_profile_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'embedding profile id is immutable'; end if;
    if new.provider <> old.provider then raise exception 'embedding profile provider is immutable'; end if;
    if new.model <> old.model then raise exception 'embedding profile model is immutable'; end if;
    if new.model_revision <> old.model_revision then raise exception 'embedding profile model_revision is immutable'; end if;
    if new.dimensions <> old.dimensions then raise exception 'embedding profile dimensions are immutable'; end if;
    if new.distance_metric <> old.distance_metric then raise exception 'embedding profile distance_metric is immutable'; end if;
    if new.language_scope <> old.language_scope then raise exception 'embedding profile language_scope is immutable'; end if;
    if new.policy_ref <> old.policy_ref then raise exception 'embedding profile policy_ref is immutable'; end if;
    if old.status = 'RETIRED' and new.status <> 'RETIRED' then raise exception 'retired embedding profile cannot be reactivated'; end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists knowledge_embedding_profiles_enforce on public.knowledge_embedding_profiles;
create trigger knowledge_embedding_profiles_enforce
before update on public.knowledge_embedding_profiles
for each row execute function private.enforce_knowledge_embedding_profile_invariants();

create or replace function private.enforce_knowledge_unit_embedding_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_generation_id uuid;
  v_content text;
  v_dimensions integer;
  v_profile_status text;
begin
  select d.workspace_id, d.generation_id, u.content
    into v_workspace_id, v_generation_id, v_content
  from public.knowledge_units u
  join public.knowledge_documents d on d.id = u.document_id
  where u.id = new.unit_id;

  if v_workspace_id is null then raise exception 'embedding unit is missing'; end if;
  if new.workspace_id <> v_workspace_id then raise exception 'embedding workspace does not match unit'; end if;
  if new.generation_id <> v_generation_id then raise exception 'embedding generation does not match unit'; end if;

  select p.dimensions, p.status
    into v_dimensions, v_profile_status
  from public.knowledge_embedding_profiles p
  where p.id = new.profile_id;

  if v_dimensions is null then raise exception 'embedding profile is missing'; end if;
  if v_profile_status = 'RETIRED' then raise exception 'retired embedding profile cannot receive embeddings'; end if;
  if extensions.vector_dims(new.embedding) <> v_dimensions then
    raise exception 'embedding dimension does not match profile';
  end if;

  new.content_sha256 := encode(extensions.digest(v_content, 'sha256'), 'hex');

  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id then raise exception 'embedding workspace_id is immutable'; end if;
    if new.unit_id <> old.unit_id then raise exception 'embedding unit_id is immutable'; end if;
    if new.generation_id <> old.generation_id then raise exception 'embedding generation_id is immutable'; end if;
    if new.profile_id <> old.profile_id then raise exception 'embedding profile_id is immutable'; end if;
    new.embedded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists knowledge_unit_embeddings_enforce on public.knowledge_unit_embeddings;
create trigger knowledge_unit_embeddings_enforce
before insert or update on public.knowledge_unit_embeddings
for each row execute function private.enforce_knowledge_unit_embedding_invariants();

alter table public.knowledge_embedding_profiles enable row level security;
alter table public.knowledge_unit_embeddings enable row level security;

create policy knowledge_embedding_profiles_select_authenticated
  on public.knowledge_embedding_profiles
  for select to authenticated
  using (true);

revoke all on public.knowledge_embedding_profiles from public, anon, authenticated;
grant select on public.knowledge_embedding_profiles to authenticated;
grant select, insert, update, delete on public.knowledge_embedding_profiles to service_role;

revoke all on public.knowledge_unit_embeddings from public, anon, authenticated;
grant select, insert, update, delete on public.knowledge_unit_embeddings to service_role;

create or replace function public.knowledge_semantic_coverage(p_workspace_id uuid)
returns table (
  profile_id text,
  dimensions integer,
  current_units bigint,
  embedded_current_units bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  return query
  with active_profile as (
    select p.id, p.dimensions
    from public.knowledge_embedding_profiles p
    where p.status = 'ACTIVE'
    limit 1
  ),
  current_units as (
    select u.id, d.generation_id
    from public.knowledge_units u
    join public.knowledge_documents d on d.id = u.document_id
    join public.knowledge_assets a on a.id = d.asset_id
    where u.workspace_id = p_workspace_id
      and d.workspace_id = p_workspace_id
      and a.workspace_id = p_workspace_id
      and a.processing_status = 'INDEXED'
      and a.current_generation_id = d.generation_id
      and u.validation_status <> 'REJECTED'
  )
  select
    p.id,
    p.dimensions,
    count(cu.id)::bigint,
    count(e.unit_id)::bigint
  from active_profile p
  left join current_units cu on true
  left join public.knowledge_unit_embeddings e
    on e.unit_id = cu.id
   and e.generation_id = cu.generation_id
   and e.workspace_id = p_workspace_id
   and e.profile_id = p.id
  group by p.id, p.dimensions;
end;
$$;

revoke all on function public.knowledge_semantic_coverage(uuid) from public, anon;
grant execute on function public.knowledge_semantic_coverage(uuid) to authenticated;

create or replace function public.search_knowledge_semantic_exact(
  p_workspace_id uuid,
  p_profile_id text,
  p_query_embedding extensions.vector,
  p_academic_year_id uuid default null,
  p_category text default null,
  p_discipline text default null,
  p_class_label text default null,
  p_allowed_reliability text[] default null,
  p_limit integer default 20
)
returns table (
  unit_id uuid,
  document_id uuid,
  asset_id uuid,
  generation_id uuid,
  semantic_distance double precision,
  semantic_rank bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  return query
  with active_profile as (
    select p.id, p.dimensions
    from public.knowledge_embedding_profiles p
    where p.id = p_profile_id
      and p.status = 'ACTIVE'
      and p.distance_metric = 'COSINE'
      and p.language_scope in ('ITALIAN','MULTILINGUAL')
      and extensions.vector_dims(p_query_embedding) = p.dimensions
  ),
  scored as (
    select
      u.id as unit_id,
      d.id as document_id,
      a.id as asset_id,
      d.generation_id,
      (e.embedding operator(extensions.<=>) p_query_embedding)::double precision as semantic_distance
    from active_profile p
    join public.knowledge_unit_embeddings e on e.profile_id = p.id
    join public.knowledge_units u on u.id = e.unit_id
    join public.knowledge_documents d on d.id = u.document_id
    join public.knowledge_assets a on a.id = d.asset_id
    where e.workspace_id = p_workspace_id
      and u.workspace_id = p_workspace_id
      and d.workspace_id = p_workspace_id
      and a.workspace_id = p_workspace_id
      and e.generation_id = d.generation_id
      and a.current_generation_id = d.generation_id
      and a.processing_status = 'INDEXED'
      and u.validation_status <> 'REJECTED'
      and extensions.vector_dims(e.embedding) = p.dimensions
      and (p_academic_year_id is null or a.academic_year_id = p_academic_year_id)
      and (p_category is null or a.content_category = p_category)
      and (
        p_discipline is null
        or exists (
          select 1
          from unnest(a.disciplines) as discipline(value)
          where lower(btrim(discipline.value)) = lower(btrim(p_discipline))
        )
      )
      and (
        p_class_label is null
        or exists (
          select 1
          from unnest(a.class_labels) as class_label(value)
          where lower(btrim(class_label.value)) = lower(btrim(p_class_label))
        )
      )
      and (
        p_allowed_reliability is null
        or a.reliability = any(p_allowed_reliability)
      )
  ),
  ranked as (
    select
      s.*,
      row_number() over (order by s.semantic_distance asc, s.unit_id asc) as semantic_rank
    from scored s
  )
  select
    r.unit_id,
    r.document_id,
    r.asset_id,
    r.generation_id,
    r.semantic_distance,
    r.semantic_rank
  from ranked r
  order by r.semantic_rank
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

revoke all on function public.search_knowledge_semantic_exact(uuid, text, extensions.vector, uuid, text, text, text, text[], integer) from public, anon;
grant execute on function public.search_knowledge_semantic_exact(uuid, text, extensions.vector, uuid, text, text, text, text[], integer) to authenticated;
