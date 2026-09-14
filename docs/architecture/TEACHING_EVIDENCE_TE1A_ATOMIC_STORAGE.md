# DOCENTE OS — Teaching Evidence — TE-1A Atomic Storage Boundary

Data: 2026-09-14  
Baseline: `develop@e87b8bb0a367fa78b6de4bdbca871e094dc65dd1`  
Stato: TE-1A IMPLEMENTATION CANDIDATE — UI persistence not yet authorized

## Decisione

La convergenza di **Registra la lezione** è chiusa da PR #361 / issue #359. `TeachingSession` resta l'autorità di ciò che è realmente accaduto e `AnnualPlanBlockProgress` resta una decisione separata e human-gated.

TE-1A introduce esclusivamente il boundary di persistenza additiva per:

- `TeachingObservation`;
- `TeachingEvidenceReference`;
- collegamenti espliciti EvidenceReference → Observation;
- receipt idempotente del payload strutturato.

Non introduce UI nuova, autosave, profili individuali, scoring, un secondo Diario o un secondo orchestratore AI.

## Boundary atomico

La firma pubblica esistente `record_teaching_session(...)` non viene modificata.

Il nuovo RPC `record_teaching_session_with_evidence(...)`:

1. richiede utente autenticato e membership/AAL2 canonica;
2. richiede una `registration_key` quando persiste Observation/Evidence;
3. verifica che quella key non sia già stata usata da un percorso non atomico;
4. chiama `record_teaching_session(...)` **nella stessa transazione**;
5. risolve i `draftKey` effimeri delle Observation in UUID canonici;
6. persiste EvidenceReference e link espliciti alle Observation;
7. verifica gli eventuali `knowledge_asset_id` nello stesso workspace/anno, ammettendo asset globali con `academic_year_id = null`;
8. registra una receipt del payload strutturato;
9. restituisce session id + observation ids + evidence ids.

Qualunque errore dopo la creazione della sessione provoca rollback dell'intera transazione. Non può quindi esistere una Observation orfana prodotta da questo boundary.

## Idempotenza

La `registration_key` resta l'identità della singola intenzione di registrazione.

- stessa key + stesso payload sessione + stesso payload evidence → stessa receipt;
- stessa key + payload sessione diverso → fail-closed nel boundary `record_teaching_session`;
- stessa key + payload Observation/Evidence diverso → fail-closed nel boundary TE-1A;
- key già consumata da un write TeachingSession privo della receipt TE-1A → fail-closed, nessun attach retroattivo implicito.

## Storage

### `teaching_observations`

Append-only, ancorata a `teaching_session_id`.

Scope ammessi:

- `CLASS`;
- `ANONYMOUS_GROUP`, con chiave temporanea session-local.

Dimensioni TE-1A congelate:

- `UNDERSTANDING_INSTRUCTION`;
- `AUTONOMY`;
- `WORK_METHOD`;
- `TECHNICAL_LANGUAGE`;
- `DISCIPLINARY_APPLICATION`;
- `EVIDENCE_QUALITY`;
- `TIME_MANAGEMENT`.

Stati non numerici:

- `NOT_OBSERVED`;
- `NEEDS_SUPPORT`;
- `DEVELOPING`;
- `CONSOLIDATED`.

### `teaching_evidence_references`

È un riferimento, non una copia del materiale. Un riferimento può essere session-level e avere zero link a Observation; in quel caso non costituisce supporto esplicito di una Observation.

### `teaching_evidence_observation_links`

Relazione normalizzata. Un trigger impedisce collegamenti fra sessioni diverse.

### `teaching_session_evidence_receipts`

Tabella interna senza accesso diretto authenticated. Conserva signature e UUID prodotti per replay idempotente.

## Sicurezza e privacy

Perimetro invariato: `SINGLE_OWNER_TIER_1_PROFESSIONAL_NON_PERSONAL`.

Non esistono campi per identificatori di alunni. Non sono autorizzati profili individuali, scoring automatico, categorie particolari di dati o correlazione longitudinale dei gruppi anonimi.

Le tabelle hanno RLS e sola lettura autenticata attraverso la membership del workspace della TeachingSession. Le scritture dirette sono revocate; il solo write boundary è il security-definer RPC governato dalla membership AAL2 canonica.

## Supersessione

Le Observation della sessione superseded restano storiche. TE-1A non copia automaticamente Observation/Evidence nella nuova sessione. Le future letture correnti devono derivare da `currentTeachingSessions(...)`.

## Compatibilità

- `TeachingSessionReflection` e Diario/Drive non vengono modificati;
- `TeachingSessionAllocation` resta l'unico binding a B01-B33;
- nessuna Observation completa un blocco del Piano;
- assenza del provider AI non influisce sul write boundary;
- i chiamanti esistenti di `record_teaching_session` restano compatibili.

## Gate di chiusura TE-1A

Prima del merge devono risultare PASS sullo stesso exact head almeno:

- Product CI;
- test dominio/applicazione Teaching Evidence;
- P7 DB Restore Rehearsal con migrazione `0053`;
- Operational Security / Dependency Security;
- ASVS 5.0 Assurance;
- Human Interaction Model / Design Policy applicabili;
- Production Readiness / Release Engineering;
- ogni gate exact-head richiesto dal repository.

TE-1A chiusa **non chiude #351**. Autorizza soltanto l'esistenza del boundary storage. La UI `Osserva → Registra` sarà una TE-1B separata, con HVA/WCAG/mobile dedicati.
