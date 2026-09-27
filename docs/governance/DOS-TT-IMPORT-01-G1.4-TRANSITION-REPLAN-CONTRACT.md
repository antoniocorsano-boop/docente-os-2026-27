# DOS-TT-IMPORT-01 / G1.4 — Contratto governato di transizione temporale e ripianificazione

Stato: DRAFT — GOVERNANCE FIRST  
Baseline: `develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`  
Dipendenze: G1.2 e G1.3 integrate.  
HOLD: `HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`

## 1. Autorità e riferimenti canonici

Questo documento è l'**unica fonte normativa G1.4**. Le precedenti remediation/addendum sono assorbite qui e non costituiscono contratti paralleli.

Riferimenti obbligatori:
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`;
- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`;
- ciclo di vita corrente dell'orario, incluso `product/supabase/migrations/0025_timetable_lifecycle.sql` e la superficie `/orario`.

G1.4 non autorizza runtime, migrazioni/apply in produzione, ripianificazione autonoma o DOS-A1.

## 2. Scopo e percorso docente

G1.4 governa la transizione da una versione dell'orario alla successiva a partire da `effective_from` e il riallineamento delle sole sessioni didattiche future interessate.

Percorso ordinario:
`carica/seleziona fonte (G1.3) → controlla quadro → indica/conferma “Valido dal…” → anteprima sintetica → eventuali sole eccezioni → conferma docente → applicazione atomica governata`

Principio UX: **eccezioni, non amministrazione**. Identificatori, digest, mapping e revisioni restano dettagli tecnici. Il percorso deve essere completabile da smartphone senza tabelle larghe obbligatorie.

## 3. Modello canonico

`TimetableVersion → TimetableSlot ricorrente → occorrenza reale → sessione didattica → preparazione/attuazione`

- `TimetableSlot.id` identifica il pattern settimanale, non la lezione concreta.
- L'occorrenza materializza uno slot in una data e può cambiare identità quando cambia versione.
- La sessione didattica conserva il significato del lavoro del docente attraverso lo spostamento.
- Prima del runtime deve essere definita una **identità persistente della sessione**, distinta da slot e occorrenza.

Spostare una sessione futura **non crea una nuova lezione**.

## 4. Invarianti

1. **Storia immutabile.** Nessuna sessione/occorrenza eseguita o consolidata viene riscritta, spostata o reinterpretata.
2. **Blocco storico assoluto.** Se `effective_from` interseca anche una sola sessione/occorrenza già eseguita o consolidata nell'ambito governato, l'attivazione è sempre bloccata, anche se vecchio e nuovo orario risultano equivalenti.
3. **Termine aperto.** La nuova versione usa `effective_to = null` finché non sopraggiunge un nuovo confine governato.
4. **Identità didattica preservata.** Sequenza, obiettivi, materiali, note, preparazione, provenance e stato non diventano nuovi contenuti per effetto dello spostamento.
5. **No silent drop / duplication.** Nessuna sessione può scomparire o duplicarsi.
6. **Nessuna sessione orfana.** Ogni sessione interessata deve avere una nuova collocazione valida oppure uno stato persistente canonico di non-collocazione; finché tale stato non è materializzato, il conflitto blocca l'attivazione.
7. **Personalizzazioni separate.** Teoria, disegno, disposizione e qualificazioni analoghe non condizionano importazione e mapping strutturale.
8. **Eccezioni future preservate.** Una decisione futura `CANCELLED`, `MOVED` o equivalente non può perdere efficacia per il cambio di `timetable_slot_id`.
9. **Preparazione canonica unica.** G1.4 non introduce un secondo archivio di lezioni, preparazioni o materiali.
10. **Atomicità.** Versioni, sessioni, riferimenti canonici, eccezioni, successor draft e receipt devono produrre uno stato unitario o nessuna modifica osservabile.
11. **Idempotenza forte.** Un `client_request_id` identifica un solo piano canonico: replay esatto sì, riuso con piano diverso no.
12. **Successor draft.** Dopo un'attivazione riuscita deve esistere una sola nuova `TimetableVersion` `DRAFT`, derivata dall'attiva e popolata con la copia completa dei suoi slot.
13. **Teacher-first.** Le decisioni didattiche restano del docente; nessun DOS-A1.

## 5. Confine temporale

Prima dell'anteprima G1.4 calcola l'`executed_history_boundary` secondo gli stati canonici della sessione.

Regola prevalente: **`effective_from` deve essere successivo a tutta la storia eseguita/consolidata pertinente**. Se la interseca, l'attivazione è bloccata e l'interfaccia chiede semplicemente una data successiva compatibile. Il sistema non corregge silenziosamente la data e non effettua split o rettifiche retroattive.

La versione precedente viene chiusa al confine coerente immediatamente precedente alla nuova; la nuova resta aperta. Il termine delle attività didattiche appartiene al calendario/anno scolastico e non viene inventato da G1.4.

## 6. Sessioni candidate e matching

Sono candidate soltanto sessioni future, non consolidate, la cui collocazione dipende dalla versione sostituita a partire da `effective_from`.

