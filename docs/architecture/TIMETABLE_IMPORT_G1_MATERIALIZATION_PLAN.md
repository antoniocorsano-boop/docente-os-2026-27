# DOS-TT-IMPORT-01 — G1 Materialization Plan

## Stato

**G1 DESIGN CANDIDATE — HOLD_RUNTIME**

Baseline contrattuale: merge `872c79087f6c4124516be2ca2c41c00c841e5fe8` (G0).

Questo documento definisce come materializzare il contratto senza ancora autorizzare codice runtime, migrazioni o modifiche alla DRAFT.

## 1. Evidenza runtime verificata

Il repository T1 corrente espone già `SupabaseTimetableRepository` con:

- `getOrCreateDraft(workspaceId, academicYearId, effectiveFrom)`;
- `list(...)` per cattedre, DRAFT e slot;
- `updateDraftVersion(...)` limitato a `status = DRAFT`;
- inserimenti distinti per `LESSON`, `CLASS_PRESENCE` e slot speciali;
- `deleteSlot(versionId, slotId)`.

Queste primitive sono adeguate all'editing manuale T1, ma **non sono sufficienti per l'applicazione governata di un candidato importato**, perché una sequenza client/server di `deleteSlot + add...` non garantirebbe da sola atomicità, idempotenza e controllo di revisione richiesti da G0.

## 2. Decisione G1-A — nessun riuso improprio delle primitive T1 per l'apply

L'importazione può riusare le letture e le regole di dominio T1, ma l'operazione `APPLY_TO_DRAFT` deve avere un unico confine transazionale server-side.

Vietato:

```text
for removed -> deleteSlot()
for added   -> addLessonSlot()/addSpecialSlot()
```

come protocollo di conferma dell'importazione.

Richiesto invece un comando atomico concettuale:

```text
applyTimetableImportToDraft(command)
```

che verifichi in una sola transazione: workspace, anno, DRAFT attesa, revisione attesa, idempotenza, piano confermato e invarianti degli slot.

La forma concreta (RPC PostgreSQL / funzione server con transazione governata) sarà scelta solo dopo verifica dello schema e delle policy RLS.

## 3. Decisione G1-B — persistenza del candidato separata dal canone

Il candidato non deve essere serializzato dentro `timetable_versions.source_ref`, note degli slot o storage locale.

Prima opzione da qualificare:

```text
timetable_import_candidates
  id
  workspace_id
  academic_year_id
  source_fingerprint
  source_kind
  source_label
  source_ref nullable
  effective_from_candidate nullable
  source_is_provisional
  state
  revision
  parser_version
  created_by
  created_at
  updated_at

timetable_import_candidate_rows
  id
  candidate_id
  source_position
  weekday nullable
  ordinal nullable
  start_time nullable
  end_time nullable
  source_class_label nullable
  source_teacher_label nullable
  resolved_section_id nullable
  resolved_assignment_id nullable
  proposed_slot_kind nullable
  proposed_presence_kind nullable
  confidence
  review_state
  evidence_ref nullable
  warnings jsonb
```

**Non è ancora una migrazione approvata.** G1 deve prima verificare se una persistenza server-side completa è necessaria o se una forma più minimizzata soddisfa recuperabilità, revisione e concorrenza senza conservare dati sorgente superflui.

## 4. Decisione G1-C — sorgente binaria e retention

Il binario PDF/immagine non entra automaticamente nel database né nel repository Git.

Pipeline proposta:

```text
upload temporaneo governato
→ fingerprint SHA-256 sul binario
→ parsing
→ estrazione delle sole evidenze necessarie
→ candidato
→ retention/eliminazione secondo policy esplicita
```

Prima del runtime occorre decidere:

1. durata massima dell'upload temporaneo;
2. se il binario viene eliminato subito dopo parsing o mantenuto fino alla conferma;
3. forma di `evidence_ref` dopo l'eliminazione;
4. minimizzazione dei nominativi non pertinenti al docente/workspace.

Default di sicurezza da qualificare: **retention minima**, nessuna conservazione permanente del documento solo per comodità.

## 5. Decisione G1-D — adattatore di parsing sostituibile

Il dominio non dipende da OCR, modello multimodale o fornitore specifico.

Interfaccia concettuale:

```text
TimetableDocumentParser.parse(source) -> ParsedTimetableEvidence
```

Il parser restituisce evidenze e confidenza, non decisioni canoniche.

Separazione obbligatoria:

```text
PARSER: documento → celle/testo/coordinate/evidenze
RESOLVER: evidenze + T1 → proposta di associazione
REVIEW: proposta → decisione docente
APPLY: piano confermato → DRAFT
```

Questo consente di sostituire la tecnologia di lettura senza modificare il contratto di dominio.

## 6. Decisione G1-E — resolver deterministico

Il resolver lavora esclusivamente contro dati canonici del workspace/anno.

Per una riga candidata a `LESSON`:

```text
classe risolta
+ contesto docente/workspace
+ esattamente una teaching_assignment compatibile
= resolved_assignment_id
```

Zero o più di una associazione → `REVIEW_REQUIRED`.

Il parser non può promuovere una riga a `AUTO_RESOLVED` sulla sola confidenza visiva.

