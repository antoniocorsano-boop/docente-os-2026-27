create table if not exists public.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  asset_kind text not null check (asset_kind in ('FILE','EMAIL','EVENT','NOTE','WEB','GENERATED')),
  source_provider text not null check (source_provider in ('UPLOAD','DRIVE','GMAIL','CALENDAR','MANUAL','SYSTEM')),
  source_locator text null,
  original_name text null,
  mime_type text null,
  byte_size bigint null check (byte_size is null or byte_size >= 0),
  sha256 text null check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  processing_status text not null default 'CAPTURED' check (processing_status in ('CAPTURED','NORMALIZED','INDEXED','FAILED')),
  source_metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_knowledge_assets_workspace_sha256
  on public.knowledge_assets(workspace_id, lower(sha256))
  where sha256 is not null;

create index if not exists idx_knowledge_assets_workspace_status
  on public.knowledge_assets(workspace_id, processing_status, captured_at desc);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.knowledge_assets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text null,
  document_type text not null default 'GENERAL' check (document_type in ('CIRCULAR','TEMPLATE','ATTESTATION','TEACHING','COMMUNICATION','GENERAL')),
  language text not null default 'it',
  normalized_text text null,
  normalized_markdown text null,
  summary text null,
  extracted_data jsonb not null default '{}'::jsonb,
  processing_version text not null default 'kb-v1',
  search_vector tsvector generated always as (
    to_tsvector('italian'::regconfig, coalesce(title,'') || ' ' || coalesce(normalized_text,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_documents_search
  on public.knowledge_documents using gin(search_vector);
create index if not exists idx_knowledge_documents_workspace_type
  on public.knowledge_documents(workspace_id, document_type);

create table if not exists public.knowledge_units (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ordinal integer not null default 0 check (ordinal >= 0),
  unit_type text not null check (unit_type in ('CHUNK','ENTITY','DATE','DEADLINE','ACTION','PERSON','CLASS','TOPIC','RULE')),
  title text null,
  content text not null,
  structured_data jsonb not null default '{}'::jsonb,
  source_page integer null check (source_page is null or source_page > 0),
  start_offset integer null check (start_offset is null or start_offset >= 0),
  end_offset integer null check (end_offset is null or end_offset >= 0),
  confidence numeric(4,3) null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  validation_status text not null default 'AUTO' check (validation_status in ('AUTO','REVIEWED','REJECTED')),
  search_vector tsvector generated always as (
    to_tsvector('italian'::regconfig, coalesce(title,'') || ' ' || content)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_units_offset_ck check (
    end_offset is null or start_offset is null or end_offset >= start_offset
  )
);

create unique index if not exists uq_knowledge_units_document_ordinal
  on public.knowledge_units(document_id, ordinal);
create index if not exists idx_knowledge_units_search
  on public.knowledge_units using gin(search_vector);
create index if not exists idx_knowledge_units_workspace_type
  on public.knowledge_units(workspace_id, unit_type, validation_status);

create table if not exists public.knowledge_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid null references public.knowledge_assets(id) on delete cascade,
  unit_id uuid null references public.knowledge_units(id) on delete cascade,
  relation_type text not null,
  target_type text not null,
  target_ref text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint knowledge_links_source_ck check (num_nonnulls(asset_id, unit_id) = 1)
);

create index if not exists idx_knowledge_links_workspace_target
  on public.knowledge_links(workspace_id, target_type, target_ref);
create index if not exists idx_knowledge_links_asset on public.knowledge_links(asset_id) where asset_id is not null;
create index if not exists idx_knowledge_links_unit on public.knowledge_links(unit_id) where unit_id is not null;

create table if not exists public.knowledge_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid not null references public.knowledge_assets(id) on delete cascade,
  stage text not null check (stage in ('CAPTURE','TEXT_EXTRACT','NORMALIZE','CLASSIFY','STRUCTURE','CHUNK','ENRICH','INDEX','LINK')),
  status text not null check (status in ('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED')),
  processor text not null,
  processor_version text null,
  details jsonb not null default '{}'::jsonb,
  error_code text null,
  error_message text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint knowledge_ingestion_finished_ck check (
    finished_at is null or started_at is null or finished_at >= started_at
  )
);

create index if not exists idx_knowledge_ingestion_asset_created
  on public.knowledge_ingestion_runs(asset_id, created_at desc);

create or replace function private.enforce_knowledge_asset_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id then raise exception 'knowledge asset workspace_id is immutable'; end if;
    if new.created_by <> old.created_by then raise exception 'knowledge asset created_by is immutable'; end if;
    if new.asset_kind <> old.asset_kind then raise exception 'knowledge asset kind is immutable'; end if;
    if new.source_provider <> old.source_provider then raise exception 'knowledge asset source_provider is immutable'; end if;
    if new.source_locator is distinct from old.source_locator then raise exception 'knowledge asset source_locator is immutable'; end if;
    if new.sha256 is distinct from old.sha256 then raise exception 'knowledge asset sha256 is immutable'; end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger knowledge_assets_enforce_invariants
before update on public.knowledge_assets
for each row execute function private.enforce_knowledge_asset_invariants();

create or replace function private.touch_kb_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger knowledge_documents_touch before update on public.knowledge_documents
for each row execute function private.touch_kb_updated_at();
create trigger knowledge_units_touch before update on public.knowledge_units
for each row execute function private.touch_kb_updated_at();

alter table public.knowledge_assets enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_units enable row level security;
alter table public.knowledge_links enable row level security;
alter table public.knowledge_ingestion_runs enable row level security;

create policy knowledge_assets_select_member on public.knowledge_assets for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_assets_insert_member on public.knowledge_assets for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
  and (academic_year_id is null or exists (
    select 1 from public.academic_years ay
    where ay.id = academic_year_id and ay.workspace_id = knowledge_assets.workspace_id
  ))
);
create policy knowledge_assets_update_member on public.knowledge_assets for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

create policy knowledge_documents_member_all on public.knowledge_documents for all to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_documents.workspace_id
  )
);

create policy knowledge_units_member_all on public.knowledge_units for all to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_documents d
    where d.id = document_id and d.workspace_id = knowledge_units.workspace_id
  )
);

create policy knowledge_links_member_all on public.knowledge_links for all to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy knowledge_ingestion_member_all on public.knowledge_ingestion_runs for all to authenticated
using (private.is_workspace_member(workspace_id))
with check (
  private.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.knowledge_assets a
    where a.id = asset_id and a.workspace_id = knowledge_ingestion_runs.workspace_id
  )
);

grant select, insert, update on public.knowledge_assets to authenticated;
grant select, insert, update, delete on public.knowledge_documents to authenticated;
grant select, insert, update, delete on public.knowledge_units to authenticated;
grant select, insert, update, delete on public.knowledge_links to authenticated;
grant select, insert, update, delete on public.knowledge_ingestion_runs to authenticated;

revoke all on public.knowledge_assets from anon;
revoke all on public.knowledge_documents from anon;
revoke all on public.knowledge_units from anon;
revoke all on public.knowledge_links from anon;
revoke all on public.knowledge_ingestion_runs from anon;
