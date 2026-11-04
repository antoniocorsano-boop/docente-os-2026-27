\set ON_ERROR_STOP on

-- CURR-DELIVERY-02B SQL behavior qualification on ephemeral Supabase ONLY.
-- Uses fictional users and metadata-only Storage objects, rolled back below.
-- No blob is uploaded here; actual authenticated Storage HTTP delivery remains
-- a separate Human + Product Review gate before any production activation.
begin;

create or replace function pg_temp.arena_assert(ok boolean, description text)
returns void
language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'ARENA-ACL behavior FAIL: %', description;
  end if;
  raise notice 'ARENA-ACL PASS: %', description;
end;
$$;

select pg_temp.arena_assert(
  exists (
    select 1 from storage.buckets
    where id = 'arena-curricolo-private'
      and public is false
      and file_size_limit = 2000000
      and allowed_mime_types = array['application/json']::text[]
  ), '00 bucket is private and JSON-only'
);

select pg_temp.arena_assert(
  not has_table_privilege('authenticated',
    'private.arena_provisional_delivery_read_grants', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated',
    'private.arena_provisional_delivery_active_binding', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon',
    'private.arena_provisional_delivery_read_grants', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon',
    'private.arena_provisional_delivery_active_binding', 'SELECT,INSERT,UPDATE,DELETE'),
  '01 private grants and active binding are not client-readable or writable'
);

insert into auth.users(id, email) values
 ('00000000-0000-4000-8000-00000000c201','arena-clr-owner@example.invalid'),
 ('00000000-0000-4000-8000-00000000c202','arena-clr-member@example.invalid'),
 ('00000000-0000-4000-8000-00000000c203','arena-clr-nonmember@example.invalid');

insert into public.workspaces(id, kind, name, owner_user_id) values
 ('00000000-0000-4000-8000-00000000c210','PERSONAL','ARENA-ACL workspace A','00000000-0000-4000-8000-00000000c201'),
 ('00000000-0000-4000-8000-00000000c220','PERSONAL','ARENA-ACL workspace B','00000000-0000-4000-8000-00000000c201');

insert into public.workspace_memberships(workspace_id,user_id,role) values
 ('00000000-0000-4000-8000-00000000c210','00000000-0000-4000-8000-00000000c201','OWNER'),
 ('00000000-0000-4000-8000-00000000c220','00000000-0000-4000-8000-00000000c201','OWNER'),
 ('00000000-0000-4000-8000-00000000c210','00000000-0000-4000-8000-00000000c202','MEMBER');

insert into public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active) values
 ('00000000-0000-4000-8000-00000000c211','00000000-0000-4000-8000-00000000c210','2026/2027','2026-09-01','2027-08-31',false),
 ('00000000-0000-4000-8000-00000000c221','00000000-0000-4000-8000-00000000c220','2026/2027','2026-09-01','2027-08-31',false),
 ('00000000-0000-4000-8000-00000000c212','00000000-0000-4000-8000-00000000c210','2025/2026','2025-09-01','2026-08-31',false);

insert into private.arena_provisional_delivery_read_grants(
  workspace_id, academic_year_id, user_id,
  source_sha256, source_revision_id, source_master_version,
  access_receipt_ref, granted_by, enabled
) values
 ('00000000-0000-4000-8000-00000000c210','00000000-0000-4000-8000-00000000c211',
  '00000000-0000-4000-8000-00000000c201',
  '2d34d69a8e3e4df92b2282d0b232353bfe9fd0174ed3335ca0cae878184c9998',
  '27','1.3','ARENA-ACL-FIXTURE-OWNER','00000000-0000-4000-8000-00000000c201',false),
 ('00000000-0000-4000-8000-00000000c220','00000000-0000-4000-8000-00000000c221',
  '00000000-0000-4000-8000-00000000c201',
  '2d34d69a8e3e4df92b2282d0b232353bfe9fd0174ed3335ca0cae878184c9998',
  '27','1.3','ARENA-ACL-FIXTURE-FOREIGN','00000000-0000-4000-8000-00000000c201',true),
 ('00000000-0000-4000-8000-00000000c210','00000000-0000-4000-8000-00000000c211',
  '00000000-0000-4000-8000-00000000c203',
  '2d34d69a8e3e4df92b2282d0b232353bfe9fd0174ed3335ca0cae878184c9998',
  '27','1.3','ARENA-ACL-FIXTURE-NONMEMBER','00000000-0000-4000-8000-00000000c201',true);

insert into private.arena_provisional_delivery_active_binding(
  source_key, workspace_id, academic_year_id, source_sha256,
  authorization_receipt_ref, bound_by, enabled
) values (
  'arena-1.3-rev27', '00000000-0000-4000-8000-00000000c210',
  '00000000-0000-4000-8000-00000000c211',
  '2d34d69a8e3e4df92b2282d0b232353bfe9fd0174ed3335ca0cae878184c9998',
  'ARENA-ACL-FIXTURE-SOURCE', '00000000-0000-4000-8000-00000000c201', false
);

-- Metadata-only fixtures exist in the *ephemeral* DB transaction, not
-- in production or underlying Storage bytes. Verify actual RLS SELECT,
-- including path exactness and Storage operation context.
insert into storage.objects(bucket_id,name) values
 ('arena-curricolo-private',
  '00000000-0000-4000-8000-00000000c210/vertical/2026-2027/master-1.3-rev27/complete-release.json'),
 ('arena-curricolo-private',
  '00000000-0000-4000-8000-00000000c220/vertical/2026-2027/master-1.3-rev27/complete-release.json'),
 ('arena-curricolo-private',
  '00000000-0000-4000-8000-00000000c210/vertical/2026-2027/master-1.3-rev27/other.json'),
 ('arena-curricolo-private',
  '00000000-0000-4000-8000-00000000c210/vertical/2026-2027/master-1.2-rev27/complete-release.json');

