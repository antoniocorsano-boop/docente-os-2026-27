# DOS-TT-IMPORT-01 / G1.4 — Addendum normativo P1: continuità didattica, eccezioni e confine storico

Stato: DRAFT — GOVERNANCE FIRST
Ambito: integrazione normativa del contratto `DOS-TT-IMPORT-01-G1.4-TRANSITION-REPLAN-CONTRACT.md`.
Prevalenza: in caso di ambiguità, le regole di questo addendum restringono G1.4; non autorizzano runtime.

## 1. Scopo

Questo addendum chiude tre rischi emersi dalle revisioni sull'exact head `e907d87b727a3494f0adda8a9fb879b1289c5855`:

1. la ripianificazione non deve spezzare il legame canonico tra la lezione pianificata e `NextLessonPreparation` / `LessonPreparationManifest`;
2. una `timetable_exception` futura riferita a uno slot della versione sostituita non deve scomparire silenziosamente quando cambia `timetable_slot_id`;
3. un `effective_from` retrodatato che interseca storia già eseguita/consolidata deve bloccare sempre l'attivazione, senza valutazioni di equivalenza che riaprano il dominio storico.

Restano invariati `HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`.

## 2. Ponte canonico sessione ↔ preparazione della lezione

G1.4 **non introduce un secondo archivio delle lezioni** e non crea un modello parallelo a `NextLessonPreparation` / `LessonPreparationManifest`.

La futura identità persistente della sessione didattica è un'identità di continuità per la stessa lezione pianificata attraverso cambi di collocazione. La materializzazione deve definire un ponte esplicito e verificabile tra tale identità e i riferimenti canonici già usati dalla preparazione della lezione.

### 2.1 Regola di continuità

Quando una sessione futura viene riallineata da una vecchia occorrenza a una nuova occorrenza:

- la sessione resta la **stessa unità didattica**;
- `NextLessonPreparation` e `LessonPreparationManifest` restano la fonte canonica della preparazione e dei materiali secondo i contratti vigenti;
- obiettivi, materiali, note, provenance e stato di preparazione non vengono clonati in un nuovo store;
- il cambio dell'identità logica dell'occorrenza non può, da solo, produrre perdita o duplicazione della preparazione;
- ogni riferimento derivato oggi dall'identità logica dell'occorrenza, incluso `lessonRef` dove applicabile, deve essere migrato/risolto tramite un **mapping governato old-occurrence → stable-session → new-occurrence**, oppure tramite un'evoluzione equivalente del modello canonico approvata prima del runtime;
- il vecchio riferimento non viene semplicemente abbandonato e il nuovo riferimento non viene creato come lezione semanticamente distinta.

### 2.2 Vincolo su `lessonRef`

Poiché il runtime corrente può derivare `lessonRef` dall'identità logica dell'occorrenza, G1.4 non assume che `lessonRef` sia già l'identità persistente richiesta. Prima della materializzazione deve essere documentato e testato uno dei seguenti esiti governati:

1. `lessonRef` evolve in modo compatibile per riferirsi alla stable-session identity; oppure
2. viene introdotta una tabella/relazione canonica di mapping che consente a vecchio e nuovo riferimento di risolvere la stessa preparazione; oppure
3. un'altra soluzione equivalente dimostra, con migrazione e test, continuità senza duplicazione e senza store parallelo.

Qualunque soluzione deve preservare compatibilità con i manifest già persistiti e con i consumer esistenti. Nessun runtime G1.4 è autorizzato finché questo ponte non è materializzato e verificato.

## 3. Eccezioni future legate agli slot

Le eccezioni future sono parte delle precondizioni e degli effetti governati della transizione, non semplice contesto di lettura.

Per ogni `timetable_exception` futura nell'ambito della transizione che riferisce un vecchio `timetable_slot_id`, il piano deve produrre esattamente uno dei seguenti esiti:

- `EXCEPTION_REBOUND` — esiste un unico nuovo slot/occorrenza semanticamente equivalente e l'eccezione viene trasferita mantenendo tipo, data, intenzione docente e provenance;
- `EXCEPTION_UNCHANGED` — l'eccezione resta valida senza modifica perché il riferimento canonico non cambia;
- `EXCEPTION_RESOLVED_EXPLICITLY` — il docente risolve un caso non deterministico nell'anteprima;
- `EXCEPTION_BLOCKING` — non esiste un mapping univoco e sicuro; l'attivazione resta bloccata.

Non è ammesso che `CANCELLED`, `MOVED` o altra eccezione futura già revisionata diventi inefficace soltanto perché il nuovo orario usa un diverso `timetable_slot_id`.

### 3.1 Fail-closed

Se un'eccezione futura ha più target plausibili, non ha alcun target compatibile, confligge con una decisione di ripianificazione della sessione oppure è cambiata dopo la generazione dell'anteprima, il piano è non applicabile finché il caso non viene risolto esplicitamente o ricalcolato. Nessun trasferimento euristico silenzioso è consentito.

## 4. Confine storico: regola stretta

L'`executed_history_boundary` è un **vincolo di esclusione**, non un criterio per decidere se una transizione retroattiva possa essere considerata equivalente.

