# DOCENTE OS — Modello mentale lavoro/tempo

Data: 2026-08-22  
Stato: CANONICAL / UX_BASELINE

## Scopo

Separare in modo inequivocabile gli oggetti che possono apparire vicini nell'interfaccia ma hanno responsabilità diverse: attività operative, piano annuale, orario e calendario.

La regola di prodotto è:

```text
Conoscenza = da cosa parto
Progetta = cosa preparo didatticamente
Piano annuale = cosa devo insegnare e quanto ho svolto
Orario = come è organizzata ricorrentemente la mia settimana
Calendario = quali date, eventi e vincoli reali esistono
Oggi = cosa richiede la mia attenzione adesso
```

Questi oggetti possono essere letti insieme da viste applicative, ma **non sono sinonimi e non devono dipendere strutturalmente l'uno dall'altro**.

## Principio architetturale fondamentale

**Orario e Calendario sono domini indipendenti.**

L'Orario deve poter essere configurato, versionato, stampato e usato anche se il Calendario non è ancora disponibile.

Il Calendario deve poter contenere date, sospensioni, eventi d'istituto e impegni reali anche senza conoscere l'Orario.

Quando DOCENTE OS deve mostrare una lezione reale del 17 novembre, non modifica uno dei due domini: usa un livello applicativo di composizione:

```text
Orario autonomo
      +
Calendario autonomo
      +
Eccezioni / regole applicative
      ↓
Proiezione temporale / Occorrenze
      ↓
Oggi, registro di attuazione, viste giornaliere
```

La **Proiezione temporale** dipende dai read model di Orario e Calendario; Orario e Calendario non dipendono dalla Proiezione e non dipendono reciprocamente.

## 1. Conoscenza — fonte

Domanda a cui risponde: **Da cosa parto?**

Contiene documenti, fonti, versioni organizzate, provenienza e proposte estratte.

Non è un registro operativo. Un documento può originare:

- una attività;
- una progettazione;
- un riferimento per il piano annuale;
- una proposta di data/evento da verificare.

La trasformazione deve essere esplicita: la fonte non cambia natura soltanto perché viene usata altrove.

## 2. Oggi / Attività — azioni da fare

Domanda a cui risponde: **Cosa devo fare?**

Oggetto canonico: `PlannerTask`.

Esempi:

- preparare materiale per 2A;
- controllare una circolare;
- correggere una prova;
- predisporre una relazione;
- rivedere un documento.

Una attività può avere una data di pianificazione o una scadenza, ma resta una **azione**, non un evento di calendario.

`/planner` resta il percorso tecnico corrente; il linguaggio utente privilegia **attività**, **da fare**, **Oggi**.

## 3. Piano annuale — sequenza didattica

Domanda a cui risponde: **Cosa devo insegnare e a che punto sono?**

Oggetti canonici:

- CAN-PLAN;
- B01–B33;
- registro di attuazione per sezione.

Il Piano annuale descrive la sequenza didattica, il monte ore e l'avanzamento effettivo per classe/sezione.

Non è:

- una lista di cose da fare;
- un calendario;
- l'orario settimanale;
- il documento sorgente che lo ha generato.

Il documento CAN-PLAN in Conoscenza è **fonte/riferimento**; la pagina `/piano-annuale` è il **registro operativo di attuazione**.

## 4. Orario — struttura settimanale autonoma

Domanda a cui risponde: **Come è organizzata normalmente la mia settimana?**

Oggetti canonici:

- `teaching_assignments`;
- `timetable_versions`;
- `timetable_slots`.

L'Orario descrive:

- giorni e fasce orarie;
- lezioni ricorrenti;
- disposizioni, ricevimento e altre attività ricorrenti;
- versioni e periodo di validità dell'assetto settimanale.

### Invariante

L'Orario **non dipende dal Calendario**.

Deve funzionare autonomamente per:

- configurazione;
- controllo del monte ore settimanale;
- visualizzazione Settimana/Giorno;
- stampa;
- versionamento;
- confronto tra assegnazioni e capacità settimanale.

Una riga “martedì 10:00 — Tecnologia 2A” è valida come pattern ricorrente anche prima di sapere se uno specifico martedì sarà giorno di lezione.

## 5. Calendario — date ed eventi autonomi

