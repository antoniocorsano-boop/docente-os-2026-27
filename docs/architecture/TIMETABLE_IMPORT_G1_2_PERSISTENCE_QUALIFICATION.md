# DOS-TT-IMPORT-01 — G1.2 Persistence Qualification

## Stato

**G1.2 DESIGN CANDIDATE — HOLD_MIGRATION**

Baseline: `develop@ff9075f185b6a26d8a908512fe76ed4bfbbd8ee1` dopo integrazione G1.1.

Questo documento qualifica la persistenza necessaria per G1.2. Non contiene né autorizza ancora una migrazione SQL.

## 1. Evidenza T1 verificata

La migrazione canonica `0017_timetable_t1_assignment_version_slots.sql` stabilisce già:

- una sola DRAFT per `(workspace_id, academic_year_id)`;
- modifica degli slot consentita solo sulla DRAFT;
- controllo DB degli overlap;
- coerenza cattedra/workspace/anno/sezione/disciplina;
- RLS basata su `private.is_workspace_member(...)`;
- `created_by = auth.uid()` sugli inserimenti;
- nessuna colonna di revisione monotona su `timetable_versions`.

G1.2 deve estendere questi invarianti, non duplicarli né aggirarli.

## 2. Obiettivo minimo

G1.2 deve rendere verificabili a livello DB quattro proprietà già approvate:

1. persistenza minimizzata del candidato;
2. optimistic concurrency sulla DRAFT;
3. idempotenza della conferma;
4. applicazione atomica del piano confermato.

Non appartengono a G1.2: upload del documento, OCR/parser produttivo, UI, attivazione ACTIVE, T3, DOS-A1.

## 3. Decisione Q1 — revisione monotona della DRAFT

Aggiungere concettualmente:

```sql
timetable_versions.revision bigint not null default 0 check (revision >= 0)
```

La revisione non è controllata dal client.

### Regola DB-enforced

Ogni mutazione semantica della DRAFT deve incrementare `revision` nella stessa transazione della mutazione:

- insert/update/delete di `timetable_slots`;
- modifica di `label`, `effective_from`, `effective_to`, `source_kind`, `source_ref` della DRAFT;
- futuro apply dell'importazione.

Le modifiche puramente tecniche a `updated_at` non devono produrre incrementi autonomi.

### Vincolo di compatibilità

Le primitive manuali T1 esistenti devono continuare a funzionare, ma il bump deve avvenire centralmente nel DB. Nessuna chiamata client può scegliere il valore della revisione.

## 4. Decisione Q2 — candidato persistente minimizzato e revisionabile

Schema logico qualificato:

```text
timetable_import_candidates
  id uuid PK
  workspace_id uuid FK workspaces
  academic_year_id uuid FK academic_years
  source_fingerprint text
  source_kind = INSTITUTION_DOCUMENT
  source_label text
  source_ref nullable
  effective_from_candidate date nullable
  source_is_provisional boolean
  state
  revision bigint
  parser_version text
  created_by uuid FK auth.users
  created_at timestamptz
  updated_at timestamptz
  expires_at timestamptz
```

Vincoli minimi:

- `revision >= 1`;
- `source_fingerprint` non vuoto e limitato in lunghezza;
- `effective_from_candidate`, quando presente, deve appartenere all'anno scolastico del candidato;
- `state` limitato agli stati G0 applicabili alla persistenza;
- identità workspace/anno/creator/source_fingerprint immutabile dopo insert.

### R1 — deduplicazione della sorgente distinta dal versionamento

`source_fingerprint` identifica la sorgente binaria, **non una revisione del candidato**. Una stessa sorgente può quindi produrre revisioni successive dello stesso candidato dopo correzioni/review.

La migrazione non deve imporre `unique(workspace_id, academic_year_id, source_fingerprint)` sulla tabella dei candidati. La deduplicazione viene invece governata così:

