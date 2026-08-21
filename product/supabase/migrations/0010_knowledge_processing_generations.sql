create table if not exists public.knowledge_processing_generations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.knowledge_assets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  generation_no integer not null check (generation_no > 0),
  status text not null check (status in ('RUNNING','SUCCEEDED','FAILED')),
  processor_label text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  unique(asset_id, generation_no)
);

alter table public.knowledge_documents add column if not exists generation_id uuid null references public.knowledge_processing_generations(id) on delete restrict;
alter table public.knowledge_assets add column if not exists current_generation_id uuid null references public.knowledge_processing_generations(id) on delete restrict;

insert into public.knowledge_processing_generations (asset_id, workspace_id, generation_no, status, processor_label, started_at, finished_at)
select d.asset_id, d.workspace_id, 1, 'SUCCEEDED', d.processing_version, d.created_at, d.updated_at
from public.knowledge_documents d
where not exists (
  select 1 from public.knowledge_processing_generations g where g.asset_id = d.asset_id
);

update public.knowledge_documents d
set generation_id = g.id
from public.knowledge_processing_generations g
where g.asset_id = d.asset_id and g.generation_no = 1 and d.generation_id is null;

update public.knowledge_assets a
set current_generation_id = g.id
from public.knowledge_processing_generations g
where g.asset_id = a.id and g.status = 'SUCCEEDED' and a.current_generation_id is null;

alter table public.knowledge_documents alter column generation_id set not null;

alter table public.knowledge_documents drop constraint if exists knowledge_documents_asset_id_key;
drop index if exists knowledge_documents_asset_id_key;
create unique index if not exists uq_knowledge_documents_asset_generation on public.knowledge_documents(asset_id, generation_id);
create index if not exists idx_knowledge_generations_asset on public.knowledge_processing_generations(asset_id, generation_no desc);

alter table public.knowledge_processing_generations enable row level security;
create policy knowledge_generations_select_member on public.knowledge_processing_generations for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy knowledge_generations_insert_member on public.knowledge_processing_generations for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and exists (select 1 from public.knowledge_assets a where a.id = asset_id and a.workspace_id = knowledge_processing_generations.workspace_id)
);
create policy knowledge_generations_update_member on public.knowledge_processing_generations for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

grant select, insert, update on public.knowledge_processing_generations to authenticated;
revoke all on public.knowledge_processing_generations from anon;

create or replace function private.enforce_knowledge_generation_invariants()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id then raise exception 'knowledge generation workspace_id is immutable'; end if;
  if new.asset_id <> old.asset_id then raise exception 'knowledge generation asset_id is immutable'; end if;
  if new.generation_no <> old.generation_no then raise exception 'knowledge generation number is immutable'; end if;
  new.created_at := old.created_at;
  return new;
end;
$$;
create trigger knowledge_generations_enforce before update on public.knowledge_processing_generations
for each row execute function private.enforce_knowledge_generation_invariants();
