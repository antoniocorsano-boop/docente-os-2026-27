# DOCENTE OS — T4 Didactic Allocation Review

Data: 2026-08-23  
Stato: APPROVED  
Decisione: APPROVE  
Governance: SATISFIED  
Approvato il: 2026-08-23T19:44:00+02:00  
Ricevuta: `T4-HUMAN-APPROVAL:2026-08-23T19:44+02:00`

## Regola professionale approvata

> **L'Orario e il Calendario possono suggerire una TeachingSession, ma non attestano automaticamente ciò che è stato svolto. Il docente registra i minuti effettivi e li alloca esplicitamente a uno o più blocchi Bxx; la somma non può superare la durata reale e gli stessi minuti non possono essere conteggiati due volte. Il raggiungimento del monte minuti può generare una proposta, ma lo stato `SVOLTO` del blocco resta una decisione professionale esplicita. Le evidenze trasversali possono essere riusate semanticamente senza duplicare il tempo.**

## Invarianti approvate

- una `ProjectedOccurrence` è capacità temporale, non attestazione di svolgimento;
- una `TeachingSession` conserva snapshot e provenienza;
- i minuti effettivi sono registrati dal docente;
- una sessione può essere allocata a uno o più Bxx della stessa sezione e generazione canonica;
- la somma dei minuti allocati non supera i minuti effettivi;
- gli stessi minuti non vengono conteggiati due volte;
- il raggiungimento quantitativo può produrre una proposta, mai una promozione automatica a `SVOLTO`;
- evidenze trasversali possono essere riusate semanticamente senza duplicare tempo;
- le rettifiche devono conservare la storia invece di riscrivere silenziosamente una sessione precedente;
- nessuna scrittura modifica il CAN-PLAN sorgente.

Questa approvazione autorizza la persistenza T4, i controlli deterministici anti-doppio-conteggio e la UX `Registra ciò che hai svolto`, mantenendo ogni decisione di completamento didattico sotto conferma umana esplicita.