- per `(workspace_id, academic_year_id, source_fingerprint)` può esistere un solo candidato logico non terminale;
- le correzioni incrementano `candidate.revision` sullo stesso `candidate.id`;
- ogni revisione sostituisce atomicamente il set di righe candidate della revisione precedente oppure adotta un meccanismo equivalente che impedisca mescolanza fra revisioni;
- `APPLIED_TO_DRAFT` è terminale per quel candidato;
- un nuovo import intenzionale della stessa sorgente dopo stato terminale richiede una nuova identità candidata e non eredita ricevute/idempotenza dal candidato precedente.

La futura migrazione deve implementare l'unicità parziale o l'enforcement transazionale necessario a impedire due candidati non terminali concorrenti per la stessa sorgente, senza impedire il versionamento.

## 5. Decisione Q3 — righe candidate

Schema logico:

```text
timetable_import_candidate_rows
  id uuid PK
  candidate_id uuid FK cascade
  candidate_revision bigint
  row_key text
  weekday smallint nullable
  ordinal smallint nullable
  start_time time nullable
  end_time time nullable
  source_class_label text nullable
  resolved_section_id uuid nullable
  resolved_assignment_id uuid nullable
  proposed_slot_kind text nullable
  proposed_presence_kind text nullable
  confidence text
  review_state text
  evidence_ref text nullable
  warnings jsonb
  created_at timestamptz
  updated_at timestamptz
```

### Minimizzazione vincolante

Non viene persistito `source_teacher_label` in G1.2. Il nominativo letto nel documento serve alla fase di proiezione/minimizzazione di G1.3 e non è necessario al candidato già proiettato sul workspace.

Le FK risolte devono appartenere allo stesso workspace/anno del candidato. `resolved_assignment_id` non può essere usato per dedurre o correggere implicitamente la disciplina.

`row_key` è un identificatore tecnico stabile nella singola revisione candidata; non contiene dati personali. La chiave logica è almeno `(candidate_id, candidate_revision, row_key)`.

## 6. Decisione Q4 — RLS e ownership

Candidati e righe sono accessibili esclusivamente a utenti autenticati membri del workspace del candidato.

Inserimento candidato:

```text
is_workspace_member(workspace_id)
AND created_by = auth.uid()
```

Update/delete candidato:

- membership del workspace obbligatoria;
- identità di contesto e fingerprint immutabili;
- stato `APPLIED_TO_DRAFT` non modificabile dal normale CRUD client;
- transizioni sensibili effettuate soltanto dalla funzione governata di conferma/apply.

Righe:

- nessuna policy basata su dati copiati nella riga;
- autorizzazione derivata sempre dal candidato padre;
- nessun accesso `anon`.

## 7. Decisione Q5 — ricevuta idempotente e anti-spoofing

Persistenza separata:

```text
timetable_import_apply_receipts
  id uuid PK
  workspace_id uuid
  candidate_id uuid
  candidate_revision bigint
  confirmation_request_id uuid
  draft_version_id uuid
  expected_draft_revision bigint
  resulting_draft_revision bigint
  applied_at timestamptz
  applied_by uuid
```

Vincolo univoco minimo:

```text
unique(workspace_id, confirmation_request_id)
```

### R2 — idempotenza prima del controllo di concorrenza

All'ingresso della funzione governata, dopo autenticazione e determinazione sicura del workspace, la receipt per `(workspace_id, confirmation_request_id)` viene cercata **prima** di acquisire il lock e confrontare la revisione corrente della DRAFT.

Se esiste:

- `candidate_id`, `candidate_revision`, `draft_version_id` ed `expected_draft_revision` devono coincidere con la richiesta;
- deve essere verificata anche l'equivalenza semantica del piano tramite un digest canonico server-side (`operations_digest`) registrato nella receipt;
- se tutto coincide, viene restituita la stessa receipt senza rieseguire mutazioni e senza richiedere che la DRAFT conservi la vecchia revisione;
- se il medesimo `confirmation_request_id` viene riutilizzato con identità o piano diversi, la funzione fallisce con `IDEMPOTENCY_KEY_REUSED` e non scrive nulla.

Solo in assenza di receipt si procede a lock, verifica della DRAFT e applicazione.

### R3 — campi attestati esclusivamente dal server

