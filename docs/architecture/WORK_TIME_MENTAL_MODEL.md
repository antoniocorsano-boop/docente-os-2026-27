# DOCENTE OS — Modello mentale lavoro/tempo

Data: 2026-08-22  
Stato: CANONICAL / UX_BASELINE

## Scopo

Separare in modo inequivocabile gli oggetti che oggi possono apparire sovrapposti nell'interfaccia: attività operative, piano annuale, orario e calendario.

La regola di prodotto è:

```text
Conoscenza = da cosa parto
Progetta = cosa preparo didatticamente
Piano annuale = cosa devo insegnare e quanto ho svolto
Orario = quando insegno ricorrentemente
Calendario = quando qualcosa accade davvero in una data
Oggi = cosa richiede la mia attenzione adesso
```

Questi oggetti possono collegarsi ma non sono sinonimi e non devono duplicarsi.

## 1. Conoscenza — fonte

Domanda a cui risponde: **Da cosa parto?**

Contiene documenti, fonti, versioni organizzate, provenienza e proposte estratte.

Non è un registro operativo. Un documento può originare:

- una attività;
- una progettazione;
- un riferimento per il piano annuale;
- in futuro una data/evento da verificare.

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

`/planner` resta il percorso tecnico corrente; il linguaggio utente privilegia **attività**, **da fare**, **Oggi**. Il termine “Planner” non deve diventare un'etichetta dominante nell'esperienza utente.

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

## 4. Orario — pattern ricorrente

Domanda a cui risponde: **Quando insegno normalmente ogni settimana?**

Oggetti canonici:

- `teaching_assignments`;
- `timetable_versions`;
- `timetable_slots`.

L'Orario descrive il pattern settimanale ricorrente e la capacità temporale. Non dice da solo se una specifica lezione del 17 novembre avverrà davvero.

## 5. Calendario — occorrenze reali

Domanda a cui risponde: **Quando accade davvero qualcosa?**

Il Calendario è date-centric e dovrà comporre:

- calendario scolastico;
- versione orario attiva;
- slot ricorrenti;
- eccezioni/sospensioni;
- eventi d'istituto;
- scadenze/eventi esplicitamente promossi.

Un evento ha una data/ora reale. Non ogni attività è un evento e non ogni lezione ricorrente è automaticamente una occorrenza valida.

Il Calendario entra operativamente con T3; prima di T3 non deve essere simulato con viste del Planner.

## 6. Oggi — cockpit, non archivio

“Oggi” è una vista aggregata, non un nuovo modello di dominio.

Baseline corrente:

- mostra le attività operative del Planner.

Target progressivo:

- attività per oggi;
- lezioni/occorrenze reali del giorno da Orario + Calendario;
- eventi/scadenze del giorno;
- eventuali scostamenti dal Piano annuale.

Ogni elemento deve conservare la propria natura e provenienza.

## 7. Regole di trasformazione

### Conoscenza → Attività

Consentito quando il contenuto genera qualcosa da fare.

UI: **Crea attività** / **Aggiungi alle attività**.

Effetto: crea un `PlannerTask` e conserva il riferimento alla fonte.

Non modifica Piano annuale e non crea automaticamente un evento calendario.

### Conoscenza → Piano annuale

Non avviene tramite una semplice task. Richiede un caso d'uso didattico/canonico esplicito e conserva versione/provenienza.

### Piano annuale → Calendario

Non è una copia diretta. T3/T4 materializzano le occorrenze usando orario, calendario scolastico ed eccezioni.

### Attività → Calendario

Possibile solo quando l'utente decide che una attività deve diventare un impegno/evento temporale specifico. Non automatico nella baseline.

## 8. Linguaggio UI canonico

Usare:

- **Oggi** — “Attività e priorità operative”;
- **Attività** — singola cosa da fare;
- **Piano annuale** — “Sequenza didattica e avanzamento per classe”;
- **Orario** — “Schema settimanale ricorrente”;
- **Calendario** — “Date, eventi e occorrenze reali”;
- **Piano di riferimento** — documento CAN-PLAN conservato in Conoscenza.

Evitare:

- “Planner” come nome primario lato utente;
- “pianifica” quando non è chiaro se significhi task, lezione o evento;
- chiamare “calendario” una lista di task ordinate per data;
- chiamare “piano annuale” il solo documento sorgente senza distinguere il registro di attuazione.

## 9. Gate UX

Una superficie è conforme quando l'utente può capire senza documentazione esterna:

1. che tipo di oggetto sta guardando;
2. quale domanda risolve;
3. cosa cambia se compie una azione;
4. cosa **non** cambia;
5. da quale fonte proviene l'oggetto.

## 10. Sequenza di rollout

1. riallineare registro di navigazione e command palette;
2. migrare `/planner` alla AppShell e rendere esplicito “Attività operative”;
3. migrare `/piano-annuale` alla AppShell e distinguere registro di attuazione da piano di riferimento;
4. correggere CTA Conoscenza: “Crea attività”, non “Portalo nel Planner”;
5. T3 introdurrà il Calendario come oggetto separato, non come estensione cosmetica del Planner.
