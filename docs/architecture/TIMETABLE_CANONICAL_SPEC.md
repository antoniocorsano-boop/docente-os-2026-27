# Orario canonico Docente OS — ricostruzione da DocenteDocAi_Beta

## 1. Scopo

Questo documento ricostruisce le specifiche funzionali dell'orario presenti nel repository storico `antoniocorsano-boop/DocenteDocAi_Beta` e le traduce nel modello canonico di **Docente OS 2026/2027**.

La ricostruzione non è un porting del codice legacy. Conserva i comportamenti didatticamente utili, elimina le dipendenze dalla persistenza locale e introduce le identità necessarie per collegare l'orario al piano annuale persistente già presente in Docente OS.

La catena target è:

`anno scolastico → sezione → versione orario → slot ricorrente → occorrenza reale → sessione didattica → blocco CAN-PLAN → registro di attuazione`

Il **CAN-PLAN resta il canone didattico**. L'orario determina quando quel canone può essere eseguito; non modifica UDA, pacchetti o monte ore.

## 2. Provenienza della ricostruzione

Baseline ispezionata di `DocenteDocAi_Beta`: commit indicizzato `24344049f0df8798fc52f6d8fa4168ea791a1998` sul ramo `main`.

Fonti principali ricostruite:

- `src/types/uda.types.ts` — `Slot`, `Lezione`, `TeachingAssignment`, `TimetableSettings`;
- `src/constants.ts` — giorni, tipi lezione e configurazione oraria predefinita;
- `src/components/Timetable.tsx` — vista settimana/giorno e matrice oraria;
- `src/components/TimetableCell.tsx` — semantica visiva e interazione della cella;
- `src/components/EditSlotModal.tsx` — configurazione dello slot e tipi speciali;
- `src/components/SlotActionModal.tsx` — azioni su una lezione programmata;
- `src/components/ModalManager.tsx` — creazione/eliminazione associazione slot ↔ lezione;
- `src/hooks/useAppEngine.ts` — scheduling, avvio aula e registro draft;
- `src/components/settings/SettingsAI.tsx` — configurazione ore giornaliere, ora iniziale, classi, discipline e cattedra;
- `src/hooks/useSettingsLogic.ts` — associazioni classe/materia e ore settimanali;
- `src/stores/useAcademicStore.ts` — stato `slots`/`lessons`;
- `src/hooks/usePersistence.ts` e `docs/guides/QUICK_REFERENCE.md` — persistenza e backup legacy;
- `src/components/OperationsCenter.tsx` — processo esplicito “Configura Orario”.

## 3. Specifica legacy ricostruita

### 3.1 Oggetti distinti: Slot e Lezione

Il repository storico separa correttamente due concetti.

**Slot**:

```text
giorno
ora
classe?
materia?
lezioneId?
```

Lo slot descrive la posizione ricorrente nella griglia settimanale e può puntare a una lezione.

**Lezione**:

```text
id
classe
materia
contenuto
svolta
data?
tipoLezione?
udaId? / unitaDiApprendimento?
nota?
obiettivi?
contesto?
compiti?
adattamenti?
materialiDidattici?
externalLink?
```

La lezione contiene quindi il contenuto didattico e gli artefatti, mentre lo slot fornisce il contesto temporale.

**Decisione da conservare:** orario e contenuto didattico non devono essere lo stesso oggetto.

### 3.2 Identità legacy dello slot

La chiave tecnica legacy è:

```text
${giorno}-${ora}
```

Esempio: `Lunedì-08:00`.

La chiave è sufficiente per una griglia locale del singolo docente, ma non identifica anno scolastico, workspace, versione dell'orario o validità temporale.

### 3.3 Settimana e vista

La vista orario mostra:

- lunedì, martedì, mercoledì, giovedì, venerdì e sabato;
- modalità **Settimana**;
- modalità **Giorno**;
- evidenziazione del giorno corrente;
- navigazione giorno precedente/successivo nella modalità giornaliera;
- stampa dell'orario;
- layout adattivo: su smartphone la vista Giorno è il percorso operativo preferito.

La matrice è semanticamente una tabella accessibile, con intestazioni di giorno e ora e celle cliccabili.

### 3.4 Configurazione dell'orario giornaliero

Valori legacy predefiniti:

- `oreGiornaliere = 6`;
- `orarioInizio = 08:00`;
- `timeSlots = [08:00, 09:00, 10:00, 11:00, 12:00, 13:00]`.

L'utente può scegliere:

