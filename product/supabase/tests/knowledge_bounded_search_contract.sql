create or replace function pg_temp.assert_true(value boolean, label text)
returns void
language plpgsql
as $$
begin
  if coalesce(value,false) is not true then
    raise exception 'KNOWLEDGE BOUNDED SEARCH FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

select pg_temp.assert_true(
  to_regprocedure('public.search_knowledge_full_text_current(uuid,text,integer)') is not null,
  '01 bounded full-text RPC installed'
);

select pg_temp.assert_true(
  (
    select p.prosecdef
    from pg_catalog.pg_proc p
    where p.oid='public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  ),
  '02 bounded search is SECURITY DEFINER'
);

select pg_temp.assert_true(
  (
    select coalesce(array_to_string(p.proconfig,','),'')
    from pg_catalog.pg_proc p
    where p.oid='public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  ) like '%search_path=%',
  '03 bounded search closes search_path'
);

select pg_temp.assert_true(
  has_function_privilege('authenticated','public.search_knowledge_full_text_current(uuid,text,integer)','EXECUTE')
  and not has_function_privilege('anon','public.search_knowledge_full_text_current(uuid,text,integer)','EXECUTE'),
  '04 authenticated-only execution'
);

select pg_temp.assert_true(
  position('a.current_generation_id = d.generation_id' in pg_get_functiondef(
    'public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  )) > 0,
  '05 current generation filter enforced in DB'
);

select pg_temp.assert_true(
  position('u.search_vector @@ v_tsquery' in pg_get_functiondef(
    'public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  )) > 0,
  '06 indexed full-text predicate enforced in DB'
);

select pg_temp.assert_true(
  position('limit v_limit' in lower(pg_get_functiondef(
    'public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  ))) > 0,
  '07 DB-side bounded limit enforced'
);

select pg_temp.assert_true(
  position('u.validation_status <> ''REJECTED''' in pg_get_functiondef(
    'public.search_knowledge_full_text_current(uuid,text,integer)'::regprocedure
  )) > 0,
  '08 rejected units excluded'
);

select pg_temp.assert_true(
  (
    select migration_id
    from public.runtime_schema_contract_state
    where singleton
  ) = '0079_knowledge_full_text_bounded_search',
  '09 runtime schema watermark advanced'
);

select 'KNOWLEDGE_BOUNDED_SEARCH_CONTRACT_PASS';
