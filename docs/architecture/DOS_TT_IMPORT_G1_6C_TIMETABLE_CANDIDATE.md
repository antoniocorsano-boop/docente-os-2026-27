# DOS-TT-IMPORT-01 — G1.6-C Timetable Import Candidate

## Stato
**DESIGN / CONTRACT — PREVIEW_ONLY**

Baseline: `develop@e8ab0597d81b1940ea8e5d7f3d90041474a00935`.

G1.6-C materializza il confine successivo a G1.6-A/B senza applicare alcun orario al runtime.

## Scopo
Trasformare un documento-orario già acquisito e le righe settimanali già estratte in un `TimetableImportCandidate` deterministico e verificabile:

`source bytes digest + provenance + effectiveFrom + extracted weekly slots + G1.6-B teacher resolution -> PREVIEW_READY | REVIEW_REQUIRED`

Il candidato è un artefatto di preparazione. Non è un orario DRAFT o ACTIVE.

## Invarianti
- `sourceFingerprint` è SHA-256 dei byte del documento sorgente; nome file, percorso locale e timestamp non partecipano al digest.
- il digest è fornito dal boundary di acquisizione che possiede i byte; G1.6-C lo valida ma non legge file e non introduce I/O;
- `effectiveFrom` è obbligatoria, ISO `YYYY-MM-DD`, e non implica una data di fine;
- nessuna `effectiveTo` viene inventata;
- ogni slot conserva giorno, posizione/ora sorgente, classe e label docente come evidenza di provenienza;
- uno slot può diventare `RESOLVED` solo se G1.6-B restituisce `RESOLVED`;
- qualsiasi slot `REVIEW_REQUIRED`, dato strutturale invalido o conflitto deterministico rende l'intero candidato `REVIEW_REQUIRED`;
- nessuna inferenza di teoria/disegno/disposizione (T/D/DIS) è richiesta o introdotta;
- l'ordine degli input non modifica l'identità logica del candidato;
- nessuna scrittura DB, nessuna mutazione dell'orario corrente, nessun passaggio DRAFT -> ACTIVE.

## Provenienza minima
`TimetableSourceProvenance`:
- `sourceFingerprint.algorithm = SHA-256`;
- `sourceFingerprint.digest`: 64 cifre esadecimali lowercase;
- `sourceKind`: `OFFICIAL_DOCUMENT | TEACHER_UPLOAD`;
- `sourceLabel`: etichetta leggibile, non autorevole per l'identità;
- `effectiveFrom`;
- `capturedAt` opzionale e solo informativo: non partecipa a `candidateId`.

## Identità e deduplicazione
`candidateId` deriva deterministicamente da:
1. versione contratto;
2. fingerprint del contenuto;
3. data di entrata in vigore;
4. rappresentazione canonica degli slot.

Lo stesso contenuto rinominato produce lo stesso candidato. Lo stesso documento con una diversa decorrenza produce un candidato diverso.

G1.6-C non decide da solo se un candidato già persistito sia un duplicato: espone un'identità stabile che la futura boundary di persistenza potrà usare per un claim idempotente.

## Stato
- `PREVIEW_READY`: struttura valida e tutti gli slot risolti deterministicamente.
- `REVIEW_REQUIRED`: almeno un errore/ambiguità/conflitto; nessuna applicazione silenziosa.

Reason code minimi:
- `READY`
- `INVALID_SOURCE_FINGERPRINT`
- `INVALID_EFFECTIVE_FROM`
- `INVALID_SLOT`
- `DUPLICATE_SLOT_CONFLICT`
- `TEACHER_REVIEW_REQUIRED`
- `EMPTY_TIMETABLE`

## Gate automatici
Devono essere provati almeno:
1. candidato valido -> `PREVIEW_READY`;
2. fingerprint invalido -> review;
3. data invalida -> review;
4. slot con teacher resolution non risolta -> review;
5. conflitto sul medesimo giorno/posizione/classe -> review;
6. duplicato byte-identico dello stesso slot non altera il risultato;
7. permutazione degli slot -> stesso `candidateId`;
8. rename del sourceLabel -> stesso `candidateId`;
9. decorrenza diversa -> `candidateId` diverso;
10. nessuna `effectiveTo` e nessun T/D/DIS nel contratto;
11. nessuna regressione G1.6-A/B;
12. nessuna scrittura DB.

## Fuori scope
- parser PDF/immagine;
- OCR;
- upload/storage del documento;
- persistenza del candidato;
- confronto con orario ACTIVE;
- creazione/modifica DRAFT;
- DRAFT -> ACTIVE;
- chiusura automatica del precedente intervallo;
- CAN-PLAN;
- DOS-A1.

Restano invariati `HOLD_PRODUCTION_APPLY` e `HOLD_REPLAN`.

## Gate di chiusura G1.6-C
- contratto e implementazione coerenti;
- builder puro e deterministico;
- provenienza/fingerprint fail-closed;
- test negativi e di idempotenza PASS;
- G1.6-A/B senza regressioni;
- CI completa PASS;
- revisione tecnica indipendente PASS;
- HUMAN REVIEW prima del merge.
