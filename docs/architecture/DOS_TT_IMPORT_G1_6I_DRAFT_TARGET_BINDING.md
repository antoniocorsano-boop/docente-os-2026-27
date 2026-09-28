# DOS-TT-IMPORT-01 — G1.6-I Draft Target Binding / Concurrency Preflight

## Stato
**DESIGN / DOMAIN — FAIL-CLOSED — NON_PERSISTED / NON_APPLICATIVE — HOLD_PRODUCTION_APPLY**

Baseline: `develop@b62b60794babfcd0aec5505fc669942e5fedfc55`.

## Scopo
G1.6-H dimostra che il candidato confermato è semanticamente pronto (`READY`) e possiede intervalli temporali espliciti. Prima di qualsiasi futura scrittura serve però legare quella readiness a **una specifica DRAFT canonica** e a **uno specifico stato concorrente della DRAFT**.

G1.6-I introduce esclusivamente questo preflight.

Catena:

`G1.6-H READY -> G1.6-I DRAFT target binding -> futura capability atomica separata`

## Problema di concorrenza verificato
T1 espone oggi:
- `timetable_versions.updated_at`;
- `timetable_slots.updated_at`;
- una sola DRAFT per `workspace_id + academic_year_id`.

La modifica degli slot non aggiorna necessariamente `timetable_versions.updated_at`. Quindi **la revisione della sola riga versione non identifica l'intero stato della DRAFT**.

Per una futura sostituzione atomica degli slot è obbligatorio un **revision token autorevole aggregato** che copra almeno:
- identità/versione della DRAFT;
- metadati rilevanti;
- insieme canonico corrente degli slot.

G1.6-I consuma tale token come precondizione ma **non lo genera ancora**.

## Input governati
1. `TimetableImportApplyReadiness` G1.6-H;
2. snapshot della DRAFT target:
   - `TimetableVersion`;
   - `revisionToken` aggregato;
3. contesto target esplicito:
   - `workspaceId`;
   - `academicYearId`;
   - `expectedRevisionToken`.

## Precondizioni per BOUND
- readiness = `READY`;
- target status = `DRAFT`;
- workspace e anno coincidono esattamente con il contesto governato;
- `target.effectiveFrom === readiness.effectiveFrom`;
- revision token presente;
- revision token corrente = revision token atteso.

Qualunque violazione produce `BLOCKED`.

## Semantica
`BOUND` significa soltanto:

> la readiness è stata collegata deterministicamente a una DRAFT canonica e a uno stato concorrente esatto che una futura transazione dovrà ricontrollare.

Non significa:
- applicabile automaticamente;
- autorizzato a scrivere;
- lock acquisito;
- claim atomico acquisito;
- DRAFT modificata;
- versione attivata.

## Revision token
Il token è opaco per il dominio G1.6-I.

La futura boundary autorevole dovrà calcolarlo in modo deterministico sullo stato DB effettivo e ricontrollarlo **dentro la stessa transazione** che eventualmente sostituirà gli slot.

Non è valido usare come equivalente:
- il solo `timetable_versions.updated_at`;
- timestamp client;
- ordine di lettura;
- fingerprint del documento sorgente;
- candidateId.

## Fuori scope
- migrazione DB per revision counter/hash;
- generazione del revision token;
- lock DB;
- claim/idempotency key;
- selezione automatica o creazione della DRAFT;
- update metadati DRAFT;
- delete/insert/upsert di `timetable_slots`;
- RPC/Server Action;
- rollback applicativo;
- `DRAFT -> ACTIVE`;
- chiusura versione precedente;
- replan;
- CAN-PLAN;
- DOS-A1.

## Gate
1. READY + DRAFT + contesto esatto + revision exact-match -> BOUND;
2. readiness non READY -> BLOCKED;
3. target non DRAFT -> BLOCKED;
4. workspace/anno mismatch -> BLOCKED;
5. effectiveFrom mismatch -> BLOCKED;
6. revision assente -> BLOCKED;
7. revision mismatch -> BLOCKED;
8. input immutati;
9. nessuna dipendenza Supabase/Server Action/RPC;
10. test G1.6-I inclusi nella suite governata;
11. regressioni G1.6-A→H PASS;
12. CI completa PASS;
13. revisione indipendente;
14. HUMAN REVIEW prima del merge.

Restano invariati `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.
