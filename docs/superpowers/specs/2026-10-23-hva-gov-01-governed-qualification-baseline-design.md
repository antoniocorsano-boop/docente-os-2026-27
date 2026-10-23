# HVA-GOV-01 — Governed Qualification Baseline Design

**Data:** 2026-10-23  
**Stato:** DESIGN CANDIDATE — richiede approvazione umana prima di qualsiasi modifica a dati, codice o workflow  
**Repository:** `antoniocorsano-boop/docente-os-2026-27`  
**Baseline di partenza:** PR #726 exact head `89afa81fe1db7fae52f33c9adb0d2defb2546743`  
**Branch documentale:** `docs/hva-gov-01-governed-baseline`

## 1. Intento

Definire una baseline HVA governata, stabile e verificabile che permetta di qualificare in browser reale il requisito di Docente OS:

- una lezione conclusa e ancora da registrare;
- una lezione corrente/prossima;
- almeno un impegno Calendario compatto;
- tutto nello stesso stato di `Oggi`;
- senza fabbricare stato durante il test;
- senza mutare l'orario `ACTIVE` durante una run;
- senza introdurre self-healing o bypass del ciclo di vita del dominio.

La baseline deve essere un **dataset tecnico di qualificazione persistente, versionato e governato**, non una fixture opportunistica creata e rimossa dal singolo test.

## 2. Perché serve

Il Task 9 del Product IA Reset richiede evidenza browser autenticata della coesistenza `registrazione pendente + prossima lezione + Calendario`. Il piano approvato stabilisce che, se il runtime governato non produce deterministicamente questo stato, il journey resta `UNVERIFIED`; un test di modello puro non può sostituire la prova browser e non è consentito fabbricare dati ad hoc per ottenere un verde artificiale.

L'attuale tenant HVA è sufficientemente maturo per diventare una baseline governata: dispone già di autenticazione AAL2, classi, piano annuale, binding canonici, orario, fixture legacy e clock HVA deterministico. Il problema non è quindi creare un nuovo ambiente, ma dare all'ambiente esistente un **contratto di stato esplicito e immutabile durante la qualificazione**.

## 3. Stato osservato al momento della decisione

Nel workspace HVA canonico, al 23 ottobre 2026:

- esiste una sola versione `ACTIVE` rilevante per il workspace;
- esiste una `DRAFT` clonata dall'ACTIVE dal lifecycle canonico;
- ACTIVE e DRAFT contengono entrambe sei slot;
- il lunedì contiene una sola lezione: `08:00–09:00`, classe 2A, disciplina `Tecnologia`;
- lo slot `07:00–08:00` del lunedì è libero nella DRAFT;
- il relativo assignment canonico è `CONFIRMED`, marcato `HVA · Oggi · Cattedra canonica` e ha già `weekly_minutes = 120`, quindi due ore settimanali sono semanticamente coerenti senza modificare la cattedra;
- il clock HVA è già congelato a `2026-10-19T08:30:00+02:00` sia lato server sia lato browser;
- non esiste ancora un evento Calendario canonico per il journey di Oggi;
- la fixture `today-teacher-first` fallisce correttamente perché non esiste una lezione precedente governata prima delle 08:30;
- esiste una sola TeachingSession persistente occurrence-bound che dipende dall'ACTIVE corrente: la fixture legacy registrata del `2026-10-26`, blocco B01.

L'ultimo punto è rilevante: attivando la DRAFT, la precedente ACTIVE viene archiviata e i nuovi slot hanno identità proprie. La fixture legacy del 26 ottobre non può quindi essere lasciata agganciata a una versione che, dopo l'attivazione, non sarà più in vigore in quella data. La migrazione di questa dipendenza è parte obbligatoria di HVA-GOV-01.

Queste condizioni rendono possibile costruire la baseline senza creare un nuovo tenant o una nuova identità HVA.

## 4. Obiettivi

HVA-GOV-01 deve:

1. fornire un dataset HVA persistente e deterministico;
2. usare esclusivamente contratti e lifecycle normali del prodotto;
3. lasciare il dataset **read-only durante le run**;
4. rendere il drift osservabile e bloccante;
5. impedire che il CI corregga automaticamente il tenant;
6. distinguere chiaramente baseline persistente, fixture persistenti ausiliarie e fixture run-scoped;
7. mantenere il clock HVA unico e condiviso tra server e browser;
8. permettere postflight oggettivo sullo stesso stato iniziale;
9. evitare dati studenti o identificativi reali;
10. preservare la coerenza delle fixture occurrence-bound quando cambia la versione dell'orario;
11. mantenere la soluzione abbastanza piccola da poter essere auditata manualmente.

## 5. Non-obiettivi

HVA-GOV-01 non introduce:

- un nuovo tenant Supabase;
- un nuovo account HVA;
- branch Supabase effimeri per ogni run;
- service-role bypass;
- scritture SQL dirette nel normale percorso di qualificazione;
- modifica del modello di autorità dell'orario;
- un selettore di workspace;
- nuove capability prodotto;
- nuove dipendenze runtime;
- automazioni che riparano lo stato quando il preflight fallisce.

## 6. Anti-obiettivi

La soluzione è da considerare fallita anche se il test passa qualora:

- una run possa cambiare `timetable_versions` o `timetable_slots` della baseline;
- un crash possa lasciare l'ACTIVE in uno stato diverso;
- il preflight possa scrivere o correggere dati;
- il CI possa attivare una DRAFT;
- l'orario venga modificato direttamente nell'ACTIVE fuori dal lifecycle canonico;
- un secondo workspace venga affidato alla scelta implicita di `current_workspace_context()`;
- il journey possa diventare PASS grazie a record sintetici fuori contratto;
- una TeachingSession occurrence-bound continui a essere accettata pur riferendosi a una versione non in vigore nella propria data;
- il fingerprint ignori elementi semanticamente rilevanti;
- un drift venga classificato come NOT_APPLICABLE o PASS.

## 7. Approcci considerati

### A. Baseline governata nello workspace HVA attuale — scelta

Si evolve una sola volta la DRAFT corrente attraverso il lifecycle normale, la si attiva, quindi la nuova ACTIVE diventa la baseline HVA canonica e non viene più mutata durante le run.

**Vantaggi**

- riusa MFA, identità, classi, piano, binding e fixture già qualificati;
- minimizza superficie infrastrutturale;
- mantiene browser e backend nello stesso contesto reale già usato dai gate;
- consente un contratto di drift semplice;
- evita doppia gestione dei segreti.

**Costo / trade-off**

- la baseline HVA deve essere trattata come infrastruttura governata e non come spazio manuale liberamente modificabile;
- ogni futura modifica strutturale deve essere versionata e deliberata;
- l'attivazione deve includere una migrazione esplicita delle fixture persistenti legate agli ID della precedente ACTIVE.

### B. Secondo account HVA + workspace dedicato — non scelto ora

Avrebbe isolamento identitario forte ma richiederebbe duplicazione di MFA, segreti, piano annuale, classi, binding, fixture e manutenzione.

È un'opzione di escalation futura se HVA richiederà scenari incompatibili tra loro.

### C. Tenant/branch Supabase effimero per run — non scelto ora

Massimizza l'isolamento ma richiede bootstrap completo di Auth, MFA, dati canonici e contratti di runtime per ogni run. È sproporzionato rispetto al problema corrente e aumenta notevolmente il numero di punti di guasto.

### D. Secondo workspace nello stesso account — escluso

`current_workspace_context()` seleziona il primo membership ordinato per data di creazione e restituisce un solo workspace. Senza un selettore esplicito, introdurre un secondo workspace renderebbe il contesto implicito e fragile. Questa strada ridurrebbe il governo invece di aumentarlo.

## 8. Decisione architetturale

La baseline canonica sarà denominata:

`HVA-GOV-01 / Baseline v1`

Sarà ospitata nell'attuale workspace HVA e sarà costruita una sola volta tramite:

1. modifica della **DRAFT corrente**;
2. verifica della DRAFT e delle dipendenze occurrence-bound;
3. attivazione mediante il normale lifecycle `activate_timetable_version`;
4. migrazione governata delle fixture persistenti che puntavano alla precedente ACTIVE;
5. verifica della nuova ACTIVE e delle fixture migrate;
6. congelamento operativo della baseline durante le run HVA.

