# DOS-TT-IMPORT-01 — Timetable Import Contract v1

## Stato

**G0 CONTRACT CANDIDATE — RUNTIME HOLD**

Questo documento definisce il confine contrattuale dell'importazione assistita di un nuovo orario da documento istituzionale. Non autorizza migrazioni, nuove tabelle, attivazione di versioni né modifiche automatiche alla baseline attiva.

Issue di governo: `#601`.

## 1. Autorità e confini

Il contratto è subordinato a `TIMETABLE_CANONICAL_SPEC.md` e alla materializzazione T1 descritta in `TIMETABLE_T1_IMPLEMENTATION.md`.

Invarianti:

1. `teaching_assignments`, `timetable_versions` e `timetable_slots` restano gli oggetti canonici.
2. L'importatore non crea un modello alternativo dell'orario.
3. L'orario non modifica CAN-PLAN, UDA o contenuto didattico.
4. L'importatore non attiva una versione. Output massimo v1: **DRAFT canonica confermata dal docente**.
5. DOS-A1 resta `RUNTIME_DEFERRED`.
6. DOS-CAL-01 può condividere il pattern di interazione, non identità o persistenza di dominio.
7. T1 materializza **una sola DRAFT corrente per workspace/anno**: v1 importa nella DRAFT canonica esistente e non crea una seconda bozza parallela.

## 2. Pipeline governata

```text
SOURCE
  → INGEST
  → PARSE
  → NORMALIZE
  → RESOLVE
  → REVIEW
  → VALIDATE
  → CONFIRM
  → APPLY_TO_DRAFT
```

Ogni passaggio prima di `CONFIRM` è non autorevole. Nessuna interpretazione del documento può mutare `timetable_versions` o `timetable_slots` prima della conferma esplicita.

Stati:

```text
UPLOADED
PARSED
REVIEW_REQUIRED
READY_TO_CONFIRM
CONFIRMED
APPLIED_TO_DRAFT
PARSE_FAILED
VALIDATION_FAILED
CONFLICT_DETECTED
```

`APPLIED_TO_DRAFT` non equivale ad `ACTIVE`.

## 3. Sorgente e provenienza

Il sistema calcola sul contenuto binario originale un `source_fingerprint` crittografico stabile, prima di qualsiasi trasformazione.

Metadati minimi:

```text
source_fingerprint
source_media_type
source_original_name?     # solo se necessario alla UX
source_label
source_ref?               # riferimento governato, non presuppone retention permanente
source_received_at
```

Regole:

- il documento originale è immutabile durante una singola importazione;
- nessuna duplicazione in archivi paralleli non governati;
- i nominativi dei docenti presenti nel documento sono trattati solo per la risoluzione dell'orario;
- nessun dato studenti è ammesso nel candidato;
- la retention del binario è una decisione separata: v1 non la presume;
- `source_ref` deve poter attestare la provenienza senza rendere obbligatoria la conservazione permanente del file.

## 4. `TimetableImportCandidate`

Modello logico, non ancora schema DB:

```text
TimetableImportCandidate
  contract_version = "1"
  candidate_id
  candidate_revision
  workspace_id
  academic_year_id
  source_fingerprint
  source_label
  source_ref?
  effective_from_candidate?
  effective_from_evidence
  source_is_provisional
  rows[]
  parse_warnings[]
  validation_state
  created_at
```

### Invarianti

- `candidate_id` identifica la proposta, non una versione canonica dell'orario;
- `candidate_revision` cambia a ogni modifica sostanziale del candidato/revisione docente ed è il token logico usato dalla conferma;
- `workspace_id + academic_year_id + source_fingerprint` costituiscono la chiave logica anti-duplicazione della sorgente;
- `effective_from_candidate` può essere nullo finché la data non è verificabile;
- `source_is_provisional` descrive il documento, non lo stato di una `teaching_assignment`;
- il candidato può essere scartato senza effetti sulla DRAFT.

## 5. `CandidateRow`

```text
CandidateRow
  row_id
  weekday?
  ordinal?
  start_time?
  end_time?
  source_class_label?
  source_teacher_label?
  resolved_section_id?
  resolved_assignment_id?
  proposed_slot_kind?
  proposed_presence_kind?
  confidence
  review_state
  evidence_ref
  warnings[]
```

`review_state`:

```text
AUTO_RESOLVED
REVIEW_REQUIRED
CONFIRMED
REJECTED
```

### Regole di interpretazione

