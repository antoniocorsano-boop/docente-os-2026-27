# DOCENTE OS — Human Task Content Engine

Status: IMPLEMENTATION CONTRACT / B01-B02
Date: 2026-08-22

## Scopo

Il motore Human Task Content trasforma contenuti canonici (Piano annuale, UDA, CAN-PACK) in una vista operativa tracciabile senza trasformare i documenti in una seconda fonte autonoma.

La generalizzazione viene accettata solo se funziona su almeno due lezioni realmente diverse per struttura sorgente.

## Contratto minimo della proiezione

Ogni lezione operativa conserva:

- grado, blocco, UDA, pacchetto e periodo canonici;
- titolo e finalità operativa;
- durata complessiva documentata;
- materiali da predisporre;
- sequenza di attività;
- risorse collegate alle attività;
- evidenza attesa;
- indicatori di osservazione;
- criterio/nota di valutazione;
- continuazione;
- fonti canoniche.

## Regole di fedeltà alla fonte

1. Un tempo di attività compare solo se è presente nella fonte.
2. Se la fonte temporizza tutte le attività, il motore può calcolare minuti descritti e residui.
3. Se la fonte non temporizza le attività, il motore mostra la durata complessiva ma non distribuisce artificialmente i minuti.
4. Se solo alcune attività hanno un tempo, il motore non deduce la durata delle altre.
5. Una risorsa viene mostrata dentro un passaggio solo se la proiezione dichiara esplicitamente il collegamento.
6. I codici canonici restano nel modello e nei dettagli tecnici, non nel primo livello dell’esperienza.
7. Il contenuto operativo non può introdurre esiti, valutazioni, materiali o procedure non supportati dalle fonti.

## Timing contract

Lo stato dei tempi può essere:

- `FULL`: tutte le attività temporizzate e somma uguale alla durata;
- `PARTIAL`: tutte le attività temporizzate ma la somma è inferiore alla durata;
- `MIXED`: solo alcune attività hanno un tempo; nessun residuo viene dedotto;
- `UNSPECIFIED`: nessuna attività ha un tempo; la durata complessiva resta informativa.

B01 è `PARTIAL`: 110 minuti descritti su 120.
B02 è `UNSPECIFIED`: 120 minuti complessivi, nessun tempo assegnato alle cinque attività.

## Resource binding

Il runtime non deve conoscere identificatori di passaggi specifici come `S04` o `S08`.

Ogni `ActivityStep` può dichiarare `resourceIds`; il renderer risolve le risorse corrispondenti e le mostra nel punto corretto della sequenza. In questo modo B01, B02 e lezioni successive usano lo stesso motore senza condizioni dedicate alla singola lezione.

## Acceptance B02

Per **Laboratorio, strumenti e sicurezza** il sistema deve:

- mostrare la durata di 2 ore senza inventare minuti per attività;
- proporre gli strumenti realmente disponibili a scuola, esempi di uso corretto/non corretto, cartoncini/post-it e Scheda alunno B;
- mostrare le cinque attività canoniche nell’ordine della fonte;
- rendere la Scheda alunno B disponibile nel passaggio di compilazione senza ricerca manuale;
- richiamare come evidenza `scheda strumenti + Patto del laboratorio`;
- osservare soprattutto uso corretto degli strumenti, procedure/sicurezza e organizzazione del lavoro;
- mantenere la valutazione diagnostico-formativa e non trasformare automaticamente la griglia in voto;
- continuare verso la prima lezione dell’UDA successiva senza esporre codici tecnici nel primo livello.