Nessun passaggio deve scrivere direttamente nella versione ACTIVE esistente.

## 9. Contratto temporale canonico

Il tempo HVA resta invariato:

`2026-10-19T08:30:00+02:00`

Il baseline contract del lunedì deve esporre esattamente due lezioni governate rilevanti per Oggi:

1. **07:00–08:00 — lezione precedente**
   - classe: 2A;
   - disciplina: Tecnologia;
   - assignment canonico: CONFIRMED;
   - `weekly_minutes` dell'assignment: 120;
   - nessuna TeachingSession registrata per l'occorrenza canonica del 19 ottobre 2026;
   - quindi deve risultare `ended + unregistered`.

2. **08:00–09:00 — lezione corrente**
   - classe: 2A;
   - disciplina: Tecnologia;
   - stesso assignment canonico CONFIRMED;
   - marker `HVA · Oggi · Cattedra canonica`;
   - alle 08:30 deve risultare current.

Non è richiesto cambiare l'orario degli altri giorni salvo che un controllo di collisione dimostri un conflitto reale.

## 10. Contratto Calendario canonico

La baseline deve includere un singolo evento Calendario tecnico persistente e riconoscibile, per esempio:

- titolo: `HVA · Impegno collegiale canonico`;
- data: `2026-10-19`;
- ora: `10:30–11:00`;
- tipo: `MEETING`;
- origine: manuale governata;
- nessun riferimento a persone o studenti;
- marker/source_ref univoco HVA-GOV-01.

L'evento viene creato una volta attraverso il normale percorso autenticato del dominio Calendario e non viene più inserito/eliminato dal singolo browser test.

## 11. Tre classi di dati HVA

### 11.1 Baseline persistente

Appartengono alla baseline:

- versione ACTIVE dell'orario HVA;
- i due slot canonici del lunedì;
- assignment e disciplina canonici;
- evento Calendario canonico;
- clock HVA;
- sezioni e binding necessari alla risoluzione della Lezione.

Questi dati **non vengono creati, aggiornati o cancellati durante una run**.

### 11.2 Fixture persistenti ausiliarie

Sono dati persistenti necessari ad altri journey ma non parte dello stato `Oggi`, per esempio la TeachingSession legacy registrata del 26 ottobre.

Regole:

- devono avere un marker/versione espliciti;
- devono essere occurrence-bound in modo coerente con una versione dell'orario in vigore nella loro data;
- un cambio di ACTIVE deve invalidare il preflight della fixture se il suo source version/slot è diventato stantio;
- la migrazione deve usare il contratto del dominio, inclusa la catena `supersedes_session_id` quando appropriata;
- il reader non deve accettare silenziosamente una fixture stantia solo perché il marker esiste.

### 11.3 Fixture run-scoped

Possono restare run-scoped solo dati che:

- appartengono esclusivamente a un singolo journey;
- hanno marker univoco di run;
- sono reversibili tramite contratto normale;
- possono essere ripuliti in modo deterministico;
- non costituiscono prerequisito della baseline di Oggi.

Esempi: asset Knowledge tecnici e fixture materiali.

## 12. Immutabilità durante la run

Durante `hva/application` sono vietate, per il perimetro baseline:

- `insert/update/delete` su `timetable_versions`;
- `insert/update/delete` su `timetable_slots` dell'ACTIVE canonico;
- attivazione di una timetable version;
- update di disciplina/assignment canonici;
- insert/delete dell'evento Calendario canonico;
- registrazione della TeachingSession relativa alla lezione canonica 07:00–08:00 del 19 ottobre.

La baseline di Oggi non deve dipendere dall'ordine accidentale dei test.

Le fixture persistenti ausiliarie non possono essere “riparate” in modo silenzioso da un journey browser: eventuale provisioning/migrazione deve appartenere a un passo esplicito e verificabile, separato dalla prova che consuma la fixture.

## 13. Fingerprint semantico

La baseline non deve essere validata tramite ID casuali o dump completi del database. Il preflight produce un oggetto canonico ordinato contenente solo invarianti semantiche:

```json
{
  "schemaVersion": 1,
  "baseline": "HVA-GOV-01/v1",
  "canonicalNow": "2026-10-19T08:30:00+02:00",
  "timetable": {
    "activeCount": 1,
    "date": "2026-10-19",
    "assignment": {
      "class": "2A",
      "discipline": "Tecnologia",
      "status": "CONFIRMED",
      "weeklyMinutes": 120,
      "marker": "HVA · Oggi · Cattedra canonica"
    },
    "lessons": [
      {
        "weekday": 1,
        "start": "07:00",
        "end": "08:00",
        "class": "2A",
        "discipline": "Tecnologia",
        "recorded": false
      },
      {
        "weekday": 1,
        "start": "08:00",
        "end": "09:00",
        "class": "2A",
        "discipline": "Tecnologia"
      }
    ]
  },
  "calendar": {
    "date": "2026-10-19",
    "start": "10:30",
    "end": "11:00",
    "kind": "MEETING",
    "marker": "HVA-GOV-01"
  }
}
```

L'oggetto viene serializzato in forma canonica e può essere accompagnato da SHA-256 per confronti rapidi. Il fingerprint non sostituisce il contenuto leggibile: in caso di drift il diagnostico deve indicare quale invariante è cambiato.

Gli ID runtime di versioni e slot non fanno parte del fingerprint semantico atteso, ma devono essere raccolti nel receipt diagnostico per dimostrare quale stato reale è stato osservato.

## 14. Preflight

Il preflight HVA deve essere **read-only** e deve verificare almeno:

1. identità del workspace HVA atteso;
2. anno scolastico attivo atteso;
3. esattamente una versione ACTIVE valida alla data canonica;
4. presenza e unicità delle due lezioni 07:00–08:00 e 08:00–09:00;
5. stessa sezione 2A e disciplina Tecnologia;
6. assignment CONFIRMED con `weekly_minutes = 120` e marker canonico;
7. assenza di TeachingSession per l'occorrenza 07:00–08:00 del 19/10;
8. presenza e unicità dell'evento Calendario canonico;
9. assenza di duplicati baseline;
10. fingerprint uguale alla baseline attesa;
11. validità delle fixture persistenti ausiliarie richieste dalla suite, compreso il fatto che una TeachingSession occurrence-bound punti a una versione in vigore nella sua `local_date`.

Esito possibile:

- `PASS` — baseline e dipendenze richieste esattamente conformi;
- `FAIL_BASELINE_DRIFT` — baseline diversa;
- `FAIL_FIXTURE_DRIFT` — fixture persistente ausiliaria stantia o incoerente;
- `ERROR` — impossibile leggere o autenticare.

Non esiste `self-heal`.

## 15. Postflight

Dopo la suite, un secondo controllo read-only deve ricalcolare lo stesso fingerprint.

Per il perimetro baseline:

`postflight fingerprint == preflight fingerprint`

è una condizione obbligatoria del gate.

Il postflight deve inoltre verificare:

- l'assenza di fixture run-scoped residue note;
- la validità delle fixture persistenti ausiliarie consumate;
- l'assenza di nuove timetable version attivate durante la run.

Una suite browser che passa ma altera la baseline deve essere classificata **FAIL**, non PASS con warning.

## 16. Failure modes e comportamento richiesto

### Drift manuale della baseline

**Esempio:** qualcuno modifica l'orario HVA dalla UI.

Comportamento: preflight `FAIL_BASELINE_DRIFT`; nessuna correzione automatica; HVA non parte o non viene qualificata.

### TeachingSession 07:00–08:00 già registrata

Comportamento: `FAIL_BASELINE_DRIFT`; il journey non deve cancellarla o inventare un'altra lezione per compensare.

### Fixture legacy registrata legata a una versione archiviata non valida nella sua data

Comportamento: `FAIL_FIXTURE_DRIFT`. La semplice presenza del marker non è sufficiente. La fixture deve essere migrata esplicitamente prima della qualificazione.

### Evento Calendario mancante/duplicato

Comportamento: `FAIL_BASELINE_DRIFT`.

### DRAFT modificata durante le run