1. Nessun campo mancante viene inventato.
2. Il cognome/nominativo del docente **non determina da solo la disciplina**.
3. `resolved_assignment_id` è valorizzabile automaticamente soltanto se il contesto canonico rende l'associazione univoca.
4. Se esistono zero o più di una associazione plausibile, la riga è `REVIEW_REQUIRED`.
5. `CLASS_PRESENCE` è usato solo quando la sorgente/decisione docente indica realmente una presenza in classe non ordinaria; non è un fallback per un `LESSON` non risolto.
6. `DISPOSITION`, `RECEPTION` e `OTHER` richiedono evidenza o conferma esplicita; non vengono dedotti per esclusione.
7. Il parser può proporre giorno, ordinalità e orari; la validazione canonica resta obbligatoria.
8. Una riga `REJECTED` non produce alcuno slot ed è conservata nel candidato soltanto come decisione di revisione.

## 6. Evidenza e confidenza

`confidence` è un ausilio di revisione e non un'autorità decisionale.

Valori logici:

```text
HIGH
MEDIUM
LOW
UNRESOLVED
```

Regola conservativa:

- solo una risoluzione deterministica contro dati canonici può produrre `AUTO_RESOLVED`;
- una confidenza elevata del riconoscimento visivo/testuale non è sufficiente, da sola, a risolvere classe, disciplina o tipo di slot;
- `evidence_ref` deve consentire alla UI di ricondurre la proposta alla cella/area della sorgente senza copiare dati superflui.

## 7. Data di efficacia

La data può provenire dal documento, come nel caso reale «dal 28-09-2026».

Regole:

1. parsing della data e interpretazione semantica sono separati;
2. data assente o ambigua → `REVIEW_REQUIRED`;
3. nessuna data viene inferita dalla data di caricamento;
4. la conferma docente è necessaria prima dell'applicazione;
5. l'applicazione alla DRAFT non costituisce attivazione temporale;
6. la data deve rispettare i vincoli canonici dell'anno scolastico già imposti a `timetable_versions`.

## 8. Confronto e piano di applicazione

Il confronto avviene tra il **set completo degli slot della DRAFT canonica corrente** e il **set completo degli slot proposti e confermati per il docente**. Non è una proprietà isolata della singola riga: deve poter rappresentare anche slot presenti nella DRAFT ma assenti dalla nuova sorgente.

Il piano di differenza usa:

```text
UNCHANGED
ADDED
REMOVED
MOVED
CHANGED
UNCERTAIN
```

Regole:

- `REMOVED` significa «presente nella DRAFT corrente, assente dal nuovo set confermato»; non significa cancellazione dello storico;
- `MOVED` e `CHANGED` devono conservare il legame logico tra stato precedente e proposta nuova nella UI di revisione;
- `UNCERTAIN` è bloccante finché non viene risolto o esplicitamente escluso;
- il piano di differenza è informativo fino a `CONFIRM` e non muta la DRAFT.

## 9. Validazione pre-conferma

`READY_TO_CONFIRM` è raggiungibile solo se:

- la data di efficacia è verificata ed è interna all'anno scolastico canonico;
- ogni riga destinata all'applicazione è `CONFIRMED` o deterministicamente `AUTO_RESOLVED`;
- `start_time < end_time`;
- giorni e ordinalità sono nel dominio canonico;
- non esistono overlap incompatibili;
- ogni `LESSON` possiede una `teaching_assignment` canonica valida nello stesso workspace/anno;
- ogni `CLASS_PRESENCE` possiede `manual_class_label` e `presence_kind` validi secondo il canone runtime;
- le righe rifiutate/non pertinenti sono esplicitamente escluse;
- non esistono errori bloccanti di provenienza o duplicazione;
- il piano di applicazione è completo: nessuna differenza resta `UNCERTAIN`.

## 10. Conferma, revisione e idempotenza

La conferma usa logicamente:

```text
confirmation_request_id
candidate_id
candidate_revision
source_fingerprint
expected_draft_version_id
expected_draft_revision
```

### Definizione di `expected_draft_revision`

T1 non espone oggi un numero di revisione della DRAFT. In v1 `expected_draft_revision` è quindi un **token di concorrenza logico** calcolato da uno snapshot canonico stabile della DRAFT, comprendente almeno:

```text
draft_version.id
draft_version.updated_at
draft_version.effective_from
draft_version.source_kind
draft_version.source_ref
insieme ordinato degli slot rilevanti con id + updated_at + campi strutturali
```

