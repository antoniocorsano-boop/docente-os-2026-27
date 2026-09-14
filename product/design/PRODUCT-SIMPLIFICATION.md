# DOCENTE OS — Product Simplification

Stato: **CANONICAL / NORMATIVE**  
Issue: **#370 — UX-0 Product Simplification**

## Perché esiste

DOCENTE OS ha separato correttamente dominio, sicurezza, provenance e decisioni professionali. Questa ricchezza interna non deve però diventare complessità richiesta al docente.

La correttezza locale di una slice non è sufficiente se il journey complessivo costringe l'utente a comprendere il Product Model, scegliere tra superfici equivalenti o ricostruire il contesto del proprio lavoro.

Questo contratto integra, senza sostituirlo, `HUMAN-EXPERIENCE-CONTRACT.md`.

## Principio fondamentale

**Product Model ≠ User Model.**

Il Product Model può contenere TeachingSession, Observation, EvidenceReference, AnnualPlanBlockProgress, proiezioni temporali, KnowledgeAsset, UDA e altre entità governate.

Il modello percepito dal docente deve convergere verso:

**Oggi → Classe → Lezione → Fatto**

Le separazioni interne restano autoritative ma diventano guardrail invisibili. La UI espone una distinzione tecnica o di dominio soltanto quando corrisponde a una decisione professionale che l'utente deve realmente prendere.

## Regola di espansione

**Una nuova funzione non è un miglioramento se introduce una nuova scelta visibile al docente. Deve essere assorbita da un task esistente, salvo prova che costituisca un nuovo compito umano reale.**

Durante UX-0, nuove feature surface sono `DEFERRED`, salvo:

- correzioni di regressioni;
- sicurezza o privacy;
- obblighi normativi;
- accessibilità;
- prerequisiti indispensabili alla semplificazione dei journey canonici.

## Journey canonici

1. Iniziare la giornata.
2. Entrare in classe.
3. Condurre una lezione.
4. Chiudere/registrare una lezione.
5. Preparare la successiva.

Questi journey hanno precedenza sulla tassonomia delle feature. Una superficie esiste per servire un journey, non perché esiste un'entità nel dominio.

## Regola `WHY NOW?`

Ogni informazione, controllo, CTA o destinazione visibile nella superficie primaria deve poter rispondere:

> **Perché il docente deve vedere o decidere questa cosa adesso per completare il compito corrente?**

Se non esiste una risposta concreta:

- non si elimina necessariamente la capacità;
- la si sposta dietro progressive disclosure;
- oppure la si rende contestuale al momento in cui diventa necessaria;
- oppure la si rimuove dalla navigazione primaria.

## Una CTA primaria per stato

Ogni stato significativo del journey deve presentare **una sola azione primaria**. Azioni secondarie possono esistere, ma non devono competere visivamente o semanticamente con il prossimo passo.

Azioni tecnicamente differenti possono essere orchestrate dietro una stessa intenzione utente, purché:

- le autorità di dominio restino separate;
- nessuna decisione professionale venga automatizzata;
- la conseguenza della scrittura sia esplicita;
- errore e retry conservino gli input recuperabili.

## Task Cost

Per ogni journey critico la review UX registra almeno:

| Metrica | Domanda |
| --- | --- |
| Decision count | Quante decisioni sono necessarie prima dell'obiettivo? |
| Internal concepts | Quanti concetti interni deve comprendere il docente? |
| Competing actions | Quante azioni concorrenti sono visibili nel punto più denso? |
| Surface transitions | Quante volte cambia superficie prima di concludere? |
| Net work | DOCENTE OS ha tolto lavoro oppure ne ha aggiunto? |

Il confronto significativo è **before → after** sullo stesso task. Una semplificazione non è accettata se migliora una metrica sacrificando controllo umano, sicurezza, privacy, accessibilità o recuperabilità.

## Distinzione dai gate esistenti

- Design Policy protegge coerenza e debito visuale.
- WCAG protegge requisiti di accessibilità verificabili.
- HVA verifica esecuzione, osservabilità e journey previsti.
- Human Interaction Model protegge i confini di interazione.
- **Product Simplification verifica il costo cognitivo e operativo del task.**

Un PASS degli altri gate non implica automaticamente `SIMPLIFICATION_PASS`.

## Navigation policy

La navigazione globale non deve essere l'indice del Product Model. Le destinazioni di primo livello devono corrispondere ai pochi contesti che il docente cerca direttamente e frequentemente.

Ipotesi UX-0 da validare, non baseline già approvata:

**Oggi · Classi · Orario · Materiali · Altro**

Progettazione, Piano annuale, Calendario, configurazione e sicurezza possono essere raggiunti contestualmente o come superfici secondarie se i journey dimostrano che non richiedono rango primario.

## UX-0A — primo slice

Journey sotto audit:

**Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo**

Vincoli:

- nessuna nuova feature;
- una CTA primaria per stato;
- TeachingSession e AnnualPlanBlockProgress restano separati nel dominio;
- la loro distinzione non viene imposta all'utente prima che serva una decisione professionale;
- nessuna EvidenceReference inventata;
- nessuna inferenza automatica dalle checklist;
- draft Observation e privacy Tier 1 restano governati;
- AAL2/provenance/idempotenza TE-1 restano invariati;
- mobile è un target primario.

## Definition of Done UX-0

UX-0 non è chiusa quando una pagina appare più pulita. È chiusa quando tutti e cinque i journey canonici sono verificati end-to-end e il docente può raggiungere il proprio obiettivo senza dover comprendere l'architettura interna del prodotto.