Regola normativa:

- se `effective_from` interseca anche una sola sessione/occorrenza già eseguita o consolidata nell'ambito governato, **l'attivazione è sempre bloccata**;
- il blocco si applica anche quando il vecchio e il nuovo orario apparirebbero strutturalmente equivalenti per quella data;
- nessun algoritmo può usare equivalenza di slot, matching o assenza di variazioni visibili per riaprire il dominio storico;
- il docente deve scegliere un `effective_from` successivo e compatibile;
- split o rettifica retroattiva richiedono un contratto separato e non sono autorizzati da G1.4.

Questa regola prevale su qualsiasi formulazione meno restrittiva del contratto principale.

## 5. Piano atomico e digest

`PlanDigestPayload` deve includere anche:

- revisione/fingerprint dell'insieme delle eccezioni future considerate;
- per ogni eccezione slot-bound interessata: identità dell'eccezione, vecchio riferimento, esito governato e nuovo riferimento quando presente;
- il mapping old-occurrence → stable-session → new-occurrence necessario alla continuità della preparazione;
- la revisione/fingerprint dei riferimenti canonici di preparazione interessati quando necessari a verificare la continuità;
- il valore/revisione dell'`executed_history_boundary` e la precondizione esplicita `effective_from > executed_history_boundary` per l'ambito pertinente;
- ogni decisione esplicita del docente sui casi non deterministici.

L'unità atomica di applicazione deve garantire congiuntamente: chiusura/attivazione delle versioni; riallineamento delle sessioni; continuità dei riferimenti alla preparazione canonica; rebound/risoluzione delle eccezioni future; creazione e popolamento della successor `DRAFT`; receipt idempotente. Se uno di questi effetti obbligatori fallisce, nessuna transizione parziale è osservabile.

## 6. Esperienza docente

Questi vincoli non aggiungono amministrazione tecnica al percorso ordinario. Se il mapping è deterministico, il riepilogo può limitarsi a confermare che **preparazioni, materiali ed eccezioni già impostate saranno mantenuti**.

Se la data interseca storia eseguita, il messaggio resta semplice: **“Questa data comprende lezioni già svolte. Scegli una data di entrata in vigore successiva.”**

Il docente interviene sulle altre ambiguità reali con formulazioni concrete. Identificatori, digest, mapping e nomi delle tabelle restano nel dettaglio tecnico.

## 7. Casi di prova aggiuntivi G1.4

Ai 55 casi già definiti si aggiungono obbligatoriamente:

56. sessione ripianificata con `NextLessonPreparation` esistente → stessa preparazione risolvibile dopo lo spostamento;
57. sessione ripianificata con `LessonPreparationManifest` e materiali → nessuna perdita e nessuna duplicazione;
58. `lessonRef` derivato dalla vecchia occorrenza → ponte/migrazione risolve la stessa preparazione dalla nuova collocazione;
59. tentativo di creare uno store parallelo di preparazione → gate fallito;
60. eccezione futura `CANCELLED` su vecchio slot con unico nuovo equivalente → rebound preserva cancellazione e provenance;
61. eccezione futura `MOVED` su vecchio slot con unico nuovo equivalente → rebound preserva intenzione e destinazione governata;
62. eccezione futura con più nuovi target plausibili → conflitto bloccante, nessun rebound silenzioso;
63. eccezione futura senza target compatibile → conflitto bloccante;
64. eccezione mutata dopo anteprima → piano obsoleto, nessuna scrittura;
65. fallimento nel mapping preparazione o nel rebound eccezioni durante apply → rollback dell'intera transizione, nessuno stato parziale osservabile;
66. `effective_from` che interseca storia eseguita/consolidata ma con slot apparentemente equivalenti → attivazione comunque bloccata;
67. `effective_from` successivo all'intera storia consolidata pertinente → può proseguire agli altri gate;
68. modifica dell'`executed_history_boundary` dopo anteprima → piano obsoleto e nessuna scrittura.

## 8. Gate aggiuntivi per la materializzazione

Prima del runtime G1.4 devono essere verificati anche:

- modello canonico corrente di `NextLessonPreparation` e `LessonPreparationManifest`;
- derivazione corrente di `lessonRef` e tutti i consumer che la assumono;
- strategia di mapping/migrazione che preserva una sola identità didattica attraverso il cambio di occorrenza;
- prova che non viene introdotto alcun lesson/preparation store parallelo;
- compatibilità dei manifest e delle preparazioni già persistite;
- schema e semantica correnti di `timetable_exception`, inclusi `CANCELLED` e `MOVED`;
- algoritmo deterministico di rebound delle eccezioni future slot-bound;
- comportamento fail-closed per eccezioni ambigue o non mappabili;
- blocco incondizionato di ogni `effective_from` che interseca storia eseguita/consolidata;
- inclusione di mapping della preparazione, eccezioni e boundary storico nel `PlanDigestPayload` e nell'unità atomica;
- materializzazione ed esecuzione dei casi 56–68;
- nuova revisione indipendente sul nuovo exact head;
- decisione umana finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE** resta attivo fino al completamento dei gate e della revisione finale.