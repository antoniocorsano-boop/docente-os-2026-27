# DOS-TT-IMPORT-01 — G0 review resolution

## Stato

**NORMATIVE CLARIFICATION — RUNTIME HOLD**

Questo documento chiude i rilievi della review terza sull'exact head `eae8fc92d92c9f3504b153914360caf1d0911ff0` e integra normativamente `TIMETABLE_IMPORT_CONTRACT_V1.md` fino al consolidamento editoriale finale. In caso di ambiguità sui quattro punti sotto, prevalgono queste regole. Nessuna regola autorizza modifiche runtime.

## R1 — Conferma e applicazione

La macchina degli stati è resa univoca:

```text
READY_TO_CONFIRM
  -- conferma esplicita docente --> CONFIRMED
CONFIRMED
  -- transazione canonica riuscita --> APPLIED_TO_DRAFT
CONFIRMED
  -- conflitto --> CONFLICT_DETECTED
CONFIRMED
  -- validazione fallita --> VALIDATION_FAILED
```

Regole:

- `READY_TO_CONFIRM` significa che il candidato è validato ma non ancora autorizzato dal docente;
- `CONFIRMED` significa che il docente ha autorizzato **quella esatta `candidate_revision` e quel piano di differenza**;
- la precondizione per `APPLY_TO_DRAFT` è quindi `candidate.state = CONFIRMED`, non `READY_TO_CONFIRM`;
- `CONFIRM` e `APPLY_TO_DRAFT` possono essere implementati nella stessa operazione transazionale, ma restano due transizioni logiche distinguibili ai fini di audit/idempotenza;
- se l'applicazione fallisce o incontra un conflitto, nessun effetto parziale sulla DRAFT è ammesso e la conferma non autorizza automaticamente una revisione successiva del candidato.

## R2 — Semantica canonica di `source_kind`

Per DOS-TT-IMPORT-01 v1:

- `INSTITUTION_DOCUMENT`: la DRAFT deriva da un documento ufficiale/provvisorio dell'istituzione scolastica caricato dal docente e sottoposto al flusso assistito di estrazione/revisione;
- `IMPORT`: riservato a importazioni strutturate da sorgenti non qualificabili come documento istituzionale (per esempio formato interoperabile/strutturato), quando una slice futura le autorizzerà;
- `MANUAL`: compilazione/modifica manuale dell'orario senza una sorgente importata che costituisca la provenienza della versione.

Il caso reale «ORARIO PROVVISORIO DAL 28-09-2026» deve quindi produrre `source_kind = INSTITUTION_DOCUMENT` dopo conferma. La parola “provvisorio” descrive la sorgente e **non** cambia automaticamente lo stato di `teaching_assignments`.

Una correzione manuale effettuata durante la revisione del documento non trasforma la provenienza in `MANUAL`: la provenienza resta `INSTITUTION_DOCUMENT`, mentre il piano confermato conserva la decisione umana.

## R3 — Baseline operativa v1

La baseline operativa di DOS-TT-IMPORT-01 v1 è esclusivamente la **DRAFT canonica corrente** prevista da T1 per `workspace_id + academic_year_id`.

- confronto, token di concorrenza e piano di applicazione si riferiscono alla DRAFT corrente;
- ACTIVE/ARCHIVED non vengono modificati;
- un eventuale confronto con versioni storiche/ACTIVE, se in futuro disponibile, è solo informativo e non fa parte del gate v1;
- nessuna regola di questa importazione anticipa T3, calendario/eccezioni o attivazione/versionamento storico.

## R4 — Nessuna rimozione implicita

L'assenza di uno slot dalla sorgente, dalla proiezione sul docente o dal risultato del parser **non autorizza mai da sola una rimozione**.

Una rimozione dalla DRAFT è consentita soltanto quando tutte le condizioni seguenti sono vere:

1. lo slot esistente è incluso nel perimetro di confronto della DRAFT corrente;
2. il piano di differenza contiene esplicitamente una voce `REMOVED` riferita allo slot;
3. la UI mostra chiaramente la rimozione al docente;
4. il docente conferma il piano contenente quella rimozione;
5. `candidate_revision` ed `expected_draft_revision` coincidono con quelli revisionati;
6. la rimozione avviene nella stessa transazione atomica del piano confermato.

Gli slot fuori dal perimetro di proiezione, gli slot manuali non riconducibili con certezza alla sorgente e gli slot non letti/ambigui sono **preservati per difetto**. Devono essere classificati come non toccabili o `UNCERTAIN`, mai convertiti automaticamente in `REMOVED`.

## Verifica dei quattro rilievi

- [x] R1 — transizione `CONFIRMED → APPLIED_TO_DRAFT` resa univoca;
- [x] R2 — `INSTITUTION_DOCUMENT | IMPORT | MANUAL` disambiguati;
- [x] R3 — confronto/applicazione limitati alla DRAFT corrente T1;
- [x] R4 — vietata ogni rimozione implicita; rimozione solo esplicita e confermata.

## Gate

Questa risoluzione non chiude autonomamente G0. È richiesta una nuova review terza sull'exact head che la contiene. Fino a tale esito e alla successiva decisione umana: **HOLD_RUNTIME**.