La rappresentazione e l'algoritmo di hashing saranno fissati nella slice runtime; il comportamento contrattuale è che qualsiasi modifica concorrente strutturale della DRAFT dopo l'apertura della revisione deve cambiare il token e impedire l'applicazione silenziosa.

Invarianti:

1. stesso `confirmation_request_id` → stesso risultato logico;
2. una `candidate_revision` obsoleta non è applicabile;
3. una DRAFT modificata dopo l'apertura della revisione produce `CONFLICT_DETECTED`;
4. due conferme concorrenti non possono duplicare slot;
5. l'applicazione è atomica: tutti gli effetti del piano confermato oppure nessuno;
6. un errore intermedio produce rollback completo;
7. nessuna cancellazione/mutazione di sessioni o occorrenze pregresse.

La concreta strategia DB/RPC/transazione sarà definita in una slice successiva; questo contratto ne fissa il comportamento osservabile.

## 11. Applicazione alla DRAFT

### Precondizioni

- esiste la DRAFT canonica unica per workspace/anno prevista da T1;
- `expected_draft_version_id` coincide con quella DRAFT;
- conferma esplicita del docente;
- candidato `READY_TO_CONFIRM`;
- `candidate_revision` corrente;
- `expected_draft_revision` ancora valido;
- validazione canonica superata.

### Semantica di applicazione v1

L'applicazione esegue **un piano esplicito di differenza**, non un `delete-all + insert-all` implicito.

Effetti consentiti, in un'unica transazione:

- aggiornamento metadati della DRAFT (`label`, `effective_from`, `source_kind`, `source_ref`) secondo il repository canonico;
- mantenimento degli slot `UNCHANGED`;
- inserimento degli slot `ADDED`;
- aggiornamento/sostituzione controllata degli slot `MOVED`/`CHANGED` secondo il piano confermato;
- rimozione dalla sola DRAFT degli slot `REMOVED` confermati dal docente;
- registrazione dell'esito idempotente.

Effetti vietati:

- creazione di una seconda DRAFT concorrente;
- `DRAFT → ACTIVE`;
- modifica di una versione `ACTIVE`/`ARCHIVED`;
- modifica di CAN-PLAN/UDA;
- modifica automatica dello stato delle `teaching_assignments`;
- creazione di un calendario parallelo;
- scrittura parziale in caso di errore;
- rimozione di slot DRAFT non compresi nel piano esplicitamente mostrato e confermato.

## 12. Caso reale di accettazione — 28-09-2026

La fixture reale è il documento «ORARIO PROVVISORIO DAL 28-09-2026».

Aspettative:

- `effective_from_candidate = 2026-09-28` solo dopo verifica dell'evidenza;
- `source_is_provisional = true`;
- matrice lunedì-venerdì, sei periodi: informazione da verificare contro la sorgente;
- il quadro d'istituto viene proiettato sul workspace del docente;
- nominativi non pertinenti non devono generare slot;
- disciplina non dedotta dal cognome;
- celle ambigue restano `REVIEW_REQUIRED`;
- nessuna scrittura runtime durante parsing/review.

Il file reale non viene aggiunto al repository come fixture binaria senza una decisione separata su privacy e retention. I test automatizzati useranno una fixture sintetica equivalente; il documento reale sarà usato per collaudo governato.

## 13. Gate G0

G0 è soddisfatto solo dopo revisione indipendente di questo contratto e verifica esplicita dei seguenti punti:

- [x] modello candidato separato dal canone;
- [x] output massimo `APPLIED_TO_DRAFT`;
- [x] provenienza e fingerprint definiti;
- [x] disciplina non inferita dal nominativo;
- [x] `CLASS_PRESENCE` non usato come fallback;
- [x] data di efficacia verificata, mai dedotta dal caricamento;
- [x] idempotenza e concorrenza definite a livello comportamentale;
- [x] applicazione atomica e rollback richiesti;
- [x] semantica di differenza/applicazione definita senza `delete-all` implicito;
- [x] token logico di revisione della DRAFT definito contrattualmente;
- [x] privacy/minimizzazione esplicite;
- [x] nessuna collisione semantica con DOS-CAL-01;
- [x] nessuna attivazione DOS-A1;
- [ ] revisione indipendente sul nuovo exact head completata;
- [ ] decisione umana sul contratto registrata.

Fino alla chiusura degli ultimi due punti: **HOLD_RUNTIME**.