La DRAFT non fa parte del fingerprint operativo salvo elementi necessari a garantire che non venga confusa con ACTIVE. Modificarla manualmente non deve cambiare Oggi, ma qualsiasi procedura di attivazione resta proibita durante HVA.

### Crash di Playwright

La baseline resta invariata perché il journey Oggi è read-only. Le fixture run-scoped devono avere cleanup indipendente e postflight di residui.

### Credenziali/MFA indisponibili

`ERROR / not executed`; mai PASS.

## 17. Lifecycle di modifica futura della baseline

Una modifica futura di HVA-GOV-01 richiede:

1. motivazione documentata;
2. nuova baseline version (`v2`, `v3`, ...);
3. aggiornamento del contratto semantico;
4. inventario delle fixture persistenti occurrence-bound dipendenti dall'ACTIVE corrente;
5. modifica della DRAFT, mai dell'ACTIVE;
6. review della DRAFT;
7. attivazione manuale/autorizzata fuori dalla normale run HVA;
8. migrazione governata delle dipendenze occurrence-bound;
9. nuovo fingerprint atteso;
10. rerun completo dei gate interessati;
11. registrazione del passaggio di versione.

La baseline non è quindi “immutabile per sempre”; è **immutabile per versione e durante l'esecuzione**.

## 18. Governo delle scritture

Le scritture di provisioning della baseline devono usare un'identità autenticata governata e i percorsi applicativi/domain già previsti.

Sono esclusi:

- service-role per comodità;
- SQL ad hoc in CI;
- trigger nascosti che ricreano dati mancanti;
- migration schema usate per inserire ID runtime specifici;
- mutazioni non tracciate dell'ACTIVE.

Il provisioning una tantum può essere automatizzato solo come comando esplicito di amministrazione HVA, separato dal gate ordinario, con dry-run e ricevuta. Non deve essere invocato automaticamente da `pull_request`.

La migrazione della TeachingSession legacy deve avvenire attraverso `record_teaching_session` e il meccanismo `supersedes_session_id`, oppure attraverso un contratto applicativo equivalente già governato. Non è ammessa la cancellazione della storia per rendere il test più semplice.

## 19. Compatibilità con i journey e le fixture esistenti

### 19.1 Assunzioni d'ordine

Prima dell'attivazione della baseline v1 va verificato che il secondo slot del lunedì non rompa journey che assumono implicitamente “prima lezione disponibile”.

Regola di hardening:

- i journey devono selezionare per identità/marker/contesto quando la semantica richiede una lezione specifica;
- è vietato affidarsi a `.first()` su collezioni di lezioni quando l'identità della lezione influenza il risultato;
- i journey che hanno bisogno di una qualsiasi lezione possono mantenere selezione generica solo se il risultato è semanticamente equivalente.

La presenza di un secondo slot è quindi anche un test utile contro assunzioni d'ordine nascoste.

### 19.2 Fixture legacy registrata del 26 ottobre

La TeachingSession persistente `HVA · Legacy recorded lesson · 2026-10-26 · B01` è attualmente occurrence-bound all'ACTIVE pre-HVA-GOV-01.

L'attivazione della nuova DRAFT cambierà `timetable_version_id`, `timetable_slot_id` e `projected_occurrence_logical_id` canonici per il 26 ottobre.

Prima di dichiarare Baseline v1 pronta, è obbligatorio:

1. rendere il reader della fixture capace di rifiutare una sessione il cui source timetable non è in vigore nella `local_date`;
2. dopo l'attivazione, creare una nuova TeachingSession B01 legata alla nuova occorrenza canonica del 26 ottobre;
3. collegarla alla precedente tramite `supersedes_session_id`;
4. versionare il marker/receipt della fixture in modo che i test consumino la chain head valida, non il record storico precedente;
5. verificare che Diario, Lezione e i journey legacy non mostrino due registrazioni operative concorrenti;
6. preservare il record storico precedente come lineage, non cancellarlo.

Attualmente questa è l'unica TeachingSession persistente rilevata nel workspace HVA che punta all'ACTIVE da sostituire. Il provisioning deve comunque rifare l'inventario immediatamente prima dell'attivazione e fermarsi se ne compaiono altre.

## 20. Concurrency

