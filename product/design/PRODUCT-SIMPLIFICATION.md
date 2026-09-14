# DOCENTE OS — Product Simplification

Stato: **CANONICAL / NORMATIVE**  
Programma: **UX-0**  
Issue canonica: **#368**

Questo contratto definisce la regola operativa di semplificazione delle superfici. È complementare a `HUMAN-EXPERIENCE-CONTRACT.md` e al programma `../../docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md`.

## Principio fondamentale

**Product Model ≠ User Model.**

Il Product Model può contenere `TeachingSession`, `Observation`, `EvidenceReference`, `AnnualPlanBlockProgress`, proiezioni temporali, `KnowledgeAsset`, UDA, versioni, provenance e altri oggetti governati.

Il modello percepito dal docente deve convergere verso:

**Oggi → Classe → Lezione → Fatto**

Le separazioni interne restano autoritative ma diventano guardrail invisibili. La UI espone una distinzione tecnica o di dominio soltanto quando corrisponde a una decisione professionale che il docente deve realmente prendere.

## Regola `WHY NOW?`

Ogni informazione, controllo, CTA o destinazione visibile nella superficie primaria deve poter rispondere:

> **Perché il docente deve vedere o decidere questa cosa adesso per completare il compito corrente?**

Se non esiste una risposta concreta:

- la capability non viene necessariamente eliminata;
- viene spostata dietro progressive disclosure;
- oppure diventa contestuale al momento in cui serve;
- oppure viene rimossa dalla navigazione primaria.

La disponibilità tecnica di una capability non giustifica la sua visibilità permanente.

## Regola di espansione

**Una nuova funzione non è un miglioramento se introduce una nuova scelta visibile al docente. Deve essere assorbita da un task esistente, salvo prova che costituisca un nuovo compito umano reale.**

Durante UX-0 nuove feature surface sono `DEFERRED`, salvo:

- security/privacy/data-integrity fix;
- critical defect o regressione;
- requisito normativo urgente;
- accessibilità;
- `PROFESSIONAL_GAP_CONFIRMED`;
- prerequisito indispensabile alla semplificazione dei journey canonici.

## Journey canonici

1. Iniziare la giornata.
2. Entrare in classe.
3. Condurre una lezione.
4. Chiudere/registrare una lezione.
5. Preparare la successiva.

Questi journey hanno precedenza sulla tassonomia delle feature. Una superficie esiste per servire un journey, non perché esiste un'entità nel dominio.

## Una CTA primaria per stato

Ogni stato significativo del journey presenta **una sola azione primaria**.

Azioni secondarie possono esistere, ma non devono competere visivamente o semanticamente con il prossimo passo.

Azioni tecnicamente differenti possono essere orchestrate dietro una stessa intenzione utente, purché:

- le autorità di dominio restino separate;
- nessuna decisione professionale venga automatizzata;
- la conseguenza della scrittura sia esplicita;
- errore e retry conservino gli input recuperabili;
- provenance, AAL2, RLS, privacy e idempotenza non vengano indebolite.

## Task Cost

Per ogni journey critico la review registra almeno:

| Metrica | Domanda |
| --- | --- |
| Decision count | Quante decisioni sono necessarie prima dell'obiettivo? |
| Internal concepts | Quanti concetti interni deve comprendere il docente? |
| Competing actions | Quante azioni concorrenti sono visibili nel punto più denso? |
| Surface transitions | Quante volte cambia superficie prima di concludere? |
| Mandatory input | Quali dati deve reinserire benché il sistema li conosca già? |
| Recovery burden | Quanto lavoro serve per riprendere dopo un errore? |
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

## Definition of Done

Una semplificazione non è chiusa perché una pagina appare più pulita. È chiusa quando il docente può raggiungere il proprio obiettivo senza comprendere l'architettura interna del prodotto, mantenendo invariati i contratti di dominio e sicurezza, e quando il confronto task-cost `before → after` è supportato da evidenza HUMAN_USE secondo M5-02.