# DOCENTE OS — T4 Didactic Allocation Review

Data: 2026-08-23  
Stato: APPROVED  
Decisione: APPROVE  
Governance: SATISFIED  
Approvato il: 2026-08-23T19:44:00+02:00  
Ricevuta: `T4-HUMAN-APPROVAL:2026-08-23T19:44+02:00`

## 1. Contesto già canonico

`TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` stabilisce la catena:

```text
CAN-PLAN / Bxx
        +
ProjectedOccurrence
        ↓
TeachingSession / execution evidence
        ↓
registro di attuazione
```

T3A, T3B e T3C forniscono già i due prerequisiti tecnici: un Orario versionato, un Calendario indipendente e una proiezione temporale deterministica che non riscrive i domini sorgente.

Il Piano annuale dispone già di un registro di avanzamento per sezione/blocco con stato, data di esecuzione e nota di evidenza. T4 aggiunge la capacità di rappresentare il tempo realmente svolto senza trasformare una previsione in una attestazione didattica automatica.

## 2. Problema professionale

Una `ProjectedOccurrence` dice che una lezione era temporalmente prevista e materializzabile in una certa data. Non dimostra da sola:

- che la lezione sia stata effettivamente svolta;
- quanti minuti siano stati realmente utilizzati per il percorso previsto;
- quale/i blocco/i Bxx siano stati effettivamente trattati;
- che un blocco debba essere considerato concluso;
- che un'attività trasversale debba consumare automaticamente ore di un'altra UDA.

Trasformare automaticamente l'occorrenza in avanzamento del Piano produrrebbe quindi una inferenza professionale non documentata.

## 3. Regola approvata

### A. Occorrenza ≠ sessione svolta

Una occorrenza proiettata costituisce **capacità temporale candidata**. Diventa `TeachingSession` soltanto quando viene registrata come effettivamente svolta.

### B. La sessione conserva uno snapshot

La `TeachingSession` registra almeno:

- data;
- orario effettivo o minuti effettivi;
- sezione;
- disciplina/contesto;
- provenienza dell'occorrenza proiettata, quando presente;
- nota/evidenza facoltativa;
- identità dell'utente che registra;
- timestamp di registrazione.

Una successiva modifica di Orario o Calendario non riscrive una sessione già registrata.

### C. Allocazione esplicita ai blocchi

Una sessione può essere allocata a uno o più blocchi Bxx della stessa sezione e generazione canonica. Per ogni allocazione si registrano i **minuti effettivamente attribuiti**.

Vincolo deterministico:

```text
somma(minuti allocati ai Bxx) <= minuti effettivi della TeachingSession
```

Il sistema impedisce il doppio conteggio degli stessi minuti.

### D. I minuti non certificano automaticamente il completamento

I minuti allocati alimentano un indicatore quantitativo di avanzamento, ma **non impostano automaticamente lo stato didattico `SVOLTO`**. La conclusione del blocco resta una decisione professionale esplicita, perché dipende anche da obiettivi, evidenze e qualità dell'attuazione, non soltanto dalla durata.

Il sistema può proporre `Il monte minuti previsto è stato raggiunto: vuoi registrare il blocco come svolto?`, mostrando l'effetto, ma non deve promuovere autonomamente lo stato.

### E. Riallocazione e trasversalità

Un minuto reale può contribuire al budget quantitativo di **una sola allocazione canonica**. Collegamenti trasversali, evidenze riutilizzabili o competenze comuni possono essere registrati semanticamente senza duplicare i minuti.

Una riallocazione effettiva tra blocchi/UDA è una modifica esplicita del registro di attuazione: sottrae i minuti dalla precedente allocazione e li assegna alla nuova, conservando traccia della modifica.

### F. Assenza di prova

Se una data/lezione non viene registrata come TeachingSession, il sistema non presume né presenza né assenza di svolgimento. Rimane semplicemente una occorrenza prevista senza evidenza di esecuzione.

## 4. UX approvata

Nel contesto Classe/Oggi, dopo una lezione proiettata il sistema può presentare un'azione compatta:

`Registra ciò che hai svolto`

La superficie successiva mostra:

1. lezione/data/sezione già riconosciute;
2. durata prevista come riferimento, non come fatto;
3. blocco Bxx suggerito dal Piano, senza selezione irreversibile automatica;
4. minuti effettivi;
5. eventuale secondo blocco solo se necessario;
6. evidenza/nota breve;
7. effetto sul residuo del Piano prima della conferma.

Il docente non deve conoscere identificativi tecnici, generazioni o provenance IDs: restano nella ricevuta di sistema.

## 5. Invarianti tecniche approvate

- `TeachingSession` è append-only per la provenienza; le rettifiche conservano traccia.
- allocazioni riferite alla stessa sessione non possono superare i minuti effettivi;
- il blocco deve appartenere alla sezione/grado e alla generazione canonica attiva al momento della registrazione;
- nessun aggiornamento automatico del CAN-PLAN sorgente;
- nessun completamento Bxx automatico basato soltanto sui minuti;
- nessun doppio conteggio di minuti trasversali;
- letture storiche mantengono gli snapshot anche dopo nuove versioni Orario/Calendario/Piano.

## 6. Decisione professionale

È approvata la seguente regola:

> **L'Orario e il Calendario possono suggerire una TeachingSession, ma non attestano automaticamente ciò che è stato svolto. Il docente registra i minuti effettivi e li alloca esplicitamente a uno o più blocchi Bxx; la somma non può superare la durata reale e gli stessi minuti non possono essere conteggiati due volte. Il raggiungimento del monte minuti può generare una proposta, ma lo stato `SVOLTO` del blocco resta una decisione professionale esplicita. Le evidenze trasversali possono essere riusate semanticamente senza duplicare il tempo.**

Questa approvazione autorizza la persistenza T4, i controlli anti-doppio-conteggio e la UX di registrazione, mantenendo la promozione `SVOLTO` sotto conferma umana esplicita.