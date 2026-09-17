# Docente OS — Consolidation Architecture Decisions

Stato: **CANONICAL CANDIDATE / CONSOLIDATION #508**  
Data: 2026-09-17

## 1. Scopo

Questo documento conserva le decisioni architetturali utili emerse dalle linee storiche Curriculum-to-Practice (C2P), lesson preparation, UX-0 e dall'analisi Learning Object, senza promuovere automaticamente le rispettive PR sperimentali.

Il principio di governo è: **preservare il valore, eliminare i doppi modelli, integrare solo ciò che ha un owner e un percorso di esecuzione chiari**.

## 2. Catena canonica del ciclo didattico

La catena di riferimento di Docente OS è:

`Curricolo istituzionale → contesto curricolare accettato → Piano annuale → UDA → oggetti didattici/LO → preparazione lezione → lezione/TeachingSession → evidenze → feedback/riflessione → riprogettazione`

Il Copilota orchestra questa catena ma non diventa un archivio o una fonte di verità alternativa.

## 3. Autorità e ownership

1. **CurManLight/Arena** conserva l'autorità sul curricolo istituzionale e sui relativi segnali di approvazione/versione.
2. **Docente OS** conserva il lavoro professionale del docente: Piano annuale, UDA, preparazione, TeachingSession, evidenze, riflessione e materiali.
3. Un binding curricolare in Docente OS è un riferimento/provenienza, non una copia modificabile dell'autorità istituzionale.
4. Nessun aggiornamento curricolare modifica automaticamente Piano, UDA o storico eseguito.
5. Lo storico già svolto è sempre preservato; le nuove versioni possono richiedere revalidation/rebinding solo per il futuro.

## 4. Decisioni C2P preservate

Dalle PR storiche #298–#307 vengono preservati i seguenti concetti, non le implementazioni stacked in quanto tali:

### C1 — Curriculum intake
Riutilizzare il receiver/handoff esistente e la decisione docente. Nessun secondo importatore, store o database condiviso.

### C2 — Piano annuale ↔ curricolo
Il collegamento deve essere un **thin binding** tra blocchi canonici del Piano e identificatori curricolari stabili. L'esecuzione per sezione resta separata dal binding comune.

### C3 — UDA ↔ curricolo/Piano
La UDA canonica resta unica; non viene clonata per sezione. Gli adattamenti di classe/sezione sono delta professionali. Il binding deve riferire il contesto curricolare e i blocchi del Piano senza creare un secondo archivio UDA.

### C4 — esecuzione, evidenze e feedback
`TeachingSession` resta il root dell'esecuzione reale. Evidenze e feedback devono restare collegati alla lezione e agli obiettivi senza produrre voti automatici. L'eventuale giudizio valutativo richiede sempre decisione professionale del docente.

### C5 — osservazione professionale
Verso Arena possono uscire soltanto osservazioni professionali aggregate e non personali. Evidenze grezze, identificativi alunno, note private, voti e record individuali non devono essere trasportati automaticamente.

### C6 — transizione di versione
Le nuove versioni curricolari possono classificare l'impatto come compatibile, da rivalidare, da ricollegare o da riesaminare manualmente. Sono vietati silent rebind, riscrittura storica e mutazione automatica del lavoro docente.

## 5. Learning Object / Oggetto didattico

Il Learning Object non è un nuovo sottosistema né un file. È un **manifest didattico riusabile** che descrive una unità pedagogica sufficientemente autonoma da poter essere composta in UDA e lezioni.

Un LO può riferire:
- obiettivi e conoscenze;
- prerequisiti;
- attività studente e azione docente;
- durata e modalità;
- evidenze attese;
- materiali e asset;
- collegamenti al libro di testo/guida docente;
- supporti di accessibilità e inclusione;
- valutazione formativa;
- provenienza/licenza;
- dipendenze e alternative.

**H5P, video, presentazioni, schede, simulazioni o esercizi del libro sono payload/asset del LO, non il LO stesso.**

### Stato
`DISCOVERED / NOT YET IMPLEMENTED`.

Il primo esperimento autorizzabile resta la decomposizione interna di una sola UDA canonica (`CAN-UDA-1-01`) senza nuova interfaccia e senza nuova persistenza finché il Capability Register non chiarisce l'owner dei dati.

## 6. Rapporto tra C2P e Learning Object

Il modello C2P non viene scartato: viene assorbito nella catena didattica corrente.

- C2 resta il binding **Curricolo → Piano**.
- C3 viene raffinato come **Curricolo/Piano → UDA**, con i LO come livello interno di composizione didattica della UDA, non come nuova autorità.
- C4 resta **Lezione → Evidenze/Feedback**.
- C5 resta **Riflessione professionale → osservazione aggregata**.
- C6 resta **nuova versione curricolare → impatto futuro + storico preservato**.

Quindi i LO non sostituiscono C2P e C2P non diventa una roadmap parallela: entrambi confluiscono nello stesso ciclo operativo.

## 7. Regole anti-duplicazione

Non introdurre:
- un secondo repository di UDA;
- un secondo archivio curricolare;
- un secondo modello di materiali;
- un secondo frontdoor del Copilota;
- un secondo registro della lezione;
- un secondo motore di revalidation;
- un nuovo store per i LO finché ownership e schema non sono validati;
- nuovi automatismi che promuovano decisioni professionali o istituzionali.

## 8. Disposizione delle PR C2P storiche

Le PR #298–#307 sono **design/prototype evidence**, non backlog esecutivo corrente. Dopo l'integrazione di questo documento possono essere archiviate come `SUPERSEDED_BY_CONSOLIDATION_508`, preservando i link come provenienza storica.

Le future implementazioni devono nascere da issue nuove e piccole, sulla baseline `develop` corrente, con un solo owner di dato e gate exact-head attuali. Non si riattiva lo stack storico mediante merge a catena.

## 9. Gate prima di qualsiasi implementazione LO/C2P

1. Capability Register completato per Curricolo, Piano, UDA, Materiali, Knowledge, TeachingSession, Evidenze e Copilota.
2. Owner e source of truth espliciti per ogni dato.
3. Nessuna duplicazione di persistenza o retrieval.
4. Validazione umana sulle decisioni didattiche significative.
5. Pilota `CAN-UDA-1-01` capace di ricostruire l'UDA e la preparazione della lezione senza perdita semantica.
6. Solo dopo il pilota: valutare persistenza/versioning dei LO e compositore UDA.

## 10. Decisione

**CONSOLIDA. NON RIATTIVARE LO STACK C2P COME ROADMAP PARALLELA.**

Il valore architetturale viene preservato in questo documento e nel Capability Register; le implementazioni future saranno riaperte solo come slice coerenti con il Masterplan unico.