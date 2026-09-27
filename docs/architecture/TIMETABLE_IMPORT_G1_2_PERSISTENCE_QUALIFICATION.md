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

## 4. Decisione Q2 — candidato persistente minimizzato

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
- unicità logica `(workspace_id, academic_year_id, source_fingerprint)` per evitare duplicazione della stessa sorgente nel medesimo contesto;
- `effective_from_candidate`, quando presente, deve appartenere all'anno scolastico del candidato;
- `state` limitato agli stati G0 applicabili alla persistenza;
- identità workspace/anno/creator immutabile dopo insert.

## 5. Decisione Q3 — righe candidate

Schema logico:

```text
timetable_import_candidate_rows
  id uuid PK
  candidate_id uuid FK cascade
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

`row_key` è un identificatore tecnico stabile nella revisione candidata; non contiene dati personali.

## 6. Decisione Q4 — RLS e ownership

Candidati e righe sono accessibili esclusivamente a utenti autenticati membri del workspace del candidato.

Inserimento candidato:

```text
is_workspace_member(workspace_id)
AND created_by = auth.uid()
```

Update/delete candidato:

- membership del workspace obbligatoria;
- identità di contesto immutabile;
- stato `APPLIED_TO_DRAFT` non modificabile dal normale CRUD client;
- transizioni sensibili effettuate soltanto dalla funzione governata di conferma/apply.

Righe:

- nessuna policy basata su dati copiati nella riga;
- autorizzazione derivata sempre dal candidato padre;
- nessun accesso `anon`.

## 7. Decisione Q5 — ricevuta idempotente

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

Un retry con lo stesso `confirmation_request_id` deve restituire lo stesso esito logico e non rieseguire mutazioni.

La ricevuta non contiene il documento sorgente né una copia completa del piano.

## 8. Decisione Q6 — piano confermato

Il piano da applicare deve essere legato esattamente a:

```text
candidate_id
candidate_revision
expected_draft_version_id
expected_draft_revision
confirmation_request_id
```

G1.2 deve scegliere una delle due sole forme ammissibili prima della migrazione:

A. piano normalizzato persistito in tabelle dedicate prima della conferma;
B. payload strutturato validato integralmente dentro la funzione di apply e attestato dalla ricevuta.

**Preferenza qualificata: B**, per minimizzare persistenza e superfici RLS, a condizione che la funzione DB riconvalidi ogni operazione e non si fidi del client.

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

La funzione deve, nella stessa transazione:

1. autenticare l'utente;
2. verificare membership del workspace;
3. acquisire lock sulla DRAFT target;
4. verificare `status = DRAFT`;
5. verificare `expected_draft_revision`;
6. verificare candidato, stato e `candidate_revision`;
7. verificare idempotenza;
8. riconvalidare ogni operazione e riferimento;
9. applicare solo `KEEP/ADD/MOVE/CHANGE/REMOVE/IGNORE` ammessi;
10. richiedere evidenza di conferma esplicita per ogni `REMOVE`;
11. lasciare gli slot fuori perimetro invariati;
12. affidarsi agli invarianti canonici T1 per overlap e coerenza delle cattedre;
13. incrementare una sola revisione logica risultante per l'apply complessivo;
14. scrivere la ricevuta;
15. portare il candidato a `APPLIED_TO_DRAFT`;
16. restituire la ricevuta.

Qualsiasi errore → rollback totale.

## 10. Decisione Q8 — evitare bump multipli durante apply

I trigger ordinari sugli slot devono incrementare la revisione per le modifiche manuali T1. L'apply import può però modificare più slot.

La migrazione non deve produrre una revisione diversa per ogni singola riga dell'importazione. Deve essere progettato un meccanismo DB-safe che produca **un solo incremento logico per l'intera transazione di apply**, senza consentire al client di disabilitare i trigger.

Soluzioni da validare nella review SQL:

- funzione privata/flag transazionale non impostabile dal ruolo client;
- oppure mutazioni incapsulate in funzione con bump finale e trigger capaci di distinguere il contesto governato.

È vietato usare una variabile controllabile dal client autenticato per sopprimere il bump.

## 11. Decisione Q9 — retention

Candidato non applicato:

```text
expires_at <= created_at + 30 giorni
```

Il valore di 30 giorni è un massimo tecnico predefinito, non un obbligo archivistico.

Dopo `APPLIED_TO_DRAFT`:

- righe/evidenze transitorie eliminabili secondo job governato;
- ricevuta minima conservata per idempotenza/provenienza operativa;
- nessun binario sorgente in queste tabelle.

La pulizia automatica effettiva appartiene alla materializzazione DB/operativa e deve avere test dedicati.

## 12. Decisione Q10 — indici e vincoli richiesti

Da verificare nella futura migrazione:

- unique sorgente per workspace/anno/fingerprint;
- unique row key per candidato;
- unique receipt per workspace/confirmation_request_id;
- indici su candidate `(workspace_id, academic_year_id, state)` e `expires_at`;
- indice righe su `candidate_id`;
- FK con `on delete cascade` soltanto candidato → righe;
- ricevute non eliminate automaticamente con il candidato se ciò compromette idempotenza/audit minimo.

## 13. Casi di prova obbligatori prima del PASS G1.2 runtime

La futura PR SQL deve dimostrare almeno:

1. utente non membro non legge/scrive candidati;
2. anon non accede;
3. candidato non può cambiare workspace/anno/creator;
4. assignment cross-workspace/cross-year rifiutato;
5. modifica manuale slot incrementa revision;
6. delete manuale slot incrementa revision;
7. update metadati DRAFT incrementa revision;
8. DRAFT cambiata dopo review → `CONFLICT_DETECTED`, zero scritture;
9. retry stesso confirmation ID → stesso risultato, zero duplicati;
10. due conferme concorrenti → una sola applicazione logica;
11. errore a metà piano → rollback completo;
12. `REMOVE` non esplicitamente confermato → rifiuto;
13. slot fuori perimetro → invariato;
14. apply multi-slot → un solo incremento logico della revisione;
15. ACTIVE/ARCHIVED non modificabili;
16. candidato scaduto non applicabile;
17. documento/nominativi non pertinenti assenti dalle tabelle G1.2.

## 14. Gate prima della migrazione

- [x] baseline G1.1 integrata;
- [x] schema T1 reale riesaminato;
- [x] modello candidato minimizzato qualificato;
- [x] RLS/ownership qualificati;
- [x] revisione DRAFT DB-enforced qualificata;
- [x] idempotenza qualificata;
- [x] apply atomico qualificato;
- [x] casi di prova obbligatori definiti;
- [ ] review terza del presente piano;
- [ ] decisione umana sulla materializzazione SQL.

Fino alla chiusura degli ultimi due punti: **HOLD_MIGRATION**.