Il piano puro classifica almeno `UNCHANGED_OCCURRENCE`, `MOVED_OCCURRENCE`, `REMOVED_OCCURRENCE_WITH_TARGET`, `REMOVED_OCCURRENCE_NO_TARGET`, `MULTIPLE_TARGETS`, `CAPACITY_CONFLICT`, `ASSIGNMENT_CONFLICT`, `OUTSIDE_TRANSITION_SCOPE`.

Una proposta automatica è ammessa solo con un unico target compatibile, stessa classe/incarico, nessuna collisione, capacità sufficiente, ordine didattico coerente e snapshot ancora validi. `TimetableSlot.id`, posizione della cella o etichetta visuale non bastano come prova di equivalenza.

I conflitti non deterministici sono risolti dal docente. Se non esiste una collocazione valida e non è ancora materializzato uno stato canonico come `UNSCHEDULED_REPLAN_REQUIRED`, **l'attivazione resta bloccata**.

## 7. Continuità con la preparazione canonica

Il riferimento normativo è `LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`: `NextLessonPreparation` e `LessonPreparationManifest` sono **read model/manifesti composti deterministicamente**, non proprietari persistenti da migrare.

La transizione deve preservare i **record proprietari canonici sottostanti** e i loro riferimenti, inclusi ove pertinenti: sessione/TeachingSession e identità della sessione pianificata; `LessonDesignExtension`; CAN-PACK, UDA, blocco/piano annuale e riferimenti curricolari; asset/materiali e provenance; note, osservazioni e stato professionale governato; riferimenti necessari a ricomporre deterministicamente `NextLessonPreparation` e `LessonPreparationManifest`.

Ponte richiesto:
`old-occurrence → stable-session → new-occurrence`

Se `lessonRef` oggi deriva dall'identità logica dell'occorrenza, non viene assunto come identità persistente. Prima del runtime deve essere adottata e testata una soluzione canonica — evoluzione compatibile di `lessonRef`, relazione di mapping o equivalente — che faccia ricomporre **la stessa preparazione** dalla nuova collocazione senza duplicare owner o introdurre store paralleli.

Il piano/digest registra mapping e revisioni/fingerprint dei **record proprietari interessati**, non una presunta persistenza dei manifesti composti.

## 8. Eccezioni future

Per ogni `timetable_exception` futura slot-bound interessata, il piano deve produrre esattamente uno tra `EXCEPTION_REBOUND`, `EXCEPTION_UNCHANGED`, `EXCEPTION_RESOLVED_EXPLICITLY`, `EXCEPTION_BLOCKING`.

Tipo, data, intenzione docente e provenance devono essere preservati. Se l'eccezione è cambiata dopo l'anteprima, il piano diventa obsoleto. Nessun rebound euristico silenzioso è ammesso.

## 9. Piano, digest e idempotenza

Il piano contiene almeno: `transition_id/client_request_id`, `plan_schema_version`, `plan_digest`, versioni e fingerprint, `effective_from`, revisione dell'`executed_history_boundary`, snapshot/revisioni di calendario/eccezioni/pianificazione/owner canonici interessati, mapping `old-occurrence → stable-session → new-occurrence`, operazioni sulle sessioni, esiti delle eccezioni, operazioni di chiusura/attivazione, successor `DRAFT`, decisioni docente e conteggi.

### 9.1 `PlanDigestPayload`

Il digest usa una serializzazione canonica/versionata del payload applicabile **pre-apply**. Include decisioni, precondizioni, mapping, operazioni, owner/revisioni rilevanti, eccezioni, boundary storico e successor draft. Esclude `plan_digest` stesso, receipt finale, timestamp/ID post-apply e stato runtime derivato non appartenente al piano pre-apply. Client e apply boundary usano la stessa specifica.

### 9.2 Replay

- stesso `client_request_id` + stesso `plan_digest` → stessa receipt/esito senza nuove mutazioni;
- stesso `client_request_id` + digest diverso → `IDEMPOTENCY_KEY_REUSE_MISMATCH` (o equivalente), nessuna scrittura;
- revision/fingerprint mutato dopo anteprima → piano obsoleto, nessuna scrittura.

## 10. Unità atomica

L'applicazione comprende congiuntamente, quando pertinenti: verifica finale delle precondizioni e del boundary storico; chiusura/attivazione versioni; riallineamento sessioni; aggiornamento del ponte verso gli owner canonici; rebound/risoluzione eccezioni future; creazione di una sola successor `DRAFT`; copia completa degli slot dall'attiva; receipt idempotente legata a `client_request_id + plan_digest`.

Se un effetto obbligatorio fallisce, nessuno stato parziale è osservabile. Il replay non può creare una seconda successor draft.

## 11. Anteprima teacher-first

Primo livello: data di entrata in vigore; numero di sessioni future riallineate; numero di eccezioni che richiedono una scelta; conferma che storico, preparazioni e materiali restano preservati; eventuale blocco in linguaggio semplice. Dettagli tecnici solo su richiesta. Nel caso ordinario, dopo il caricamento bastano una verifica sintetica e una conferma.

## 12. Fuori perimetro