select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-00000000c201","role":"authenticated","is_anonymous":false}',true);
select set_config('storage.operation','object.get_authenticated',true);
set local role authenticated;

select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210'),
  '02 disabled personal grant AND source binding deny access'
);

reset role;
update private.arena_provisional_delivery_read_grants set enabled=true
where user_id='00000000-0000-4000-8000-00000000c201'
  and workspace_id='00000000-0000-4000-8000-00000000c210';
set local role authenticated;
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210'),
  '03 grant alone does not authorize a disabled source binding'
);

reset role;
update private.arena_provisional_delivery_active_binding set enabled=true;
set local role authenticated;

select pg_temp.arena_assert(
  private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210'),
  '04 enabled grant AND enabled binding AND membership allow source workspace A'
);
select pg_temp.arena_assert(
  (select count(*) from storage.objects
   where bucket_id='arena-curricolo-private')=1,
  '05 authenticated download sees only exact object for bound workspace A'
);
select pg_temp.arena_assert(
  (select count(*) from storage.objects
   where name='00000000-0000-4000-8000-00000000c220/vertical/2026-2027/master-1.3-rev27/complete-release.json')=0,
  '06 membership and even a grant in workspace B do not leak workspace A binding'
);
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c220'),
  '07 grant in foreign workspace does not authorize direct helper access'
);

select set_config('storage.operation','object.list',true);
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '08 even authorized teacher cannot enumerate private bucket'
);
select set_config('storage.operation','',true);
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '09 missing Storage operation fails closed'
);
select set_config('storage.operation','object.get_authenticated_info',true);
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=1,
  '10 only authenticated object metadata operation is selectively allowed'
);
select set_config('storage.operation','object.get_authenticated',true);

-- An ordinary member without a grant must not inherit the owner's privilege.
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-00000000c202","role":"authenticated","is_anonymous":false}',true);
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '11 member without an individual read grant is denied'
);

select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-00000000c203","role":"authenticated","is_anonymous":false}',true);
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '12 explicit grant without workspace membership is denied'
);

select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-00000000c201","role":"authenticated","is_anonymous":true}',true);
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '13 anonymous authenticated session is denied'
);

select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '14 absent user identity fails closed'
);
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '15 unauthenticated public role cannot read any private object'
);

reset role;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-00000000c201","role":"authenticated","is_anonymous":false}',true);
-- Mismatched year is not authorization even if both records are changed to it.
update private.arena_provisional_delivery_read_grants
set academic_year_id='00000000-0000-4000-8000-00000000c212'
where workspace_id='00000000-0000-4000-8000-00000000c210'
  and user_id='00000000-0000-4000-8000-00000000c201';
update private.arena_provisional_delivery_active_binding
set academic_year_id='00000000-0000-4000-8000-00000000c212';
set local role authenticated;
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '16 a matching grant and binding for another academic year are still denied'
);

reset role;
update private.arena_provisional_delivery_read_grants
set academic_year_id='00000000-0000-4000-8000-00000000c211'
where workspace_id='00000000-0000-4000-8000-00000000c210'
  and user_id='00000000-0000-4000-8000-00000000c201';
update private.arena_provisional_delivery_active_binding
set academic_year_id='00000000-0000-4000-8000-00000000c211';
set local role authenticated;
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=1,
  '17 restoring valid grant/year restores only exact permitted object'
);

-- The authenticated DB role must never mutate the source content or its ACL.
create or replace function pg_temp.arena_expect_write_denied(command_sql text)
returns void
language plpgsql
as $$
declare
  affected integer;
begin
  begin
    execute command_sql;
    get diagnostics affected=row_count;
    if affected <> 0 then
      raise exception 'ARENA-ACL behavior FAIL: authenticated write affected % objects', affected;
    end if;
  exception
    when insufficient_privilege then
      null; -- privilege error / RLS denial is the expected outcome
  end;
end;
$$;

select pg_temp.arena_expect_write_denied(
  'insert into storage.objects(bucket_id,name) values (''arena-curricolo-private'',''00000000-0000-4000-8000-00000000c210/unapproved.json'')'
);
select pg_temp.arena_expect_write_denied(
  'update storage.objects set name=name || ''.tampered'' where bucket_id=''arena-curricolo-private'''
);
select pg_temp.arena_expect_write_denied(
  'delete from storage.objects where bucket_id=''arena-curricolo-private'''
);
select pg_temp.arena_assert(
  (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=1,
  '18 authenticated client cannot insert, mutate, or delete Storage metadata'
);

reset role;
update private.arena_provisional_delivery_read_grants set enabled=false
where workspace_id='00000000-0000-4000-8000-00000000c210'
  and user_id='00000000-0000-4000-8000-00000000c201';
set local role authenticated;
select pg_temp.arena_assert(
  not private.can_read_arena_provisional_release_v1('00000000-0000-4000-8000-00000000c210')
  and (select count(*) from storage.objects where bucket_id='arena-curricolo-private')=0,
  '19 revoking a user grant denies previously permitted download immediately'
);

reset role;
select pg_temp.arena_assert(
  (select count(*) from private.arena_provisional_delivery_active_binding)=1
  and (select count(*) from private.arena_provisional_delivery_read_grants)=3,
  '20 fixtures were isolated to a rollback-only test transaction'
);

rollback;