- da **4 a 10 ore giornaliere**;
- inizio lezioni tra `07:00`, `07:30`, `08:00`, `08:30`, `09:00`.

Il legacy rigenera `timeSlots` automaticamente assumendo **durata costante di 60 minuti**.

### 3.5 Cattedra e assegnazioni

`TeachingAssignment` contiene:

```text
id
classId
subjectId
color
hoursPerWeek
```

Il sistema consente:

- creazione massiva delle associazioni classe/materia;
- controllo dell'esistenza per evitare doppioni in UI;
- impostazione delle ore settimanali per associazione;
- generazione classi da anni + sezioni;
- gestione dell'elenco delle discipline.

Il modello legacy considera quindi **la cattedra una sorgente dell'orario**, non un semplice attributo grafico.

### 3.6 Interazione con una cella

Regola legacy:

- cella vuota → apertura editor dello slot;
- cella con classe/lezione → apertura azioni della lezione;
- `Disposizione` e `Ricevimento` sono trattati come contenuto valido anche senza classe ordinaria.

Per una lezione standard sono obbligatorie:

- **classe**;
- **materia**.

Campi opzionali già presenti:

- argomento/contenuto;
- collegamento a materiale AI/NotebookLM.

### 3.7 Tipologie operative

La configurazione dello slot distingue tre macro-attività:

1. **Lezione**;
2. **Disposizione**;
3. **Ricevimento**.

Per le lezioni sono inoltre presenti i tipi:

- Teoria;
- Disegno;
- Laboratorio;
- Test;
- Verifica;
- Disposizione;
- Ricevimento.

`Disposizione` e `Ricevimento` vengono salvati come lezioni speciali con `classe = N/A`, contenuto predefinito e nota opzionale.

### 3.8 Salvataggio e cancellazione

Nel legacy il salvataggio crea/aggiorna una `Lezione`, quindi inserisce il suo `id` nello `Slot`.

La cancellazione dello slot:

1. rimuove la lezione associata, se presente;
2. rimuove lo slot dalla mappa.

Questa operazione è valida per un archivio locale semplice, ma in Docente OS la cancellazione del pattern ricorrente non dovrà cancellare lo storico delle sessioni già svolte.

### 3.9 Azioni sulla lezione programmata

Da uno slot occupato il legacy espone:

- **Vedi dettagli**;
- **Modifica**;
- **Avvia Aula** / **Torna in Aula**.

L'avvio aula crea, se assente, una voce di registro `draft` collegata a:

```text
slotKey
lessonId
classe
materia
data corrente
presenze
```

Il concetto da conservare è forte: **l'orario deve essere un punto di ingresso operativo verso la lezione reale e il registro**, non una tabella passiva.

### 3.10 Semantica visiva

La cella distingue:

- slot vuoto → affordance “aggiungi”;
- lezione ordinaria programmata;
- lezione già svolta → attenuazione + check;
- disposizione → trattamento visivo dedicato;
- ricevimento → trattamento visivo dedicato;
- presenza di materiale AI → badge specifico.

La cella mostra almeno:

- classe;
- materia;
- icona tipologia;
- stato svolto;
- eventuale presenza materiale collegato.

### 3.11 Persistenza legacy

Il vecchio prodotto mantiene `slots`, `lessons` e impostazioni negli store client e li riversa nel backup applicativo; la documentazione descrive LocalStorage/IndexedDB e backup Google Drive personale.

**Non viene portato in Docente OS:** nel nuovo prodotto Supabase + RLS restano fonte persistente autorevole; la cache browser può essere soltanto una replica non autorevole.

## 4. Limiti legacy da non importare

### 4.1 Chiave giorno-ora troppo debole

`Lunedì-08:00` non distingue:

- workspace;
- anno scolastico;
- docente/contesto;
- versione dell'orario;
- periodo di validità;
- cambi orario in corso d'anno.

### 4.2 Slot ricorrente e lezione concreta sono collegati 1:1

Nel legacy uno slot settimanale punta direttamente a una singola lezione. Questo non modella correttamente una sequenza annuale di decine di lezioni nello stesso slot.

In Docente OS:

- lo **slot ricorrente** descrive il pattern;
- l'**occorrenza** descrive una data concreta;
- la **sessione didattica** descrive ciò che viene pianificato/svolto in quella occorrenza.

### 4.3 `svolta` non deve appartenere al pattern orario

Lo stato “svolta” è una proprietà dell'esecuzione concreta, non del martedì alle 10:00 in astratto.

