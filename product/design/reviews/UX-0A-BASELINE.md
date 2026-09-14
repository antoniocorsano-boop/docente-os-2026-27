# UX-0A — Baseline reale del journey lezione

Stato: **BASELINE / REWORK_REQUIRED**  
Issue: **#370**

## Journey osservato

**Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo**

Questa baseline deriva dalla Beta/develop corrente e dal codice delle superfici Home, Oggi, AppShell e Classe. Non certifica ancora una soluzione.

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
| Decision count | ALTO | Il docente deve scegliere tra percorsi che sembrano varianti dello stesso task. |
| Internal concepts | ALTO | Piano, attuazione reale, completamento del blocco e preparazione emergono come concetti distinti prima che siano necessari. |
| Competing actions | ALTO | Più CTA operative sono simultaneamente visibili nella Classe. |
| Surface transitions | MEDIO/ALTO | Classe può rinviare a Lezione, Piano, Progetta, Conoscenza, Calendario e Orario. |
| Net work | REWORK_REQUIRED | Il sistema protegge il lavoro ma non riduce ancora abbastanza il lavoro decisionale. |

Questa baseline deve essere resa quantitativa durante l'implementazione UX-0A con scenari/fixture stabili; non si inventano numeri a posteriori.

## Cose già corrette da preservare

- Home calcola una priorità reale e propone un prossimo passo.
- Oggi isola un focus e nasconde il resto dietro progressive disclosure.
- TE-1 separa TeachingSession e AnnualPlanBlockProgress.
- Osservazione esplicita resta Tier 1 e governata.
- Draft Observation sopravvive a navigazione/errori previsti.
- Piano non viene completato automaticamente.
- HVA/WCAG/DPG/HIM continuano a essere gate indipendenti.

## Rework target UX-0A

1. **Classe come launcher del task, non dashboard del dominio.**
   - mostrare contesto e prossimo passo;
   - una CTA primaria determinata dallo stato;
   - dettagli di piano/materiali/attuazione dietro progressive disclosure o dentro il momento pertinente.

2. **Lezione come percorso dominante.**
   - `Prepara → Svolgi → Osserva → Registra` resta il journey operativo;
   - l'utente non sceglie tra due modi di registrare la stessa lezione.

3. **Completamento Piano come decisione successiva.**
   - dopo receipt TeachingSession, se esiste una proposta legittima di completamento, presentarla come decisione professionale distinta nel prossimo passo;
   - non farla competere con la registrazione prima che la sessione sia salvata.

4. **Fallback temporali contestuali.**
   - Calendario/Orario sono strumenti di recupero quando manca il contesto temporale, non CTA concorrenti durante il percorso normale.

5. **Materiali nel momento d'uso.**
   - risorse pronte/pertinenti devono sostenere la lezione, non creare un secondo task di ricerca salvo richiesta esplicita.

## Non-obiettivi

- nessuna fusione delle entità di dominio;
- nessun completamento automatico del Piano;
- nessuna modifica Tier 2;
- nessuna nuova integrazione Drive/Arena;
- nessun redesign globale della navigazione prima dell'evidenza UX-0A;
- nessuna nuova feature.

## Acceptance del primo incremento

Il primo incremento implementativo deve dimostrare sullo stesso scenario che:

- esiste una sola CTA primaria nella Classe per lo stato corrente;
- il percorso normale non richiede di scegliere tra `Registra ciò che hai svolto` e `Registra / rivedi`;
- il completamento del Piano compare solo quando è una decisione successiva pertinente;
- il docente può tornare/uscire senza perdere il draft governato;
- mobile mantiene il task corrente sopra le superfici secondarie;
- nessun contratto TE-1, privacy, AAL2 o provenance viene indebolito.
