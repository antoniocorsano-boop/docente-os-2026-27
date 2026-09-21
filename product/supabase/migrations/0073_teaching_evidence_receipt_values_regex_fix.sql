begin;

do $patch$
declare
  evidence_def text;
begin
  select pg_get_functiondef(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure
  ) into evidence_def;

  evidence_def := regexp_replace(
    evidence_def,
    'values[[:space:]]*\([[:space:]]*session_id, actor, local_registration_key, computed_signature,[[:space:]]*observation_ids, evidence_reference_ids[[:space:]]*\);',
    'values (\n    session_id, actor, local_registration_key, computed_signature,\n    local_observation_ids, local_evidence_reference_ids\n  );',
    'g'
  );

  if evidence_def ~ 'values[[:space:]]*\([[:space:]]*session_id, actor, local_registration_key, computed_signature,[[:space:]]*observation_ids, evidence_reference_ids' then
    raise exception 'TE-1A receipt VALUES still uses ambiguous identifiers';
  end if;

  execute evidence_def;
end;
$patch$;

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation. Receipt VALUES uses disambiguated local accumulator arrays; atomic evidence semantics are unchanged.';

commit;
