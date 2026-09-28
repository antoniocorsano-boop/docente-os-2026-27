# DOS-TT-IMPORT-01 — G1.6-B Teacher Resolution Boundary

## Stato

**DESIGN / CONTRACT — PREVIEW_ONLY**

Baseline: `develop@35c595b372828ff8cf74fe0c29828cd007bfe403` dopo consolidamento G1.6-A.

Restano invariati:

- `HOLD_PRODUCTION_APPLY`;
- `HOLD_REPLAN`;
- nessuna attivazione automatica `DRAFT → ACTIVE`;
- nessuna autorizzazione DOS-A1;
- nessuna persistenza del candidato di importazione in questa slice.

## Scopo

G1.6-B chiude esclusivamente il confine deterministico fra una etichetta docente estratta dal documento e le cattedre già note nel workspace/anno.

Catena autorizzata:

`source teacher label → TT-TEACHER-NORM-1 → evidence → unique teaching-assignment candidate | REVIEW_REQUIRED`

La normalizzazione testuale non costituisce identificazione del docente e non autorizza da sola una cattedra.

## Invarianti

1. `normalizeTeacherLabel()` di G1.6-A è l'unica normalizzazione autorevole delle etichette docente.
2. Il solo cognome o la sola uguaglianza della stringa normalizzata non sono prova sufficiente di identità.
3. La risoluzione può usare esclusivamente evidenze esplicite e governate disponibili nel contesto di importazione e nel workspace/anno.
4. Una cattedra può essere auto-risolta soltanto quando rimane **un solo candidato** compatibile con tutte le evidenze richieste dal profilo attivo.
5. Zero candidati, più candidati, profilo invalido, segnali duplicati/contraddittori o evidenza insufficiente producono `REVIEW_REQUIRED`.
6. Non sono ammessi ranking probabilistici, scelta del candidato “più vicino”, fuzzy matching silenzioso o fallback sul primo risultato.
7. `CLASS_PRESENCE` non è un ripiego per una risoluzione docente/cattedra incompleta.
8. La disciplina non viene dedotta dal nominativo presente nel documento.
9. Nessun esito di G1.6-B modifica `timetable_versions`, `timetable_slots`, `teaching_assignments` o CAN-PLAN.

## Contratto minimo

```text
TeacherResolutionInput
- sourceTeacherLabel
- sourceClassLabel?
- workspaceId
- academicYearId
- evidence[]
- evidenceProfile
- assignmentCandidates[]

TeacherResolutionResult
- state = RESOLVED | REVIEW_REQUIRED
- normalizedTeacherLabel
- resolvedAssignmentId?       // presente solo per RESOLVED
- compatibleAssignmentIds[]   // deterministico, ordinato
- reasonCode
- evidenceSummary
```

`resolvedAssignmentId` deve essere assente quando `state = REVIEW_REQUIRED`.

## Reason code minimi

```text
UNIQUE_EVIDENCE_MATCH
NO_COMPATIBLE_ASSIGNMENT
AMBIGUOUS_ASSIGNMENT
INSUFFICIENT_EVIDENCE
INVALID_EVIDENCE_PROFILE
CONTRADICTORY_EVIDENCE
INVALID_UNICODE_INPUT
```

I reason code sono dati di controllo e devono essere testabili; non devono essere sostituiti da testo UI libero.

## Evidenze e profilo

G1.6-A ha già materializzato il dominio `TeacherEvidenceProfile` e il confronto fail-safe `SAME | DISTINCT | UNKNOWN`.

G1.6-B deve riusare tale dominio senza creare un secondo motore di equivalenza.

Il profilo deve dichiarare esplicitamente:

- famiglia/versione del parser;
- tipi di segnale ammessi;
- regole `SAME`;
- regole `DISTINCT`.

`UNKNOWN` non può essere promosso a `SAME`.

## Regola classe/cattedra

Quando il documento fornisce una classe/sezione e il contesto Docente OS consente di risolverla in modo univoco, essa può restringere l'insieme delle `teaching_assignments` del workspace/anno.

La classe non autorizza tuttavia a dedurre la disciplina dal cognome. Se per quella classe rimangono più cattedre compatibili con l'evidenza docente, l'esito resta `REVIEW_REQUIRED`.

## Determinismo

A parità di:

- input;
- versione Unicode 17;
- profilo evidenze;
- insieme delle cattedre candidate;

il risultato deve essere identico indipendentemente dall'ordine dei candidati in ingresso.

`compatibleAssignmentIds` deve essere ordinato in modo canonico prima di essere restituito o confrontato nei test.

## Casi di prova obbligatori

1. etichetta equivalente Unicode + evidenza univoca + una sola cattedra compatibile → `RESOLVED`;
2. stessa etichetta normalizzata riferibile a due cattedre → `REVIEW_REQUIRED / AMBIGUOUS_ASSIGNMENT`;
3. cognome coincidente ma classe incompatibile → nessuna auto-risoluzione;
4. classe nota ma disciplina non determinabile → `REVIEW_REQUIRED`;
5. zero candidati → `NO_COMPATIBLE_ASSIGNMENT`;
6. profilo evidenze invalido → `INVALID_EVIDENCE_PROFILE`;
7. evidenze contraddittorie → `CONTRADICTORY_EVIDENCE`;
8. evidenza insufficiente / `UNKNOWN` → `INSUFFICIENT_EVIDENCE`;
9. sequenza Unicode non valida → fail closed / `INVALID_UNICODE_INPUT` al boundary;
10. permutazione dell'ordine dei candidati → risultato byte-equivalente;
11. nessuna scrittura DB durante la risoluzione;
12. nessuna regressione dei test G1.6-A.

## Non-obiettivi

G1.6-B non introduce:

- `TimetableImportCandidate` persistente;
- upload o conservazione del PDF/immagine;
- fingerprint/idempotenza del documento;
- conferma concorrente;
- applicazione atomica alla DRAFT;
- attivazione della versione;
- parsing OCR o classificazione probabilistica;
- modifiche CAN-PLAN;
- automazione DOS-A1.

## Gate di chiusura

G1.6-B può essere proposta per revisione umana solo quando:

- il resolver è puro e deterministico;
- usa `normalizeTeacherLabel()` e il dominio evidenze esistente;
- ogni ambiguità termina in `REVIEW_REQUIRED`;
- i casi negativi sopra sono automatizzati;
- una prova dimostra assenza di scritture DB nel boundary;
- CI completa PASS;
- revisione tecnica indipendente PASS.

Nessun PASS di G1.6-B rimuove `HOLD_PRODUCTION_APPLY` o `HOLD_REPLAN` e nessun PASS autorizza la successiva persistenza/applicazione del candidato.