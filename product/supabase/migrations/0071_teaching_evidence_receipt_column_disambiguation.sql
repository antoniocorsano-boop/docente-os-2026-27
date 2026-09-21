begin;

do $patch$
declare
  evidence_def text;
begin
  select pg_get_functiondef(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure
  ) into evidence_def;

  -- Qualify receipt columns so PL/pgSQL never confuses them with local arrays.
  evidence_def := replace(
    evidence_def,
    'select request_signature, observation_ids, evidence_reference_ids',
    'select r.request_signature, r.observation_ids, r.evidence_reference_ids'
  );
  evidence_def := replace(
    evidence_def,
    'from public.teaching_session_evidence_receipts\n  where teaching_session_id = session_id;',
    'from public.teaching_session_evidence_receipts r\n  where r.teaching_session_id = session_id;'
  );

  -- Rename local accumulator arrays as an additional guard against future ambiguity.
  evidence_def := replace(evidence_def, '  observation_ids uuid[] := ''{}'';', '  local_observation_ids uuid[] := ''{}'';');
  evidence_def := replace(evidence_def, '  evidence_reference_ids uuid[] := ''{}'';', '  local_evidence_reference_ids uuid[] := ''{}'';');
  evidence_def := replace(evidence_def, 'observation_ids := array_append(observation_ids, new_observation_id);', 'local_observation_ids := array_append(local_observation_ids, new_observation_id);');
  evidence_def := replace(evidence_def, 'evidence_reference_ids := array_append(evidence_reference_ids, new_evidence_id);', 'local_evidence_reference_ids := array_append(local_evidence_reference_ids, new_evidence_id);');
  evidence_def := replace(evidence_def, 'observation_ids, evidence_reference_ids\n  ) values (', 'observation_ids, evidence_reference_ids\n  ) values (');
  evidence_def := replace(evidence_def, '    observation_ids, evidence_reference_ids\n  );', '    local_observation_ids, local_evidence_reference_ids\n  );');
  evidence_def := replace(evidence_def, '''observation_ids'', to_jsonb(observation_ids)', '''observation_ids'', to_jsonb(local_observation_ids)');
  evidence_def := replace(evidence_def, '''evidence_reference_ids'', to_jsonb(evidence_reference_ids)', '''evidence_reference_ids'', to_jsonb(local_evidence_reference_ids)');

  if position('select request_signature, observation_ids, evidence_reference_ids' in evidence_def) > 0 then
    raise exception 'TE-1A receipt select remains ambiguous';
  end if;
  if position('  observation_ids uuid[] :=' in evidence_def) > 0
     or position('  evidence_reference_ids uuid[] :=' in evidence_def) > 0 then
    raise exception 'TE-1A local receipt arrays remain ambiguous';
  end if;

  execute evidence_def;
end;
$patch$;

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation. Receipt columns are explicitly qualified and local receipt arrays use disambiguated names; atomic evidence semantics are unchanged.';

commit;