Le receipt non espongono `INSERT`, `UPDATE` o `DELETE` al normale ruolo `authenticated`. Possono essere create esclusivamente dalla funzione governata di apply.

Sono sempre derivati lato server e non accettati dal payload client:

- `workspace_id` dal candidato/DRAFT validati;
- `applied_by = auth.uid()`;
- `applied_at = clock_timestamp()` o equivalente DB;
- `resulting_draft_revision` dal risultato della transazione;
- `operations_digest` dalla canonicalizzazione server-side del piano validato.

Il normale CRUD client non può portare un candidato a `APPLIED_TO_DRAFT` né alterare una receipt esistente.

La receipt non contiene il documento sorgente né una copia completa del piano.

## 8. Decisione Q6 — piano confermato

Il piano da applicare deve essere legato esattamente a:

```text
candidate_id
candidate_revision
expected_draft_version_id
expected_draft_revision
confirmation_request_id
```

**Scelta G1.2: forma B.** Il piano non viene persistito in tabelle dedicate prima della conferma. È un payload strutturato validato integralmente dentro la funzione di apply e attestato dalla receipt tramite `operations_digest` canonico server-side.

La funzione DB deve riconvalidare ogni operazione e non fidarsi di identificatori, stato, conferme o digest forniti dal client.

## 9. Decisione Q7 — funzione atomica di apply

Interfaccia concettuale:

```text
apply_timetable_import_to_draft(
  candidate_id,
  candidate_revision,
  expected_draft_version_id,
  expected_draft_revision,
  confirmation_request_id,
  operations
) -> receipt
```

Sequenza vincolante nella stessa transazione:

1. autenticare l'utente;
2. risolvere candidato/workspace e verificare membership senza fidarsi del workspace client;
3. cercare receipt per `(workspace_id, confirmation_request_id)`;
4. se esiste, verificare identità + `operations_digest` e restituirla oppure fallire `IDEMPOTENCY_KEY_REUSED`;
5. acquisire lock sulla DRAFT target;
6. verificare `status = DRAFT`;
7. verificare `expected_draft_revision`;
8. verificare candidato, stato, scadenza e `candidate_revision`;
9. riconvalidare ogni operazione e riferimento;
10. applicare solo `KEEP/ADD/MOVE/CHANGE/REMOVE/IGNORE` ammessi;
11. richiedere evidenza di conferma esplicita per ogni `REMOVE`;
12. lasciare gli slot fuori perimetro invariati;
13. affidarsi agli invarianti canonici T1 per overlap e coerenza delle cattedre;
14. incrementare una sola revisione logica risultante per l'apply complessivo;
15. scrivere la receipt con campi attestati server-side;
16. portare il candidato a `APPLIED_TO_DRAFT` tramite percorso privilegiato governato;
17. restituire la receipt.

Qualsiasi errore → rollback totale.

## 10. Decisione Q8 — strategia unica per il bump della revisione

La strategia G1.2 è fissata come segue.

### Mutazioni manuali T1

Trigger DB sulle mutazioni semantiche degli slot e dei metadati DRAFT incrementano normalmente `timetable_versions.revision`. Il client non può impostare direttamente `revision` né disabilitare i trigger.

### Apply governato multi-slot

`apply_timetable_import_to_draft` è una funzione pubblica governata con privilegi minimi e `SECURITY DEFINER` solo se necessario dopo review SQL; essa invoca una **funzione privata interna** per le mutazioni multi-slot.

La funzione privata usa un contesto transazionale interno per evitare bump per-riga e produce un solo bump finale. Il contesto di soppressione:

- non è esposto come argomento della funzione pubblica;
- non è impostabile tramite tabella/configurazione scrivibile dal ruolo `authenticated`;
- non è attivabile chiamando direttamente la funzione privata, perché il ruolo client non possiede `EXECUTE` su di essa;
- viene riconosciuto dai trigger soltanto se creato nel percorso privilegiato dell'apply;
- termina con la transazione e non persiste tra richieste.

