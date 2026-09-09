# DOCENTE OS — Decisione di priorità UX

Data: 2026-09-09  
Stato: PROPOSTA VINCOLANTE PER IL PROSSIMO SLICE

## Decisione

Sospendere l'espansione orizzontale delle superfici e concentrare il prossimo sviluppo su **accesso immediato al contesto operativo del docente**, con l'attività didattica come priorità durante l'orario di lezione.

## Principio professionale

DOCENTE OS **non deve spiegare al docente cosa deve fare**. Il docente conosce il proprio lavoro, il contesto professionale e il momento della giornata. Il sistema deve invece ridurre il tempo necessario a reperire ciò che serve, soprattutto quando il tempo decisionale è di pochi secondi.

La funzione del prodotto è quindi:

- riconoscere il contesto temporale già registrato;
- rendere immediatamente disponibile il materiale pertinente;
- mostrare solo gli stati che richiedono realmente attenzione;
- evitare richieste di decisione quando non esiste una decisione professionale da assumere;
- conservare accessibili fonti, dettagli e funzioni senza imporli nella vista corrente.

## Priorità per contesto

### Durante una lezione

La prima superficie utile è **l'attività didattica della classe prevista dall'Orario**.

Deve essere raggiungibile con un gesto e presentare direttamente:

1. classe e disciplina;
2. attività/lezione corrente;
3. sequenza o contenuto utilizzabile in classe;
4. materiali necessari;
5. eventuali materiali destinati agli alunni o alla presentazione;
6. solo se esistono, modifiche o proposte ancora da confermare.

Se la preparazione è stata confermata, l'azione principale è **Apri attività** e non una fase di orientamento o di preparazione.

### Prima delle lezioni

Serve una lettura rapida dell'**Orario del giorno** con stato essenziale delle attività didattiche. Devono emergere soltanto eccezioni concrete: materiale mancante, modifica da controllare, impegno straordinario, scadenza imminente.

### Tra una lezione e l'altra

Il sistema deve rendere disponibile immediatamente la prossima classe/attività. Non deve richiedere di attraversare Home, Planner, Classi e Progetta per ricostruire il contesto.

### Riunioni, adempimenti e scadenze

Quando il contesto non è didattico, la stessa regola resta valida: **mostrare l'oggetto operativo**, non spiegare al docente che deve occuparsene. Per una riunione: orario, sede/link, ordine del giorno, documenti. Per una scadenza: oggetto, termine, documento o azione collegata.

## Vincolo di superficie

**Oggi non è una dashboard che interpreta il lavoro del docente.** È una superficie di accesso rapido ai dati e agli oggetti operativi già disponibili.

Su mobile il primo viewport deve privilegiare:

- attività didattica corrente, se esiste;
- prossima attività didattica o impegno temporale;
- eventuale eccezione concreta che richiede controllo.

Non devono comparire testi didascalici del tipo "cosa devi fare", "prossimo passo utile" o spiegazioni ovvie sul mestiere del docente.

Dettagli, materiali secondari, scadenze non imminenti e funzioni di gestione restano disponibili tramite divulgazione progressiva.

## Ordine del prossimo slice

1. rendere l'attività didattica corrente la prima entità operativa durante l'orario di lezione;
2. collegare Orario → classe → attività senza passaggi intermedi;
3. rendere la modalità in classe direttamente presentabile/utilizzabile;
4. mostrare lo stato di preparazione solo quando utile (`Pronta`, `Da controllare`, `Da confermare`);
5. mostrare materiali e allegati nel contesto dell'attività;
6. ridurre testi di orientamento e microcopy paternalistica;
7. mantenere riunioni e scadenze come eccezioni temporali ad alta evidenza;
8. validare il flusso su mobile con HIM/HVA e test di tempo operativo.

## Criterio di accettazione umano

Scenario canonico:

> Il docente entra in classe e apre DOCENTE OS.

Il sistema supera il gate solo se, senza ricerca e senza interpretazione della struttura del prodotto, il docente può raggiungere **l'attività prevista per quella classe e quell'ora in un gesto**, con i materiali necessari già contestualizzati.

Obiettivo operativo: **tempo di reperimento prossimo allo zero; decisione richiesta solo quando serve davvero una decisione del docente.**

## Non fare

- non trattare il docente come un utente da guidare nel proprio mestiere;
- non aggiungere nuove voci principali di navigazione;
- non creare una nuova pagina lunga per il riepilogo quotidiano;
- non mostrare contemporaneamente tutte le sezioni espanse;
- non duplicare Orario o Calendario dentro un nuovo archivio;
- non usare una `next best action` quando il contesto rende già evidente l'oggetto operativo;
- non anticipare notifiche push senza opt-in e senza fallback in-app;
- non trasformare suggerimenti dell'assistente in decisioni professionali automatiche;
- non promuovere la PR finché il percorso `Orario → attività in classe` non è verificato nel browser reale.
