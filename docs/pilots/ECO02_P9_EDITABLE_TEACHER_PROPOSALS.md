# ECO-02/P9 — Proposte didattiche modificabili dal docente

Status: **IMPLEMENTATION CANDIDATE / HUMAN REVIEW REQUIRED**

Date: 2026-09-21

## Evidenza umana

Nel collaudo mobile della superficie **Prima della lezione** il docente ha rilevato tre criticità:

1. duplicazione percettiva della stessa domanda tra **Prova uno strumento** e **Nella sequenza**;
2. domanda guida troppo generica;
3. controllo insufficiente perché l'elemento poteva essere rimosso ma non modificato direttamente.

## Decisione

DOCENTE OS adotta un unico ciclo teacher-first per le aggiunte didattiche:

`strumento disponibile → proposta da controllare → eventuale modifica → conferma docente → sequenza`.

La stessa proposta non deve comparire contemporaneamente come strumento disponibile e come elemento della sequenza.

## Regola di modifica

- una proposta `PROPOSED` può essere modificata dal docente e passa a `MODIFIED`;
- una proposta `MODIFIED` resta fuori dalla sequenza fino a **Usa in questa lezione**;
- un elemento già `ACCEPTED` può essere modificato;
- modificare un elemento accettato annulla l'efficacia della precedente accettazione e lo riporta a `MODIFIED`;
- dopo la modifica serve quindi una nuova conferma esplicita.

La provenienza originale resta immutabile. Non viene creato un secondo oggetto né viene riscritta la proiezione canonica.

## Qualità della domanda guida

La proposta locale non usa più la formula generica “Che cosa sai già…”.

La domanda deve stimolare osservazione, relazioni, ipotesi ed evidenze, restando ancorata al titolo e all'obiettivo canonici. Il docente può comunque riscriverla liberamente prima dell'uso.

## Confini di governance

- Arena resta autorità curricolare;
- la sequenza canonica non viene riscritta;
- Docente OS gestisce la proposta e la decisione professionale;
- nessun contenuto proposto entra in classe senza azione esplicita del docente;
- nessuna modifica riusa silenziosamente un'approvazione precedente;
- nessuna attivazione di `DOS-A1`;
- nessun dato personale degli alunni.

## Criteri di accettazione

- nessun doppione percettivo tra strumento/proposta/sequenza;
- **Modifica** disponibile sulle proposte di sequenza;
- **Modifica** disponibile anche sulle aggiunte già accettate;
- dopo una modifica di un elemento accettato, nuova conferma obbligatoria;
- testo proposto più significativo e non banalmente mnemonico;
- funzionamento leggibile e utilizzabile su mobile;
- test automatici sul lifecycle e sul contratto UI.


## Design classification

`COMPATIBLE` — la soluzione riusa card, `details`, form, pulsanti e token già presenti in **Prima della lezione**. Non introduce una nuova primitiva visiva, non cambia la navigazione primaria e non sostituisce il sistema di design esistente. La modifica rende esplicito nel pattern corrente il lifecycle proposta → modifica → conferma.
