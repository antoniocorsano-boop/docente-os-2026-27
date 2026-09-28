# DOS-TT-IMPORT-01 — G1.6-H Apply Readiness Boundary

## Stato
**DESIGN / DOMAIN — FAIL-CLOSED — NON_PERSISTED / NON_APPLICATIVE — HOLD_PRODUCTION_APPLY**

Baseline: `develop@31fc17b02cc79011802120d89b958dc73e5f3bee`.

## Motivazione
G1.6-C conserva la posizione sorgente (`sourcePosition`) ma il runtime canonico persiste slot con `start_time` e `end_time` reali. Una posizione come “1ª ora”, una coordinata di tabella o un indice non può essere trasformata implicitamente in un intervallo temporale.

G1.6-H chiude questo gap senza scrivere nel database: richiede un binding temporale esplicito per ogni slot candidato e produce una proiezione deterministica pronta per una futura persistenza governata.

## Autorità
La catena resta:

`G1.6-C Candidate -> G1.6-D Preview -> G1.6-E HumanDecisionReceipt -> G1.6-H ApplyReadiness`

G1.6-H:
- non ri-resolve il docente;
- non ricostruisce il candidato;
- non accetta la RPC legacy G1.2 come autorità;
- non attiva `activate_timetable_version`;
- non crea o modifica una DRAFT;
- non chiude intervalli di validità;
- non esegue replan.

## Input governati
1. `TimetableImportCandidate` G1.6-C;
2. `TimetableImportHumanDecisionReceipt` G1.6-E;
3. binding temporali espliciti, uno per ogni coppia `day + sourcePosition`:
   - `day`;
   - `sourcePosition`;
   - `startTime`;
   - `endTime`;
   - `ordinal?`.

Il binding temporale è configurazione esplicita. Non può essere inferito da:
- ordine delle righe;
- etichette “prima/seconda ora”;
- preset UI;
- orario precedente;
- filename o metadati;
- T/D/DIS.

## Precondizioni
La readiness è `READY` soltanto se:
- candidate `PREVIEW_READY / READY`;
- `candidateId` e provenance presenti;
- receipt = `CONFIRM_PREVIEW`;
- candidateId e sourceFingerprint del receipt coincidono esattamente con il candidato;
- ogni slot ha `teacherResolutionState=RESOLVED` e `resolvedAssignmentId`;
- esiste esattamente un binding per ogni coppia `day + sourcePosition`;
- non esistono binding extra;
- `day` è 1..6;
- tempi in formato HH:MM e `endTime > startTime`;
- non esistono overlap temporali nello stesso giorno.

Qualunque violazione produce `BLOCKED` con reason code deterministico.

## Output
In stato `READY`, l'output contiene esclusivamente una proiezione normalizzata:
- contract version;
- candidateId;
- sourceFingerprint;
- effectiveFrom derivato dalla provenance;
- slot:
  - day;
  - sourcePosition;
  - classLabel;
  - sourceTeacherLabel;
  - resolvedAssignmentId;
  - startTime;
  - endTime;
  - ordinal.

L'output non contiene:
- workspaceId;
- academicYearId;
- timetableVersionId;
- draft revision;
- capability token;
- flag `canApply`;
- chiamate Supabase/RPC;
- DRAFT/ACTIVE transition.

## Semantica
`READY` significa soltanto:

> tutti i dati necessari per descrivere deterministicamente gli slot importati sono presenti e coerenti con la decisione umana esatta.

Non significa “applica” e non autorizza una mutazione runtime.

## Idempotenza
A parità di candidate, receipt e binding temporali, l'output è identico. Nessun timestamp viene generato internamente.

## Gate minimi
1. CONFIRM esatto + coverage temporale completa -> READY;
2. REJECT -> BLOCKED;
3. candidate/fingerprint mismatch -> BLOCKED;
4. candidato non pronto -> BLOCKED;
5. slot non risolto -> BLOCKED;
6. binding mancante -> BLOCKED;
7. binding extra -> BLOCKED;
8. binding duplicato -> BLOCKED;
9. tempo invalido -> BLOCKED;
10. overlap stesso giorno -> BLOCKED;
11. input immutati;
12. nessuna dipendenza Supabase/Server Action/RPC;
13. regressioni G1.6-A→G PASS.

## Fuori scope
- persistenza receipt/readiness;
- selezione/creazione della DRAFT target;
- optimistic concurrency / claim atomico DB;
- scrittura `timetable_slots`;
- attivazione della versione;
- chiusura della versione precedente;
- rollback applicativo;
- replan;
- CAN-PLAN;
- DOS-A1.

Restano invariati `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.

## Gate di chiusura
- contratto e implementazione coerenti;
- test negativi/fail-closed PASS;
- CI completa PASS;
- revisione tecnica indipendente PASS;
- HUMAN REVIEW prima del merge.
