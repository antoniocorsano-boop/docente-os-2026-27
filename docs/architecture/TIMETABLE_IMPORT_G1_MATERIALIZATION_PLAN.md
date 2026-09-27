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

T1 materializza una sola DRAFT corrente per workspace/anno; l'attivazione e il versionamento storico restano fuori dal perimetro di questa fase. Il gate T1 originario ha già verificato creazione di cattedra/DRAFT/slot, blocco overlap e rollback.

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

**Scelta qualificata G1:** la slice di persistenza userà una funzione PostgreSQL/RPC transazionale invocata dal server autenticato, con RLS/ownership coerenti con T1. Non verrà implementata una pseudo-transazione mediante più chiamate Supabase dal livello applicativo.

## 3. Decisione G1-B — persistenza candidata minimizzata e separata dal canone

Il candidato non deve essere serializzato dentro `timetable_versions.source_ref`, note degli slot o storage locale.

**Scelta qualificata G1:** persistere server-side soltanto il candidato già **proiettato e minimizzato sul workspace del docente**, non l'intera matrice d'istituto estratta.

Schema logico da sottoporre alla review della migrazione G1.2:

```text
timetable_import_candidates
  id
  workspace_id
  academic_year_id
  source_fingerprint
  source_kind = INSTITUTION_DOCUMENT
  source_label
  source_ref nullable
  effective_from_candidate nullable
  source_is_provisional
  state
  revision bigint
  parser_version
  draft_version_id
  expected_draft_revision bigint
  created_by
  created_at
  updated_at
  expires_at

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

Regole:

- `source_teacher_label` viene persistito **solo se necessario** a una riga pertinente e ancora da verificare; dopo risoluzione/conferma può essere eliminato o sostituito dall'identificatore canonico;
- nessun nominativo di docenti non pertinenti al workspace viene persistito;
- `warnings` non può diventare un contenitore libero del testo integrale della sorgente;
- `source_position/evidence_ref` deve identificare una regione/cella senza conservare una copia dell'intero documento;
- candidati terminali scaduti sono eliminabili senza effetto sul canone;
- l'anti-duplicazione usa almeno `workspace_id + academic_year_id + source_fingerprint`.

La migrazione non è autorizzata da questo documento: G1.2 dovrà dimostrare RLS, indici, vincoli, cleanup e test negativi prima del merge.

## 4. Decisione G1-C — sorgente binaria e retention qualificata

Il binario PDF/immagine non entra nel repository Git e non viene conservato permanentemente per default.

Pipeline:

```text
upload temporaneo privato
→ fingerprint SHA-256 sul binario
→ parsing
→ proiezione/minimizzazione
→ candidato persistito
→ eliminazione binario
```

**Scelta qualificata G1:** il binario è materiale transitorio di elaborazione. La v1 non richiede che sopravviva alla riuscita del parsing e della materializzazione delle evidenze minimizzate. In caso di errore di parsing può restare disponibile soltanto per il tempo strettamente necessario a retry/diagnostica governata e comunque entro una finestra massima configurata lato server.

Vincoli per G1.3:

1. bucket/area privata, mai URL pubblico;
2. accesso limitato all'utente/workspace autorizzato e al processo server necessario;
3. nessun nome file usato come identità o chiave di sicurezza;
4. fingerprint calcolato prima del parsing;
5. eliminazione esplicita dopo parsing riuscito; job di cleanup come rete di sicurezza per upload abbandonati/falliti;
6. **TTL massimo proposto: 24 ore** per upload temporanei non eliminati prima; una durata inferiore è ammessa;
7. `evidence_ref` persistente non punta al binario temporaneo: descrive posizione/cella e metadati minimizzati sufficienti alla review;
8. il documento reale del 28-09-2026 resta fuori da Git e dalle fixture automatiche.

La retention del **candidato** è distinta da quella del binario. Default proposto: candidato non applicato con `expires_at`, eliminabile dopo **30 giorni**; candidato applicato conserva soltanto ricevuta/esito e provenienza minima necessaria, mentre righe/evidenze transitorie possono essere eliminate secondo la policy che G1.2 dovrà materializzare. Il periodo è una scelta di minimizzazione tecnica, non una regola archivistica sui documenti scolastici.

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

## 7. Decisione G1-F — proiezione prima della persistenza e del confronto

Un prospetto d'istituto può contenere molti docenti. La sequenza corretta è:

```text
quadro estratto completo solo nel perimetro transitorio del parser
→ individuazione delle celle pertinenti
→ minimizzazione
→ candidato del workspace
→ persistenza candidato
→ confronto con DRAFT corrente
```

Nominativi/celle non pertinenti non vengono persistiti nel candidato del docente. Un'esigenza diagnostica non autorizza a conservare l'intero quadro: deve essere risolta con evidenza minimizzata o logging privo di contenuto personale non necessario.

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

## 9. Decisione G1-H — revisione DRAFT qualificata

T1 non espone oggi un numero di revisione applicativa della DRAFT. G0 richiede optimistic concurrency.

**Scelta qualificata G1:** introdurre un contatore monotono `revision bigint` sulla DRAFT canonica (`timetable_versions`), inizializzato in modo sicuro dalla migrazione. Ogni mutazione della DRAFT che possa cambiare l'esito del confronto deve incrementarlo nella stessa transazione della mutazione.

Questo comprende almeno:

- metadati DRAFT rilevanti (`effective_from`, provenienza/label quando incidono sul piano);
- aggiunta slot;
- modifica slot;
- rimozione slot;
- apply dell'importazione.

L'importazione registra `expected_draft_revision` all'apertura/aggiornamento della review. `applyTimetableImportToDraft` esegue un controllo atomico equivalente a:

```text
DRAFT.id = expected_draft_version_id
AND DRAFT.status = DRAFT
AND DRAFT.revision = expected_draft_revision
```

Se il controllo fallisce:

```text
→ CONFLICT_DETECTED
→ zero scritture
→ ricalcolo differenze
→ nuova conferma docente
```

**Vincolo importante:** aggiungere il solo campo `revision` non basta. G1.2 deve assicurare che anche le attuali primitive manuali T1 incrementino la revisione; altrimenti l'optimistic concurrency sarebbe falsa. La soluzione preferita è un meccanismo DB-enforced/centralizzato, non la disciplina volontaria dei singoli chiamanti.

`updated_at` resta informativo e non sostituisce il token di revisione.

## 10. Decisione G1-I — idempotenza qualificata

Ogni conferma porta un `confirmation_request_id` univoco.

Il server deve memorizzare/riconoscere l'esito logico dell'operazione. Un retry di rete con lo stesso ID non ripete aggiunte o rimozioni.

Chiave logica:

```text
workspace_id
candidate_id
candidate_revision
confirmation_request_id
```

G1.2 dovrà introdurre un registro/ricevuta con vincolo univoco. La stessa richiesta restituisce lo stesso esito applicativo; un ID riutilizzato con payload/revisione differenti viene rifiutato.

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

Accessibilità minima da qualificare: tastiera, focus, nomi accessibili, stato non affidato al solo colore, riepilogo errori, riflusso/zoom.

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

### G1.2 — persistenza e transazione

- schema candidato minimizzato + RLS;
- `revision bigint` DB-enforced sulla DRAFT e adeguamento delle primitive T1;
- registro/ricevuta idempotenza;
- funzione/RPC atomica `applyTimetableImportToDraft`;
- cleanup candidati/evidenze;
- test transazionali, RLS e concorrenza.

Nessuna UI finché la persistenza non supera review dedicata.

### G1.3 — ingestion/parser adapter

- upload temporaneo privato;
- SHA-256;
- parser adapter;
- minimizzazione/proiezione prima della persistenza;
- eliminazione immediata dopo parsing riuscito + cleanup TTL massimo 24h;
- nessuna dipendenza del dominio dal fornitore di parsing.

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
- [x] qualificata persistenza candidata: server-side, minimizzata, post-proiezione;
- [x] qualificata retention: binario transitorio, eliminazione dopo parsing, cleanup ≤24h; candidato con scadenza separata;
- [x] qualificata strategia revisione DRAFT: `revision bigint` monotona e DB-enforced;
- [ ] revisione terza del piano G1;
- [ ] decisione umana G1.

Fino alla chiusura degli ultimi due punti: **HOLD_RUNTIME**.

## 15. Casi negativi obbligatori per G1.2/G1.3

Prima di qualunque attivazione runtime dovranno essere dimostrati almeno:

- modifica manuale della DRAFT durante la review → conflitto, zero scritture;
- retry della stessa conferma → nessun duplicato;
- stesso `confirmation_request_id` con payload diverso → rifiuto;
- utente/workspace diverso → accesso negato;
- candidato scaduto → non applicabile;
- upload temporaneo orfano → cleanup;
- parser fallito → nessuna DRAFT creata/modificata dall'import;
- documento duplicato → nessuna seconda applicazione silenziosa;
- riga ambigua → `REVIEW_REQUIRED`;
- slot DRAFT fuori perimetro → preservato;
- errore durante apply → rollback totale;
- nominativi non pertinenti → assenti dalla persistenza candidata.
