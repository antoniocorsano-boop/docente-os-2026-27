-- P3 data lifecycle verification — read only.
-- Verifies the current ownership/cascade contract without deleting data.

select
  conrelid::regclass::text as table_name,
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'workspaces_owner_user_id_fkey',
  'workspace_memberships_user_id_fkey',
  'workspace_memberships_workspace_id_fkey'
)
order by conname;

select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and kcu.column_name = 'workspace_id'
order by tc.table_name;

select
  bucket_id,
  count(*)::bigint as object_count,
  coalesce(sum((metadata->>'size')::bigint), 0)::bigint as bytes_recorded
from storage.objects
group by bucket_id
order by bucket_id;