### 4.4 Durata fissa di 60 minuti

Il legacy genera slot a passo fisso di 60 minuti. Docente OS deve supportare:

- ora di inizio;
- ora di fine;
- durata effettiva;
- eventuali intervalli;
- ore non omogenee se l'istituto le adotta.

### 4.5 Nessuna versione temporale dell'orario

Un cambio orario non deve riscrivere il passato. Serve una versione con `effective_from` / `effective_to`.

### 4.6 Nessun modello di eccezioni

Devono essere rappresentabili almeno:

- festività/sospensione generale;
- sospensione d'istituto;
- uscita anticipata;
- lezione annullata;
- lezione aggiuntiva;
- sostituzione/disposizione;
- cambio aula/orario una tantum;
- evento di istituto/Open Day.

### 4.7 Nessun legame forte con il canone annuale

Docente OS deve conoscere per ogni sessione quale **CAN-PLAN**, quale **generazione KB** e quale **Bxx** sta eseguendo.

## 5. Modello canonico target Docente OS

### 5.1 `teaching_assignments`

Rappresenta la cattedra annuale.

Campi logici minimi:

```text
id
workspace_id
academic_year_id
section_id
discipline
weekly_minutes / weekly_hours
status = PROVISIONAL | CONFIRMED
source_note
created_by
created_at
updated_at
```

Regole:

- una assegnazione appartiene a una sezione dello stesso workspace/anno;
- le assegnazioni provvisorie non diventano confermate automaticamente;
- per Tecnologia il valore atteso del piano corrente è 120 minuti/settimana per sezione, salvo dato ufficiale diverso.

### 5.2 `timetable_versions`

Rappresenta una configurazione di orario valida in un intervallo.

```text
id
workspace_id
academic_year_id
label
status = DRAFT | ACTIVE | ARCHIVED
effective_from
effective_to?
source_kind = MANUAL | INSTITUTION_DOCUMENT | IMPORT
source_ref?
created_by
created_at
```

Invarianti:

- nessuna sovrapposizione di due versioni `ACTIVE` per lo stesso contesto e data;
- una modifica sostanziale dell'orario genera una nuova versione;
- il passato già eseguito non viene riscritto.

### 5.3 `timetable_slots`

Rappresenta il pattern ricorrente settimanale.

```text
id
timetable_version_id
weekday = 1..6
start_time
end_time
slot_kind = LESSON | DISPOSITION | RECEPTION | OTHER
section_id?
discipline?
teaching_assignment_id?
room?
note?
ordinal?
```

Invarianti:

- `end_time > start_time`;
- una lezione ordinaria richiede sezione + disciplina/assegnazione;
- disposizione/ricevimento possono non avere sezione;
- non sono ammessi overlap incompatibili nella stessa versione;
- la durata non è implicita e non è fissata a 60 minuti.

### 5.4 `timetable_exceptions`

Rappresenta deviazioni puntuali dal pattern.

```text
id
workspace_id
academic_year_id
date
timetable_slot_id?
section_id?
kind = SUSPENSION | CANCELLED | MOVED | EXTRA | REPLACED | INSTITUTION_EVENT
replacement_start_time?
replacement_end_time?
reason
source_kind
source_ref?
created_by
```

Una eccezione non cancella il pattern; ne modifica la materializzazione per una data.

### 5.5 Occorrenza

L'**occorrenza oraria** è un read model derivato da:

```text
versione attiva
+ slot ricorrente
+ calendario scolastico
+ eccezioni
```

Identità logica:

```text
slot_id + local_date
```

Campi derivati:

```text
date
start_at
end_at
section_id
slot_kind
discipline
is_instructional_day
exception_state
```

Non è necessario persistere tutte le occorrenze future se possono essere rigenerate deterministicamente. Una occorrenza che entra nel registro deve però avere un riferimento stabile o uno snapshot della sorgente.

## 6. Collegamento con CAN-PLAN e blocchi B01–B33

### 6.1 Principio

L'orario **non assegna il contenuto**: fornisce capacità temporale.

Per ogni sezione:

1. il `CAN-PLAN` fornisce la coda B01–B33;
2. l'orario produce le occorrenze didattiche utili;
3. il motore assegna la capacità cronologica al primo blocco non completato;
4. una sospensione non consuma capacità;
5. una sessione effettivamente svolta alimenta il registro di attuazione.

### 6.2 Blocco da 2 ore e ore reali

Il blocco `Bxx = 120 minuti pianificati`, non necessariamente una singola riga dell'orario.

