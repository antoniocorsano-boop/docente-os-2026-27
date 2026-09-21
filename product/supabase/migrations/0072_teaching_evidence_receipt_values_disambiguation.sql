begin;

do $patch$
declare
  evidence_def text;
begin
  select pg_get_functiondef(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure
  ) into evidence_def;

  evidence_def := replace(
    evidence_def,
    'where teaching_session_id = session_id;',
    'where r.teaching_session_id = session_id;'
  );

  evidence_def := replace(
    evidence_def,
    '    observation_ids, evidence_reference_ids\n  );',
    '    local_observation_ids, local_evidence_reference_ids\n  );'
  );

  if position('where teaching_session_id = session_id;' in evidence_def) > 0 then
    raise exception 'TE-1A receipt predicate remains unqualified';
  end if;
  if position('    observation_ids, evidence_reference_ids' in evidence_def) > 0
     and position('insert into public.teaching_session_evidence_receipts' in evidence_def) > 0 then
    -- The column list legitimately contains these names; verify the VALUES list separately.
    if position('values (\n    session_id, actor, local_registration_key, computed_signature,\n    observation_ids, evidence_reference_ids' in evidence_def) > 0 then
      raise exception 'TE-1A receipt VALUES still uses ambiguous identifiers';
    end if;
  end if;

  execute evidence_def;
end;
$patch$;

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation. Receipt predicates and VALUES expressions are explicitly disambiguated; atomic evidence semantics are unchanged.';

commit;
