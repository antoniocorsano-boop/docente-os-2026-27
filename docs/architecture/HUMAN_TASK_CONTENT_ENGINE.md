# DOCENTE OS — Human Task Content Engine

Status: IMPLEMENTATION CONTRACT / B01-B06 + PIPELINE P1
Date: 2026-08-22

## Scopo

Il motore Human Task Content trasforma contenuti canonici (Piano annuale, UDA, CAN-PACK) in una vista operativa tracciabile senza trasformare i documenti in una seconda fonte autonoma.

Il motore deve funzionare anche quando le fonti hanno granularità diverse. Non deve ottenere uniformità inventando tempi, passaggi, materiali, verifiche o corrispondenze inesistenti.

La generazione scalabile delle future proiezioni è disciplinata anche da `docs/architecture/HUMAN_TASK_CONTENT_PIPELINE.md`. La pipeline prepara candidati ed evidenze; il runtime usa soltanto proiezioni approvate.

## Contratto minimo della proiezione

Ogni lezione operativa conserva:

- grado, blocco, UDA, pacchetto e periodo canonici;
- titolo e finalità operativa;
- durata complessiva documentata;
- materiali da predisporre;
- sequenza di attività;
- risorse collegate alle attività e alle superfici pertinenti;
- evidenza attesa;
- indicatori di osservazione;
- criterio/nota di valutazione;
- continuazione;
- livello di allineamento delle fonti;
- fonti canoniche.

## Regole di fedeltà alla fonte

1. Un tempo di attività compare solo se è presente nella fonte.
2. Se la fonte temporizza tutte le attività, il motore può calcolare minuti descritti e residui.
3. Se la fonte non temporizza le attività, il motore mostra la durata complessiva ma non distribuisce artificialmente i minuti.
4. Se solo alcune attività hanno un tempo, il motore non deduce la durata delle altre.
5. Una risorsa viene mostrata dentro un passaggio solo se la proiezione dichiara esplicitamente il collegamento.
6. Una risorsa può dichiarare una superficie `PREPARE` o `OBSERVE` quando serve prima della lezione o durante la chiusura, senza essere sempre visibile.
7. I codici canonici restano nel modello e nei dettagli tecnici, non nel primo livello dell’esperienza.
8. Il contenuto operativo non può introdurre esiti, valutazioni, materiali, procedure o quesiti non supportati dalle fonti.
9. Quando più fonti devono essere raccordate, la proiezione deve dichiarare esplicitamente che è `COMPOSED` e spiegare il raccordo.
10. Una proiezione `COMPOSED` priva di nota di allineamento fallisce chiusa.
11. Un candidato prodotto dalla pipeline non può essere promosso direttamente: `HUMAN_REVIEW_REQUIRED` è obbligatorio.

## Timing contract

Lo stato dei tempi può essere:

- `FULL`: tutte le attività temporizzate e somma uguale alla durata;
- `PARTIAL`: tutte le attività temporizzate ma la somma è inferiore alla durata;
- `MIXED`: solo alcune attività hanno un tempo; nessun residuo viene dedotto;
- `UNSPECIFIED`: nessuna attività ha un tempo; la durata complessiva resta informativa.

Esempi correnti:

- B01 è `PARTIAL`: 110 minuti descritti su 120;
- B02–B06 sono `UNSPECIFIED`: durata complessiva nota, nessun minuto inventato per i singoli passaggi.

## Source alignment contract

Il livello di allineamento può essere:

### `DIRECT`

Il Piano annuale e una guida operativa coincidono sostanzialmente per finalità e granularità del blocco.

Esempi correnti:

- B01 — Che cos’è Tecnologia?;
- B02 — Laboratorio, strumenti e sicurezza;
- B05 — Pensare per sistemi.

### `COMPOSED`

Il blocco operativo deve essere costruito raccordando più sezioni delle fonti perché non esiste una corrispondenza 1:1.

Regole:

- il Piano annuale resta autorità su collocazione e blocco;
- UDA e pacchetto devono sostenere semanticamente ogni elemento mostrato;
- la composizione non può produrre falsa precisione;
- `sourceAlignment.note` è obbligatoria;
- la nota resta dietro il supporto contestuale **Serve una mano?**, non nel primo viewport.

Esempi correnti:

- B03 — Dai bisogni alle soluzioni;
- B04 — Risorse e vincoli;
- B06 — Compito significativo e verifica.

La motivazione dettagliata è conservata in `docs/research/UDA_1_01_HUMAN_TASK_SOURCE_ALIGNMENT.md`.

## Resource binding

Il runtime non deve conoscere identificatori di passaggi specifici come `S04` o `S08`.

Ogni `ActivityStep` può dichiarare `resourceIds`; il renderer risolve le risorse corrispondenti e le mostra nel punto corretto della sequenza.

Ogni risorsa può inoltre dichiarare superfici di uso:

- `PREPARE`: materiale da consultare o predisporre prima della lezione;
- `OBSERVE`: criterio/rubrica utile nella fase di osservazione e chiusura.

Questo consente allo stesso renderer di gestire:

- schede alunno;
- exit ticket;
- consegne di compito;
- rubriche;
- struttura di una verifica;

senza condizioni dedicate alla singola lezione.

## Regola sulle verifiche incomplete

Quando la fonte definisce **il formato** di una verifica ma non i quesiti specifici, DOCENTE OS può mostrare soltanto la struttura documentata.

Non deve generare automaticamente quesiti presentandoli come parte canonica della UDA.

B06 applica questa regola: la fonte prevede risposte brevi, classificazioni, completamento di uno schema e breve situazione-problema, ma non contiene le domande effettive.

## Pipeline e prestazioni

La pipeline semantica non viene eseguita nel percorso quotidiano ad alta frequenza.

`Orario → Classe → Lezione` deve continuare a leggere una proiezione già approvata. UDA e CAN-PACK vengono interrogati dalla KB durante preparazione, generazione o revisione delle proiezioni, non ad ogni apertura della lezione.

Questo evita di reintrodurre latenza dopo il lavoro P0 sulle prestazioni.

## Acceptance B01–B06

Il sistema deve:

- mantenere B01 senza regressioni e rispettare i 110/120 minuti;
- mostrare B02 senza inventare tempi;
- rendere B03 e B04 comprensibili pur dichiarando internamente il raccordo tra fonti;
- rendere Scheda C disponibile esattamente quando serve in B04;
- rendere Scheda D disponibile in B05 senza logica hard-coded nel renderer;
- mostrare in B06 la consegna del compito nel momento opportuno;
- mostrare la struttura della verifica senza inventare quesiti;
- mostrare i criteri di osservazione solo nella fase `Osserva`;
- continuare dopo B06 verso il Piano annuale reale, senza fingere che B07 sia già modellato;
- non reintrodurre codici tecnici nel primo livello dell’esperienza.