Regola target:

- due slot contigui della stessa sezione/materia possono soddisfare un Bxx nella stessa data;
- se l'orario ufficiale divide le due ore in giorni diversi, il Bxx può essere eseguito tramite più sessioni la cui somma raggiunge 120 minuti;
- il completamento del Bxx deriva dalle sessioni effettive, non dal semplice trascorrere della data.

Questo richiede, nella slice implementativa successiva, un livello figlio della progressione del blocco (sessioni/minuti) oppure un equivalente read model persistente.

### 6.3 Ancoraggio canonico

Ogni sessione che consuma un Bxx deve conservare almeno:

```text
annual_plan_section_id
block_id
canonical_plan_asset_id
canonical_generation_id
timetable_version_id
timetable_slot_id
planned_date
actual_date?
planned_minutes
actual_minutes?
```

La generazione CAN-PLAN rimane quella già congelata nel record di esecuzione, anche se in seguito il documento viene revisionato.

## 7. Algoritmo di materializzazione delle date

Per una sezione e un intervallo:

1. selezionare la versione orario valida nella data;
2. leggere gli slot `LESSON` associati alla sezione/disciplina;
3. generare le date corrispondenti al `weekday`;
4. escludere date fuori da `academic_year.starts_on/ends_on`;
5. escludere festività e sospensioni del calendario;
6. applicare le eccezioni istituzionali/locali;
7. ordinare cronologicamente le occorrenze utili;
8. allocare progressivamente i B01–B33 in base ai minuti disponibili;
9. non consumare il blocco in caso di annullamento/sospensione;
10. in caso di nuova versione dell'orario, ricalcolare soltanto il futuro non ancora eseguito.

## 8. UX canonica

### 8.1 Vista Orario

Conservare dal legacy:

- vista **Settimana** e **Giorno**;
- lunedì–sabato, con giorni configurabili se necessario;
- evidenza del giorno corrente;
- navigazione rapida tra giorni;
- stampa;
- griglia accessibile;
- interazione diretta sulle celle;
- su mobile priorità alla vista Giorno.

### 8.2 Cella

La cella deve mostrare almeno:

```text
classe/sezione
materia o tipo speciale
orario
stato della sessione odierna/futura
Bxx corrente se applicabile
badge materiali/evidenze
```

Stati visivi distinti:

- vuoto;
- lezione ordinaria;
- disposizione;
- ricevimento;
- sospesa/annullata;
- svolta;
- rimodulata;
- materiale pronto.

### 8.3 Clic su cella vuota

Apre “Configura slot” con:

- tipo attività;
- sezione;
- disciplina;
- ora inizio/fine;
- eventuale aula/nota;
- origine/affidabilità se derivato da documento istituzionale.

### 8.4 Clic su cella occupata

Apre un pannello operativo con:

- dettagli slot;
- prossimo Bxx / UDA;
- materiali CAN-PACK collegati;
- **Avvia lezione**;
- **Modifica slot**;
- **Sposta/annulla solo questa data**;
- **Modifica orario dal…** → crea nuova versione;
- **Apri piano annuale**;
- **Apri fonte KB**.

### 8.5 Configurazione iniziale

Il processo ricostruito “Configura Orario” diventa:

1. verifica cattedra/sezioni;
2. configura scansione giornaliera;
3. compila la griglia cliccando gli slot;
4. valida ore settimanali e collisioni;
5. salva come `DRAFT`;
6. attiva con data di efficacia;
7. materializza le date previste del piano annuale.

## 9. Validazioni

Prima di attivare una versione devono passare almeno:

- nessun overlap temporale incompatibile;
- ogni slot `LESSON` ha sezione e assegnazione valida;
- tutte le sezioni appartengono allo stesso anno/workspace;
- somma settimanale per assegnazione confrontata con il monte ore dichiarato;
- `start_time < end_time`;
- nessuna data di efficacia fuori dall'anno scolastico;
- nessuna modifica retroattiva su sessioni già eseguite;
- il mapping Bxx non supera 33 blocchi/66 ore per il CAN-PLAN corrente;
- disposizione/ricevimento non consumano automaticamente ore CAN-PLAN.

Le discrepanze tra cattedra e orario devono essere **warning espliciti** finché l'orario è DRAFT e **bloccanti** solo quando compromettono l'identità o la contabilizzazione.

## 10. Migrazione concettuale dal legacy