G1.4 non autorizza parser/OCR del documento sorgente; modifica delle personalizzazioni delle celle; generazione/cancellazione autonoma di sessioni; modifica retroattiva o split della storia; ripianificazione automatica di eventi non-lezione; pubblicazione Atlas; nuovo lesson/preparation store; DOS-A1.

## 13. Casi di prova governati

La materializzazione deve rendere eseguibili **tutti i 68 casi**.

1. `effective_from` valido senza storia intersecata → prosegue agli altri gate.
2. nuova versione con `effective_to = null`.
3. sessione precedente al confine → invariata.
4. sessione svolta → invariata.
5. confine che interseca storia eseguita → blocco.
6. data incompatibile → feedback semplice, nessuna correzione silenziosa.
7. occorrenza futura equivalente → nessuno spostamento didattico.
8. unico target → proposta di riallineamento.
9. target multipli → conflitto.
10. nessun target senza stato non-collocato canonico → blocco.
11. stato non-collocato canonico → sessione preservata/recuperabile.
12. riduzione ore → nessuna cancellazione silenziosa.
13. aumento ore → nessuna sessione inventata.
14. collisione con sessione → conflitto.
15. collisione con evento governato → conflitto/avviso.
16. cambio classe/incarico → nessun remapping silenzioso.
17. sequenza preservabile → ordine mantenuto.
18. sequenza non preservabile → decisione docente.
19. materiali/obiettivi/note → preservati.
20. personalizzazioni → preservate, non reinterpretate.
21. stable-session identity → invariata.
22. vecchio `TimetableSlot.id` → non usato come identità sessione.
23. vecchia occurrence identity → non riutilizzata artificialmente.
24. stesso request id + digest → replay idempotente.
25. stesso request id + digest diverso → rifiuto senza scritture.
26. pianificazione mutata → piano obsoleto.
27. storia mutata → piano obsoleto.
28. vecchia versione mutata → conflitto.
29. nuova versione mutata → conflitto.
30. calendario/eccezioni mutate → piano obsoleto.
31. apply fallito → nessuno stato parziale.
32. receipt esistente per replay esatto → retry sicuro.
33. nessuna sessione interessata → sola transizione versione, se valida.
34. eventi non-lezione → invariati.
35. calendario → stessa sessione, nuova collocazione, nessun duplicato.
36. nuovo orario successivo → chiude versione corrente senza riscrivere storia.
37. fine attività senza nuovo orario → nessuna data finale inventata.
38. percorso ordinario → riepilogo + conferma.
39. un conflitto → una decisione esplicita.
40. molti invariati → nessuna conferma individuale.
41. dettaglio tecnico → secondario.
42. smartphone → percorso completo senza tabella larga obbligatoria.
43. storico → feedback percepibile di non modifica.
44. contenuti/materiali → feedback percepibile di preservazione.
45. conflitto senza target → nessuna sessione orfana.
46. conflitti irrisolti senza stato canonico → blocco.
47. receipt → legata al digest.
48. digest preimage → esclude digest/receipt/post-apply.
49. stesso payload canonico → stesso digest.
50. decisione/precondizione diversa → digest diverso.
51. attivazione riuscita → una successor `DRAFT`.
52. successor draft → copia completa slot attiva.
53. fallimento draft → nessuna transizione parziale.
54. replay → nessuna seconda draft.
55. DOS-A1 → non attivato.
56. sessione spostata con `NextLessonPreparation` → stessa preparazione logica ricomponibile.
57. `LessonPreparationManifest` ricomposto → stessi owner/materiali pertinenti, nessuna duplicazione.
58. `lessonRef` derivato da vecchia occorrenza → ponte risolve stessa preparazione.
59. tentativo store parallelo → gate fallito.
60. futura `CANCELLED` con unico equivalente → rebound preserva decisione/provenance.
61. futura `MOVED` con unico equivalente → rebound preserva intenzione/destinazione.
62. eccezione con target multipli → blocco.
63. eccezione senza target → blocco.
64. eccezione mutata → piano obsoleto.
65. fallimento ponte owner/rebound durante apply → rollback totale.
66. confine interseca storia con slot equivalenti → blocco comunque.
67. confine successivo a tutta la storia consolidata → prosegue agli altri gate.
68. `executed_history_boundary` mutato → piano obsoleto.

## 14. Gate di materializzazione

Prima del runtime devono essere verificati: compatibilità con i due documenti canonici; compatibilità con `0025_timetable_lifecycle.sql` e `/orario`; identità persistente della sessione; stati eseguito/consolidato e boundary; blocco storico incondizionato; matching deterministico/fail-closed; strategia canonica `lessonRef` verso i **record proprietari** senza persistere/duplicare read model; assenza di store paralleli; rebound deterministico delle eccezioni; stato `UNSCHEDULED_REPLAN_REQUIRED` o blocco; `PlanDigestPayload`; binding atomico request+digest; successor draft atomica/idempotente; accessibilità e smartphone; esecuzione casi 1–68; nuova revisione indipendente sul nuovo exact head; decisione umana finale.

**`HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE` resta attivo fino al completamento di tutti i gate.**