`CLASS_PRESENCE`, `DISPOSITION`, `RECEPTION`, `OTHER` richiedono evidenza semantica o conferma docente secondo G0.

## 7. Decisione G1-F — proiezione prima del confronto

Un prospetto d'istituto può contenere molti docenti. La sequenza corretta è:

```text
quadro estratto completo in memoria di parsing
→ individuazione delle celle pertinenti
→ minimizzazione
→ candidato del workspace
→ confronto con DRAFT corrente
```

Nominativi/celle non pertinenti non devono essere persistiti nel candidato del docente salvo stretta necessità di evidenza diagnostica, da motivare.

## 8. Decisione G1-G — piano di differenza esplicito

Il confronto produce operazioni dichiarative:

```text
KEEP(slot_id)
ADD(candidate_row_id)
MOVE(slot_id, candidate_row_id)
CHANGE(slot_id, candidate_row_id)
REMOVE(slot_id)
IGNORE(candidate_row_id)
```

Regole:

- nessun `REMOVE` per semplice assenza dal documento;
- `REMOVE`, `MOVE`, `CHANGE` richiedono riferimento allo slot DRAFT esistente;
- ogni operazione distruttiva deve essere visibile nella review;
- slot fuori perimetro sono `KEEP` per difetto;
- il piano confermato viene legato a `candidate_revision` e `expected_draft_revision`.

## 9. Decisione G1-H — revisione della DRAFT

T1 non espone oggi un numero di revisione applicativa della DRAFT. G0 richiede però optimistic concurrency.

G1 deve scegliere una strategia verificabile, preferendo un token server-side monotono o equivalente. Non è sufficiente affidarsi al timestamp mostrato dalla UI.

Requisito osservabile:

```text
se DRAFT cambia dopo l'apertura della review
→ apply rifiutato con CONFLICT_DETECTED
→ nessuna scrittura parziale
→ docente ricarica differenze e riconferma
```

## 10. Decisione G1-I — idempotenza

Ogni conferma porta un `confirmation_request_id` univoco.

Il server deve memorizzare/riconoscere l'esito logico dell'operazione. Un retry di rete con lo stesso ID non ripete aggiunte o rimozioni.

Chiave minima concettuale:

```text
workspace_id
candidate_id
candidate_revision
confirmation_request_id
```

## 11. Decisione G1-L — UX teacher-first

Ingresso stabile: `/orario` → **Carica nuovo orario**.

Fasi UI:

1. caricamento;
2. analisi con stato visibile;
3. anteprima del proprio orario, non dell'intera matrice d'istituto;
4. evidenza delle righe da verificare;
5. confronto con DRAFT;
6. correzione;
7. riepilogo delle modifiche;
8. conferma;
9. feedback persistente dell'esito.

Su smartphone la review deve privilegiare una sequenza per giorno/ora; nessuna tabella desktop compressa orizzontalmente.

Accessibilità minima da qualificare: tastiera, focus, nomi accessibili, stato non affidato al solo colore, error summary, riflusso/zoom.

## 12. Errori e recuperabilità

Classi minime:

```text
UNSUPPORTED_SOURCE
PARSE_FAILED
SOURCE_DUPLICATE
REVIEW_REQUIRED
VALIDATION_FAILED
DRAFT_CHANGED
CONFLICT_DETECTED
APPLY_FAILED
```

Un errore di parsing non crea/modifica DRAFT. Un errore di apply produce rollback totale.

## 13. Slice di materializzazione proposta

La materializzazione va spezzata per evitare una PR monolitica.

### G1.1 — tipi + fixture sintetiche + validatore puro

Nessun DB. Nessun upload. Nessuna UI produttiva.

- tipi `TimetableImportCandidate`, `CandidateRow`, `DifferencePlan`;
- validatore puro;
- resolver puro contro snapshot T1;
- fixture sintetica equivalente al caso 28-09-2026;
- casi negativi.

### G1.2 — persistence qualification

- schema candidato;
- RLS;
- token revisione DRAFT;
- registro idempotenza;
- funzione/RPC atomica di apply;
- test transazionali e concorrenza.

Nessuna UI finché la persistenza non supera review dedicata.

### G1.3 — ingestion/parser adapter

- upload temporaneo;
- fingerprint;
- parser adapter;
- minimizzazione/proiezione;
- policy retention.

### G1.4 — review UX

- flusso `/orario`;
- differenze;
- correzioni;
- conferma;
- feedback/accessibilità/mobile.

### G1.5 — collaudo reale

Documento «ORARIO PROVVISORIO DAL 28-09-2026» usato fuori dal repository come caso reale governato.

## 14. Gate G1

Prima di autorizzare G1.1:

- [x] G0 integrato in `develop`;
- [x] primitive T1 riesaminate;
- [x] escluso apply mediante sequenza di primitive non atomiche;
- [x] separati parser, resolver, review e apply;
- [x] piano differenze esplicito e non distruttivo;
- [x] prevista optimistic concurrency;
- [x] prevista idempotenza;
- [x] prevista minimizzazione prima della persistenza;
- [ ] qualificare persistenza candidata e retention;
- [ ] qualificare strategia revisione DRAFT;
- [ ] revisione terza del piano G1;
- [ ] decisione umana G1.

Fino alla chiusura dei quattro punti residui: **HOLD_RUNTIME**.
