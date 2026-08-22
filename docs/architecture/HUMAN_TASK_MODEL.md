# DOCENTE OS — Human Task Model

Status: CANONICAL / RUNTIME ADOPTION IN PROGRESS

## Product principle

DOCENTE OS organizza l'esperienza a partire dal compito umano, non dalla quantità di funzioni disponibili.

> Più il sistema conosce l'intento dell'utente, meno interfaccia deve mostrare.

Il sistema può restringere il contesto automaticamente solo se rende sempre visibile **perché** lo ha fatto e mantiene una via esplicita verso la vista completa.

## Research baseline obbligatoria per i contenuti didattici

La ricerca salvata in `docs/research/HUMAN_TASK_CONTENT_MODEL_RESEARCH.md` è il riferimento obbligatorio per la rappresentazione runtime di Piano annuale, UDA, CAN-PACK, materiali, Classe, Progetta e Conoscenza quando il docente opera in un contesto didattico specifico.

Principio derivato:

> Il documento canonico è una forma di conservazione, validazione e rendicontazione. Non è automaticamente una buona forma di interazione.

Di conseguenza, Piano annuale, UDA e CAN-PACK devono essere preservati come fonti canoniche ma presentati nel lavoro quotidiano attraverso oggetti e viste semantiche coerenti con il compito: orientare, preparare, condurre, osservare, registrare e approfondire.

Una futura slice che reintroduce come interazione primaria l'apertura di un documento lungo deve essere considerata non conforme finché non dimostra perché il documento, e non una vista operativa derivata, è necessario al compito corrente.

## Intents

- **ACT_NOW — Agisci adesso:** attività urgente, scadenza o elemento che richiede attenzione immediata.
- **PREPARE — Prepara:** predisporre una fase didattica, UDA, materiale o adattamento.
- **TEACH — Usa in classe:** lavorare durante una lezione o con una sezione specifica.
- **RECORD — Registra:** documentare ciò che è stato realmente svolto o completato.
- **REVIEW — Rivedi:** controllare avanzamento, copertura, coerenza e scostamenti.
- **EXPLORE — Esplora:** consultare liberamente contenuti e strutture quando non esiste un compito specifico.

## Context specificity

- **NONE:** nessun oggetto corrente; esperienza esplorativa.
- **CONTEXTUAL:** grado, sezione, giornata o area di lavoro noti; esperienza guidata.
- **SPECIFIC:** oggetto e prossima azione noti; esperienza focalizzata.

## Experience modes

### EXPLORE

Usata quando l'utente apre volontariamente una superficie ampia. Sono leciti panoramiche, filtri, cataloghi e confronti.

### GUIDED

Usata quando il sistema conosce parte del contesto. Una azione primaria, poche azioni di supporto, dettagli secondari compressi.

### FOCUSED

Usata quando il sistema conosce compito, oggetto e contesto. Regole vincolanti:

1. una sola azione primaria;
2. massimo due azioni di supporto visibili allo stesso livello;
3. nessuna panoramica generale sopra il compito;
4. dettagli tecnici e configurazione dietro divulgazione progressiva;
5. stato corrente e contesto sempre leggibili;
6. la via di uscita non deve dominare l'azione principale;
7. il sistema non inventa stati, priorità o preparazioni non registrati.

## Task continuity

Quando un oggetto viene aperto dentro un compito specifico, **eredita il compito**. Il cambio di dominio non deve azzerare intento e contesto.

Regole:

1. il collegamento trasporta un contesto operativo minimo e validato;
2. la destinazione apre la propria modalità FOCUSED, non la scheda generale;
3. il ritorno al punto di origine è esplicito e prevedibile;
4. l'utente può sempre scegliere di uscire dal compito e aprire la vista completa;
5. il contesto operativo non modifica la proprietà canonica dei dati;
6. i percorsi di ritorno accettati sono soltanto interni a DOCENTE OS;
7. la modalità focalizzata evita letture o controlli secondari che non servono al compito corrente.

Esempio canonico:

**Classe → Prepara B01 → Apri UDA → usa/consulta UDA → Torna alla preparazione**

L'apertura dell'UDA non deve trasformarsi implicitamente in **Conoscenza → gestione asset → metadati → versioni**.

## Canonical human sequence

Le superfici operative devono poter rispondere, nell'ordine, a queste domande:

1. **Dove sono?** — classe, giornata, fase o oggetto corrente.
2. **Che cosa sto facendo?** — intento umano.
3. **A che punto sono?** — stato registrato o derivato in modo deterministico.
4. **Che cosa faccio adesso?** — unica azione primaria.
5. **Che cosa viene dopo?** — massimo due azioni di supporto.
6. **Dove trovo il resto?** — vista completa o dettagli su richiesta.

## Surface adoption

- **Home:** orchestratore; propone il prossimo passo più plausibile e rende gli altri ingressi secondari.
- **Oggi:** ACT_NOW; mostra prima il prossimo compito operativo, poi il resto della giornata.
- **Orario:** TEACH/REVIEW; evidenzia la lezione corrente o prossima, mentre copertura e configurazione restano secondarie.
- **Classe:** TEACH/PREPARE; proietta il prossimo blocco didattico e collega alle risorse pertinenti.
- **Piano annuale:** RECORD/REVIEW; con una sezione selezionata mostra prima il prossimo blocco e le azioni di registrazione; la tabella B01–B33 è approfondimento.
- **Progetta:** PREPARE; con blocco/UDA/pacchetto validi usa modalità FOCUSED; senza contesto resta esplorativa.
- **Conoscenza:** EXPLORE quando aperta genericamente; FOCUSED quando una risorsa è aperta da PREPARE/TEACH, conservando il ritorno al compito.
- **Impostazioni:** configurazione; non compete con le azioni operative quotidiane.

## Anti-patterns vietati

- dashboard che mostrano tutto contemporaneamente;
- pulsanti di uscita più prominenti dell'azione corrente;
- liste lunghe sotto un compito già noto;
- terminologia tecnica come primo livello del flusso umano;
- duplicazione del nucleo comune per creare artificialmente contesto di sezione;
- metriche e configurazione mostrate come se fossero azioni operative;
- più azioni primarie concorrenti nella stessa vista specifica;
- perdita del contesto quando l'utente attraversa domini interni del prodotto;
- documento canonico lungo usato come interfaccia primaria quando il compito richiede solo una porzione semantica del contenuto.

## Acceptance

Una superficie è matura quando un docente può rispondere entro pochi secondi a:

**Dove sono? Cosa devo fare ora? Perché proprio questo? Come torno alla vista completa?**

Un attraversamento tra superfici è maturo quando l'utente può aggiungere:

**Perché ho aperto questo oggetto? Come torno esattamente al lavoro che stavo facendo?**

Per i contenuti didattici, l'acceptance deve inoltre seguire i test e i budget definiti in `docs/research/HUMAN_TASK_CONTENT_MODEL_RESEARCH.md`, a partire dal verticale pilota:

**1ª A → UDA 1-00 → B01 → CAN-PACK-1A → orienta → prepara → conduci → osserva → registra → continua.**