L'attuale workflow HVA usa una coda governata unica. HVA-GOV-01 mantiene questo modello.

Il contratto minimo è:

- una sola suite HVA mutabile alla volta sul tenant condiviso;
- nessuna mutazione baseline anche con coda seriale;
- fixture run-scoped separate per marker;
- eventuali workflow futuri che usano lo stesso tenant devono unirsi allo stesso dominio di concurrency o essere dimostrati read-only.

La serializzazione riduce il rischio ma non è un sostituto dell'immutabilità della baseline.

## 21. Privacy e sicurezza

La baseline:

- non contiene dati studenti;
- non richiede login studente;
- non introduce tracking;
- usa nomi di classi tecniche già parte del tenant HVA;
- non deve contenere email, nomi reali o dati personali nelle note/marker;
- continua a richiedere AAL2 per i journey governati.

## 22. Osservabilità e ricevuta

La ricevuta HVA dovrebbe riportare:

- `baselineId: HVA-GOV-01/v1`;
- preflight fingerprint;
- postflight fingerprint;
- esito `baselineIntegrity`;
- esito `persistentFixtureIntegrity`;
- eventuale drift con diagnostico leggibile;
- exact application commit testato;
- journey `today-teacher-first` PASS/FAIL/UNVERIFIED;
- nessun valore segreto.

Questo consente di distinguere chiaramente:

- regressione applicativa;
- drift della baseline;
- drift di fixture persistente;
- errore infrastrutturale;
- mancata esecuzione.

## 23. Criteri di accettazione del design

Il design è pronto per pianificazione solo se viene approvato che:

1. l'attuale workspace HVA resta l'unico ambiente di qualificazione per questa fase;
2. il secondo slot viene aggiunto alla DRAFT e promosso solo tramite lifecycle canonico;
3. l'ACTIVE non viene mai modificata direttamente;
4. l'assignment canonico resta quello 2A/Tecnologia, CONFIRMED, 120 minuti;
5. Calendario diventa parte della baseline persistente;
6. `today-teacher-first` diventa read-only rispetto alla baseline;
7. preflight e postflight sono entrambi read-only e fail-closed;
8. nessun self-healing CI è ammesso;
9. il fingerprint semantico è parte del gate;
10. la fixture legacy occurrence-bound del 26 ottobre viene migrata con lineage, non lasciata stantia né cancellata;
11. ogni futura evoluzione della baseline richiede una nuova versione e un nuovo inventario delle dipendenze;
12. nessun merge/deploy della #726 deriva automaticamente dall'approvazione di HVA-GOV-01.

## 24. Sequenza concettuale dopo l'approvazione

Questa sezione descrive l'ordine logico, non costituisce ancora piano di implementazione.

1. hardening dei test che dipendono dall'ordine delle lezioni;
2. hardening del reader della fixture legacy contro source version/slot stantii;
3. implementazione del validator/fingerprint read-only;
4. RED controllato sulla baseline attuale a una sola lezione;
5. dry-run dell'inventario delle dipendenze occurrence-bound;
6. provisioning una tantum della DRAFT con lo slot 07:00–08:00;
7. provisioning dell'evento Calendario canonico;
8. review della DRAFT e del contratto;
9. attivazione governata fuori dalla run HVA;
10. migrazione della TeachingSession legacy tramite nuova occorrenza + `supersedes_session_id`;
11. verifica Baseline v1 e fixture persistenti;
12. rimozione delle mutazioni Calendario dalla fixture Oggi;
13. preflight + browser + postflight sullo stesso exact head;
14. solo dopo PASS, riprendere la qualificazione finale della PR #726.

## 25. Decisione congelata

**Scelta:** Approccio A — baseline governata nell'attuale workspace HVA.

**Ragione:** massimizza governo e determinismo con la minima nuova superficie infrastrutturale, riusa l'identità AAL2 e i contratti già qualificati e permette di rendere il journey Oggi realmente read-only.

**Vincolo irrinunciabile:** nessuna scorciatoia può trasformare il dataset di qualificazione in stato auto-riparato o manipolato durante il test; ogni dipendenza persistente legata al vecchio ACTIVE deve essere migrata con lineage verificabile.