La migrazione deve revocare esplicitamente `EXECUTE` sulla funzione privata da `PUBLIC`, `anon` e `authenticated`, concedendolo soltanto al proprietario/ruolo interno necessario. La funzione pubblica deve fissare un `search_path` sicuro e usare nomi qualificati per gli oggetti sensibili.

Il bump finale è eseguito server-side una sola volta, dopo tutte le mutazioni e prima della receipt. Se una mutazione o il bump falliscono, rollback totale.

**È vietato qualsiasi flag/session setting liberamente impostabile dal client come autorità sufficiente per sopprimere il bump.** Anche se viene usato un setting transazionale come dettaglio implementativo, i trigger devono richiedere un contesto che il ruolo client non possa produrre autonomamente.

## 11. Decisione Q9 — retention

Candidato non applicato:

```text
expires_at <= created_at + 30 giorni
```

Il valore di 30 giorni è un massimo tecnico predefinito, non un obbligo archivistico.

Dopo `APPLIED_TO_DRAFT`:

- righe/evidenze transitorie eliminabili secondo job governato;
- receipt minima conservata per idempotenza/provenienza operativa;
- nessun binario sorgente in queste tabelle.

La pulizia automatica effettiva appartiene alla materializzazione DB/operativa e deve avere test dedicati.

## 12. Decisione Q10 — indici e vincoli richiesti

Da verificare nella futura migrazione:

- enforcement di un solo candidato logico non terminale per workspace/anno/fingerprint, senza impedire revisioni;
- unique row key per `(candidate_id, candidate_revision, row_key)`;
- unique receipt per `(workspace_id, confirmation_request_id)`;
- indici su candidate `(workspace_id, academic_year_id, state)` e `expires_at`;
- indice righe su `(candidate_id, candidate_revision)`;
- FK con `on delete cascade` soltanto candidato → righe;
- receipt non eliminate automaticamente con il candidato se ciò compromette idempotenza/audit minimo.

## 13. Casi di prova obbligatori prima del PASS G1.2 runtime

La futura PR SQL deve dimostrare almeno:

1. utente non membro non legge/scrive candidati;
2. anon non accede;
3. candidato non può cambiare workspace/anno/creator/fingerprint;
4. assignment cross-workspace/cross-year rifiutato;
5. modifica manuale slot incrementa revision;
6. delete manuale slot incrementa revision;
7. update metadati DRAFT incrementa revision;
8. DRAFT cambiata dopo review → `CONFLICT_DETECTED`, zero scritture;
9. retry stesso confirmation ID e stesso piano → stessa receipt, zero duplicati anche dopo bump della DRAFT;
10. riuso stesso confirmation ID con piano/identità diversi → `IDEMPOTENCY_KEY_REUSED`, zero scritture;
11. due conferme concorrenti → una sola applicazione logica;
12. errore a metà piano → rollback completo;
13. `REMOVE` non esplicitamente confermato → rifiuto;
14. slot fuori perimetro → invariato;
15. apply multi-slot → un solo incremento logico della revisione;
16. client authenticated non può sopprimere il revision bump né invocare direttamente la funzione privata;
17. ACTIVE/ARCHIVED non modificabili;
18. candidato scaduto non applicabile;
19. documento/nominativi non pertinenti assenti dalle tabelle G1.2;
20. stessa sorgente può avanzare di `candidate_revision` senza creare candidati non terminali concorrenti.

## 14. Gate prima della migrazione

- [x] baseline G1.1 integrata;
- [x] schema T1 reale riesaminato;
- [x] modello candidato minimizzato e revisionabile qualificato;
- [x] RLS/ownership qualificati;
- [x] revisione DRAFT DB-enforced qualificata;
- [x] idempotenza ordinata prima del controllo di concorrenza;
- [x] receipt anti-spoofing qualificata;
- [x] forma B del piano confermato scelta;
- [x] strategia unica di bump multi-slot e privilegi qualificata;
- [x] apply atomico qualificato;
- [x] 20 casi di prova obbligatori definiti;
- [ ] seconda review terza del presente piano;
- [ ] decisione umana sulla materializzazione SQL.

Fino alla chiusura degli ultimi due punti: **HOLD_MIGRATION**.
