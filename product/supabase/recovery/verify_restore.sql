-- DOCENTE OS recovery verification
-- Run against an isolated restored/duplicated project, never as a destructive action on the canonical Beta.

select current_database() as database_name, now() as verified_at;

select exists(select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') as auth_users_present,
       exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'workspaces') as workspaces_present,
       exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'knowledge_assets') as knowledge_assets_present,
       exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'planner_tasks') as planner_tasks_present,
       exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'authored_documents') as authored_documents_present,
       exists(select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') as storage_metadata_present;

select count(*) as auth_users from auth.users;
select count(*) as workspaces from public.workspaces;
select count(*) as academic_years from public.academic_years;
select count(*) as planner_tasks from public.planner_tasks;
select count(*) as knowledge_assets from public.knowledge_assets;
select count(*) as knowledge_documents from public.knowledge_documents;
select count(*) as knowledge_generations from public.knowledge_processing_generations;
select count(*) as authored_documents from public.authored_documents;
select count(*) as authored_document_versions from public.authored_document_versions;
select count(*) as assistant_write_proposals from public.assistant_write_proposals;

select b.id as bucket_id,
       count(o.id) as object_count,
       coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes_recorded
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id
order by b.id;

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;

select n.nspname as schema_name,
       p.proname,
       p.prosecdef as security_definer,
       p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'authored_document_snapshot',
    'discard_authored_document',
    'open_uda_authoring',
    'save_authored_document_version'
  )
order by p.proname;
