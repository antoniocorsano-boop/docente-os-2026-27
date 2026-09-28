# DOS-TT-IMPORT-01 — G1.6-J Authoritative Draft Revision Token

## Stato
**DESIGN / DOMAIN — FAIL-CLOSED — NON_PERSISTED / NON_APPLICATIVE — HOLD_PRODUCTION_APPLY**

Baseline: `develop@79b0196d8fabe8c817580bc4344a203c44e00a62`.

## Decisione

G1.6-I richiede un revision token aggregato che rappresenti la DRAFT nel suo complesso e non il solo `timetable_versions.updated_at`.

La baseline dispone già di un meccanismo DB-enforced più forte: `timetable_versions.revision bigint`, introdotto da G1.2.

La revisione viene incrementata:
- quando cambia un metadato rilevante della DRAFT;
- dopo insert/update/delete di `timetable_slots` sulla DRAFT;
- una sola volta per l'apply multi-slot governato G1.2, mentre i bump per-slot sono soppressi nel relativo contesto transazionale.

Di conseguenza **non viene introdotto un secondo hash o counter concorrente**. La sorgente canonica del token G1.6 è la coppia:

`timetable_version.id + timetable_versions.revision`

Il token di dominio è una rappresentazione opaca e versionata di questa coppia.

## Contratto TTDR-1

Input:
- `versionId`: identità della DRAFT osservata;
- `revision`: revisione DB-enforced osservata.

Output:
- `TOKEN_READY` con token `TTDR-1`;
- oppure `BLOCKED` per identità vuota o revisione invalida.

Il token usa encoding length-prefixed deterministico per evitare ambiguità di separatore.

## Autorità

La funzione di dominio **non rende autorevole un valore fornito dal chiamante**.

Il token è autorevole soltanto quando `versionId` e `revision` provengono da una lettura DB autorevole della DRAFT nel contesto corretto.

La futura boundary applicativa dovrà:
1. stabilire workspace/anno da provenienza autorevole e autorizzazione effettiva;
2. leggere/lockare la DRAFT target;
3. ricontrollare `status = DRAFT`, identità, contesto, `effectiveFrom` e revisione;
4. materializzare/confrontare TTDR-1 dentro la stessa transazione della futura mutazione;
5. fallire senza scritture su qualunque mismatch.

Un TTDR-1 calcolato prima della transazione è solo una **precondizione ottimistica**, non un lock né un claim.

## Relazione con G1.6-I

G1.6-I resta invariata e continua a trattare `revisionToken` come stringa opaca.

G1.6-J definisce come produrre quella stringa senza duplicare la semantica di revisione già governata nel DB.

## Non obiettivi

Questa slice non introduce:
- migrazioni;
- nuove colonne o trigger;
- RPC / Server Action;
- letture Supabase;
- lock;
- claim/idempotency;
- creazione o selezione automatica DRAFT;
- insert/update/delete di slot;
- DRAFT → ACTIVE;
- replan / CAN-PLAN;
- DOS-A1.

## Gate

1. token deterministico a parità di `versionId + revision`;
2. variazione del token se cambia identità o revisione;
3. input invalidi fail-closed;
4. encoding non ambiguo;
5. nessuna capacità applicativa;
6. suite inclusa in `npm test`;
7. G1.6-A→I senza regressioni;
8. CI completa;
9. revisione tecnica indipendente;
10. HUMAN REVIEW prima del merge.

Restano attivi `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.