Domanda a cui risponde: **Che cosa accade in date reali?**

Il Calendario gestisce autonomamente:

- calendario scolastico;
- festività e sospensioni;
- eventi d'istituto;
- impegni e scadenze promossi esplicitamente;
- eventuali variazioni puntuali riferite a una data.

### Invariante

Il Calendario **non è una vista dell'Orario** e non è una lista di attività con data.

Può esistere anche in assenza di un orario configurato.

## 6. Proiezione temporale / Occorrenze — livello di composizione

Domanda a cui risponde: **Cosa risulta effettivamente previsto in questa data?**

È un read model / application service, non un nuovo registro autorevole.

Può combinare:

```text
versione Orario valida
+ slot ricorrenti
+ date/giorni scolastici dal Calendario
+ sospensioni ed eccezioni
= occorrenze reali proiettate
```

Esempi di output:

- lezione prevista il 17 novembre alle 10:00;
- lezione non materializzata perché la scuola è sospesa;
- lezione spostata da una eccezione puntuale;
- evento d'istituto presente nello stesso giorno.

La composizione non riscrive né Orario né Calendario.

## 7. Oggi — cockpit, non archivio

“Oggi” è una vista aggregata, non un nuovo modello di dominio.

Baseline corrente:

- attività operative.

Target progressivo:

- attività per oggi;
- lezioni del giorno ottenute dalla Proiezione temporale;
- eventi/scadenze reali del Calendario;
- eventuali segnali di avanzamento o scostamento del Piano annuale.

Ogni elemento deve conservare la propria natura e provenienza.

## 8. Regole di trasformazione

### Conoscenza → Attività

UI: **Crea attività** / **Aggiungi alle attività**.

Effetto: crea un `PlannerTask` e conserva il riferimento alla fonte.

Non modifica Piano annuale, Orario o Calendario.

### Conoscenza → Piano annuale

Richiede un caso d'uso didattico/canonico esplicito e conserva versione/provenienza.

### Attività → Calendario

Possibile solo quando l'utente decide che una attività deve diventare un impegno/evento temporale specifico. Non automatico.

### Orario + Calendario → Occorrenze

È una **lettura composta**, non una trasformazione distruttiva.

L'Orario non viene “calendariato” internamente e il Calendario non incorpora gli slot come propri record autorevoli.

### Piano annuale + Occorrenze → Attuazione

La sequenza B01–B33 può usare la capacità temporale proiettata per collegare il lavoro didattico alle date reali, senza modificare il CAN-PLAN e senza rendere il Piano annuale dipendente dal Calendario.

## 9. Linguaggio UI canonico

Usare:

- **Oggi** — “Attività e priorità operative”;
- **Attività** — singola cosa da fare;
- **Piano annuale** — “Sequenza didattica e avanzamento per classe”;
- **Orario** — “Schema settimanale ricorrente”;
- **Calendario** — “Date, eventi e giorni reali”;
- **Occorrenze** — termine tecnico, normalmente nascosto all'utente;
- **Piano di riferimento** — documento CAN-PLAN conservato in Conoscenza.

Evitare:

- “Planner” come nome primario lato utente;
- “pianifica” quando non è chiaro se significhi attività, lezione o evento;
- chiamare “calendario” una lista di attività ordinate per data;
- descrivere l'Orario come dipendente dal Calendario;
- chiamare “Piano annuale” il solo documento sorgente senza distinguere il registro di attuazione.

## 10. Gate UX

Una superficie è conforme quando l'utente può capire senza documentazione esterna:

1. che tipo di oggetto sta guardando;
2. quale domanda risolve;
3. cosa cambia se compie una azione;
4. cosa **non** cambia;
5. da quale fonte proviene l'oggetto.

## 11. Sequenza di rollout

1. consolidare navigazione e gerarchia delle superfici;
2. mantenere Orario pienamente autonomo e completarne il lifecycle/versioning;
3. introdurre Calendario come dominio separato;
4. aggiungere il servizio di Proiezione temporale che compone i due read model;
5. usare la Proiezione in Oggi e, successivamente, nell'attuazione del Piano annuale;
6. mantenere X4 in HOLD finché i confini tra oggetti non sono chiari nell'esperienza reale.