| Legacy `DocenteDocAi_Beta` | Docente OS target |
|---|---|
| `TimetableSettings.timeSlots` | configurazione UI + slot con `start_time/end_time` |
| `oreGiornaliere`, `orarioInizio` | preset di generazione, non vincolo di dominio |
| `TeachingAssignment` | `teaching_assignments` persistente |
| `Slot` | `timetable_slots` ricorrente |
| chiave `giorno-ora` | UUID + versione + weekday + intervallo |
| `Slot.lezioneId` | nessun legame 1:1 con una lezione annuale |
| `Lezione` | sessione didattica/registro legata a occorrenza |
| `Lezione.svolta` | stato della sessione/blocco effettivo |
| `Disposizione` | `slot_kind=DISPOSITION` |
| `Ricevimento` | `slot_kind=RECEPTION` |
| cancellazione slot + lezione | nuova versione o eccezione; storico preservato |
| LocalStorage/backup Drive | Supabase + RLS; cache locale non autorevole |
| “Avvia Aula” | avvio sessione e registro effettivo |

## 11. Regole di compatibilità con il piano annuale già implementato

Le tabelle esistenti `annual_plan_sections` e `annual_plan_block_progress` restano valide.

Non devono essere duplicate.

La slice orario dovrà:

- usare `annual_plan_sections.id` come identità della sezione annuale;
- usare i `CANONICAL_PLAN_SOURCES` già presenti nel runtime;
- alimentare `executed_on` e lo stato aggregato del blocco a partire dalle sessioni effettive;
- preservare le cinque sezioni provvisorie già materializzate finché non sono confermate/sostituite;
- non creare sezioni di prima senza evidenza ufficiale;
- non modificare automaticamente un Bxx solo perché la data prevista è trascorsa.

## 12. Slice implementative consigliate

### T1 — Cattedra + versione orario

- schema `teaching_assignments`;
- schema `timetable_versions`;
- schema `timetable_slots`;
- RLS e invarianti;
- repository server-side;
- configuratore base.

### T2 — Griglia settimanale

- vista Settimana/Giorno;
- celle cliccabili;
- lezioni/disposizione/ricevimento;
- validazione ore settimanali;
- stampa.

### T3 — Calendario ed eccezioni

- `timetable_exceptions`;
- calendario scolastico;
- sospensioni istituzionali;
- cambio singola data;
- versioning dal giorno X.

### T4 — Motore CAN-PLAN

- materializzazione occorrenze;
- allocazione B01–B33;
- supporto a 120 minuti anche su più sessioni;
- ricalcolo solo del futuro;
- stato previsto vs effettivo.

### T5 — Aula/registro

- “Avvia lezione” dalla cella;
- sessione reale;
- evidenze, materiali, recupero/adattamenti;
- aggregazione in `annual_plan_block_progress`;
- output per programma svolto e relazione finale.

## 13. Criteri di accettazione del sistema orario

Il sistema è considerato pronto quando:

1. il docente può rappresentare fedelmente il proprio orario settimanale senza duplicare il CAN-PLAN;
2. un cambio orario da una certa data non altera lo storico;
3. una sospensione non consuma automaticamente Bxx;
4. ogni sessione ordinaria è riconducibile a sezione, disciplina, slot, versione orario e CAN-PLAN;
5. 33 blocchi / 66 ore restano il budget didattico canonico, indipendentemente dalla forma dell'orario;
6. l'orario è utilizzabile sia come planning sia come punto di ingresso alla lezione reale;
7. `Disposizione` e `Ricevimento` sono gestiti senza falsare il monte ore di Tecnologia;
8. le date previste possono essere rigenerate deterministicamente da orario + calendario + eccezioni;
9. il passato eseguito è immutabile rispetto a nuove versioni dell'orario;
10. Supabase/RLS è la fonte autorevole e il browser non è l'unica copia dei dati.

## 14. Decisione

La specifica legacy viene **adottata funzionalmente, non tecnicamente**.

Si conservano:

- separazione slot/lezione;
- matrice settimanale;
- vista giorno;
- cattedra e ore settimanali;
- editing diretto delle celle;
- disposizione/ricevimento;
- azione “Avvia lezione/aula”;
- semantica visiva dello stato.

Si sostituiscono:

- identità `giorno-ora`;
- legame slot ↔ singola lezione;
- durata obbligatoriamente oraria;
- persistenza locale come fonte primaria;
- assenza di versioni ed eccezioni;
- assenza di ancoraggio CAN-PLAN.

Questa specifica costituisce il contratto per l'implementazione dell'orario in Docente OS 2026/2027.
