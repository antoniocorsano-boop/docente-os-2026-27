# DOS-TT-IMPORT-01 — G1.6-E Human Decision Receipt

## Stato
**DESIGN / CONTRACT — DECISION_ONLY / NON_PERSISTED / NON_APPLICATIVE**

Baseline: `develop@3cfcefaac3048c7df16b7c7c81b48e547b72da6e`.

G1.6-E introduce un boundary deterministico per rappresentare la decisione umana su una preview G1.6-D completa. Non persiste la decisione, non crea/modifica una DRAFT e non applica alcun orario.

## Autorità
La catena autorevole resta:

`G1.6-C TimetableImportCandidate -> G1.6-D TimetableImportPreviewModel -> G1.6-E HumanDecisionReceipt`

G1.6-E non riapre né sostituisce la risoluzione docente di G1.6-B/C.

I modelli legacy `timetable-import.ts`, `timetable-import-preview.ts` e la persistenza/RPC G1.2 non sono autorità per questa slice. In particolare non vengono adottati:
- `candidate_revision` legacy;
- `AUTO_RESOLVED` / confidence;
- `DifferencePlan`;
- KEEP/ADD/MOVE/CHANGE/REMOVE/IGNORE;
- `expected_draft_version_id` o `expected_draft_revision`;
- `apply_timetable_import_to_draft`;
- T/D/DIS o altri slot kind dedotti.

La riconciliazione o deprecazione del percorso G1.2 richiede una slice separata.

## Scopo
Trasformazione pura:

`TimetableImportPreviewModel + explicit human decision -> HumanDecisionReceipt | DECISION_REJECTED`

La decisione positiva è ammessa solo se:
- `isPreviewComplete === true`;
- `candidateId !== null`;
- provenienza presente;
- fingerprint SHA-256 presente nella provenienza;
- stato `PREVIEW_READY` e reason `READY`;
- l'identità fornita dalla richiesta coincide esattamente con il candidato visualizzato.

## Binding anti-stale
La richiesta di decisione deve riportare:
- `candidateId`;
- `sourceFingerprint` esatto;
- `previewContractVersion`.

Il receipt copia questi valori dalla preview verificata, non da dati ricostruiti.

Qualsiasi mismatch produce `DECISION_REJECTED`. Non esiste fallback, fuzzy matching o sostituzione con il candidato più recente.

## Semantica del receipt
Il receipt attesta soltanto:

> il docente ha espresso una decisione esplicita sulla preview identificata da questi valori.

Non attesta e non autorizza:
- persistenza;
- applicazione;
- creazione/modifica DRAFT;
- DRAFT -> ACTIVE;
- modifica dell'orario corrente;
- chiusura di intervalli di validità;
- replan;
- CAN-PLAN;
- DOS-A1.

Il receipt non è una capability runtime.

## Idempotenza logica
Per gli stessi input governati e la stessa decisione esplicita, il builder produce lo stesso contenuto logico. Nessun timestamp generato internamente entra nell'identità del receipt.

Una futura persistenza dovrà definire separatamente claim atomico, idempotency key, concorrenza e invalidazione. G1.6-E non anticipa tali meccanismi.

## Decisioni
V1 ammette:
- `CONFIRM_PREVIEW`;
- `REJECT_PREVIEW`.

`CONFIRM_PREVIEW` non significa “applica”.
`REJECT_PREVIEW` non modifica o cancella il candidato.

## Gate automatici minimi
1. preview completa + binding esatto + CONFIRM -> receipt;
2. preview completa + binding esatto + REJECT -> receipt;
3. `candidateId = null` -> DECISION_REJECTED;
4. provenance/fingerprint assente -> DECISION_REJECTED;
5. preview REVIEW_REQUIRED -> DECISION_REJECTED;
6. candidateId mismatch -> DECISION_REJECTED;
7. fingerprint mismatch -> DECISION_REJECTED;
8. preview contract mismatch -> DECISION_REJECTED;
9. input immutato;
10. output senza capability apply/draft/active;
11. nessuna importazione Supabase/Server Action/RPC;
12. regressioni G1.6-A/B/C/D PASS.

## Fuori scope
- persistenza del receipt;
- identificazione account/utente;
- audit DB;
- confronto con DRAFT;
- DifferencePlan;
- apply alla DRAFT;
- gestione intervalli di validità;
- DRAFT -> ACTIVE;
- parser/OCR/upload;
- replan;
- CAN-PLAN;
- DOS-A1.

Restano invariati `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.

## Gate di chiusura
- contratto e implementazione coerenti;
- builder puro/deterministico/fail-closed;
- test anti-stale e negativi PASS;
- nessun collegamento al percorso mutativo legacy G1.2;
- regressioni A-D PASS;
- CI completa PASS;
- revisione tecnica indipendente PASS;
- HUMAN REVIEW prima del merge.
