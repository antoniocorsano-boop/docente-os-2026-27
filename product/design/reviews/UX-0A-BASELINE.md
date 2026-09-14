# UX-0A — Baseline reale del journey lezione

Stato: **BASELINE / REWORK_REQUIRED**  
Issue canonica: **#368**  
Programma: **UX-0 Product Simplification**

## Journey osservato

**Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo**

Questa baseline deriva dalla Beta/develop corrente e dal codice delle superfici Home, Oggi, AppShell e Classe. Non certifica ancora una soluzione e non attribuisce numeri non osservati.

## Finding principale

Le singole slice sono generalmente corrette e governate, ma il journey complessivo espone troppe possibilità e parte della separazione interna del dominio. Il docente deve interpretare differenze che il sistema dovrebbe orchestrare per lui.

### Classe — punto di massima densità

Nella stessa superficie possono competere:

- `Prepara la lezione` / `Prepara questa fase`;
- `Registra / rivedi` verso Piano annuale;
- `Registra ciò che hai svolto` verso TeachingSession;
- `Conferma come svolto` quando il monte minuti è raggiunto;
- materiali predisposti;
- materiali utili;
- collegamenti a Calendario/Orario quando manca una occurrence;
- contesto e altri percorsi secondari.

Le operazioni sono corrette nel dominio, ma non sono ancora organizzate come un unico compito umano.

## Task Cost — baseline qualitativa

| Metrica | Baseline | Finding |
| --- | --- | --- |
| Decision count | **ALTO** | Il docente deve scegliere tra percorsi che sembrano varianti dello stesso task. |
| Internal concepts | **ALTO** | Piano, attuazione reale, completamento del blocco e preparazione emergono come concetti distinti prima che siano necessari. |
| Competing actions | **ALTO** | Più CTA operative sono simultaneamente visibili nella Classe. |
| Surface transitions | **MEDIO/ALTO** | Classe può rinviare a Lezione, Piano, Progetta, Conoscenza, Calendario e Orario. |
| Mandatory input | **DA MISURARE** | Va verificato quali dati contestuali vengono ancora richiesti benché già noti. |
| Recovery burden | **DA MISURARE** | Va misurato il ritorno al task dopo errori/fallback temporali e materiali. |
| Net work | **REWORK_REQUIRED** | Il sistema protegge il lavoro ma non riduce ancora abbastanza il lavoro decisionale. |

La baseline quantitativa viene prodotta sulle fixture/journey stabili nelle slice UX-0B→UX-0F. Non si inventano numeri a posteriori.

## Cose già corrette da preservare

- Home calcola una priorità reale e propone un prossimo passo.
- Oggi isola un focus e nasconde il resto dietro progressive disclosure.
- TE-1 separa TeachingSession e AnnualPlanBlockProgress.
- Osservazione esplicita resta Tier 1 e governata.
- Draft Observation sopravvive a navigazione/errori previsti.
- Piano non viene completato automaticamente.
- HVA/WCAG/DPG/HIM continuano a essere gate indipendenti.

## Rework target

### UX-0B — Information architecture

- la navigazione primaria non rappresenta l'intero Product Model;
- Home/command palette/menu non devono creare tre tassonomie concorrenti;
- le capability secondarie restano raggiungibili.

### UX-0C — Classe task-first

- Classe diventa launcher del task, non dashboard del dominio;
- mostra contesto e prossimo passo;
- una sola CTA primaria determinata dallo stato;
- dettagli di piano/materiali/attuazione diventano contestuali o progressivi.

### UX-0D — Chiusura lezione

- `Prepara → Svolgi → Osserva → Registra` resta il journey operativo;
- il docente non sceglie fra due modi di registrare la stessa lezione;
- il completamento del Piano compare, quando legittimo, dopo la receipt TeachingSession come decisione professionale successiva.

### UX-0E — Materiali nel momento d'uso

- risorse pronte/pertinenti sostengono la lezione;
- ricerca e progettazione non diventano un secondo task salvo richiesta esplicita;
- il ritorno al contesto lezione/classe è preservato.

## Non-obiettivi

- nessuna fusione delle entità di dominio;
- nessun completamento automatico del Piano;
- nessuna modifica Tier 2;
- nessuna nuova integrazione Drive/Arena;
- nessuna nuova feature;
- nessun indebolimento di privacy, AAL2, RLS, provenance o idempotenza.

## Acceptance del programma

Le slice successive devono dimostrare sullo stesso scenario che:

- esiste una sola CTA primaria per lo stato corrente;
- il percorso normale non richiede di scegliere tra `Registra ciò che hai svolto` e `Registra / rivedi`;
- il completamento del Piano compare solo quando è una decisione successiva pertinente;
- il docente può tornare/uscire senza perdere il draft governato;
- mobile mantiene il task corrente sopra le superfici secondarie;
- il confronto task-cost `before → after` mostra una riduzione reale sostenuta da HUMAN_USE;
- nessun contratto TE-1, privacy, AAL2 o provenance viene indebolito.