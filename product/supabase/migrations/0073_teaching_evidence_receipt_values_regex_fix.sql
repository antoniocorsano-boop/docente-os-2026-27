begin;

do $patch$
declare
  base_def text;
  evidence_def text;
  nl text := chr(10);
begin
  select pg_get_functiondef(
    'private.record_teaching_session(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb)'::regprocedure
  ) into base_def;

  base_def := replace(base_def, '  session_id uuid;', '  local_session_id uuid;');
  base_def := replace(base_def, 'returning id into session_id;', 'returning id into local_session_id;');
  base_def := regexp_replace(
    base_def,
    '\)[[:space:]]*values[[:space:]]*\([[:space:]]*session_id,',
    ') values (' || nl || '        local_session_id,',
    'g'
  );
  base_def := replace(
    base_def,
    'local_registration_key, computed_signature, session_id',
    'local_registration_key, computed_signature, local_session_id'
  );
  base_def := replace(base_def, 'return session_id;', 'return local_session_id;');

  if position('  session_id uuid;' in base_def) > 0
     or position('returning id into session_id;' in base_def) > 0
     or position('local_registration_key, computed_signature, session_id' in base_def) > 0
     or position('return session_id;' in base_def) > 0 then
    raise exception 'TE-1A base session id disambiguation incomplete';
  end if;

  execute base_def;

  select pg_get_functiondef(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure
  ) into evidence_def;

  evidence_def := replace(
    evidence_def,
    'from public.teaching_session_evidence_receipts' || nl || '  where r.teaching_session_id = session_id;',
    'from public.teaching_session_evidence_receipts r' || nl || '  where r.teaching_session_id = session_id;'
  );

  evidence_def := regexp_replace(
    evidence_def,
    'values[[:space:]]*\([[:space:]]*session_id, actor, local_registration_key, computed_signature,[[:space:]]*observation_ids, evidence_reference_ids[[:space:]]*\);',
    'values (' || nl
      || '    session_id, actor, local_registration_key, computed_signature,' || nl
      || '    local_observation_ids, local_evidence_reference_ids' || nl
      || '  );',
    'g'
  );

  if position('from public.teaching_session_evidence_receipts r' in evidence_def) = 0 then
    raise exception 'TE-1A receipt alias was not installed';
  end if;
  if evidence_def ~ 'values[[:space:]]*\([[:space:]]*session_id, actor, local_registration_key, computed_signature,[[:space:]]*observation_ids, evidence_reference_ids' then
    raise exception 'TE-1A receipt VALUES still uses ambiguous identifiers';
  end if;

  execute evidence_def;
end;
$patch$;

comment on function private.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) is
  'Private canonical TeachingSession implementation. Local session and registration identifiers are explicitly disambiguated from receipt/allocation columns.';

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation. Receipt alias and local accumulator arrays are explicit; atomic evidence semantics are unchanged.';

commit;
