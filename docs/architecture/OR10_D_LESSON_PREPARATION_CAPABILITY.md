# OR-10-D — Docente OS Lesson Preparation Capability Boundary

**Stato:** PROPOSED / PROPOSE_ONLY / NO_RUNTIME  
**Decision owner:** DOCENTE  
**DOS-A1:** RUNTIME_DEFERRED

## Scopo

Definire come il workspace di preparazione/lezione possa consumare `lesson.preparation.observe` senza trasferire decisioni professionali alla capability.

## Punto di integrazione

Il consumer resta Docente OS e si colloca nel flusso:
`Classe -> fase/piano -> preparazione -> lezione`.

La capability può restituire soltanto una proposta o osservazione.

## Stato proposta

```ts
type CapabilityProposalState =
  | 'PROPOSED'
  | 'ACCEPTED_BY_TEACHER'
  | 'MODIFIED_BY_TEACHER'
  | 'REPLACED_BY_TEACHER'
  | 'EXCLUDED_BY_TEACHER'
```

Solo il docente può produrre gli ultimi quattro stati.

## Regole

- nessuna scrittura silenziosa;
- nessuna auto-adozione;
- Atlas resta opzionale;
- fallimento capability non blocca la preparazione manuale;
- provenance/source refs visibili;
- nessun runtime live in OR-10-D v0.

## Invarianti

- OR10-D-01 teacher decision preserved;
- OR10-D-02 proposal distinguishable from canonical lesson state;
- OR10-D-03 fallback manuale sempre disponibile;
- OR10-D-04 provenance preservata;
- OR10-D-05 Atlas optional;
- OR10-D-06 DOS-A1 invariato.

## Exit

La slice è qualificabile quando il confine PROPOSE_ONLY è documentato e i gate Docente OS restano PASS.
