# DOCENTE OS — Stakeholder Cognitive Fulfillment Contract

Stato: CANONICAL / APPROVED  
Data: 2026-08-23

## Principio

Una proiezione Human Task non è matura quando è soltanto tecnicamente valida o formalmente approvata. È promuovibile solo quando ogni stakeholder di contesto può comprendere il proprio compito, la propria responsabilità e la provenienza delle informazioni necessarie.

> Nessuno stakeholder deve ricostruire da codici, documenti lunghi o inferenze nascoste ciò che il sistema conosce già e che serve al compito.

## Stakeholder obbligatori del ciclo didattico

- **Docente**: comprende contesto, finalità, obiettivo, sequenza, evidenza, criteri osservabili e continuazione.
- **Alunno / gruppo classe**: comprende problema o obiettivo, azioni concrete, prodotto/evidenza, criteri per controllare il lavoro e possibilità di confronto, verifica, miglioramento o autovalutazione.
- **Coordinamento**: può verificare il raccordo tra Piano, UDA e altre fonti senza attribuire autorità alla fonte sbagliata.
- **Governance professionale-istituzionale**: può distinguere dato documentato, proposta, approvazione umana, motivazione e traccia auditabile.
- **Sistema / automazione assistita**: conosce ciò che può derivare deterministicamente, ciò che non può inventare, i binding strutturali e il punto in cui la decisione resta umana.

La lista è funzionale, non un organigramma: non implica che tutte le figure istituzionali intervengano in ogni lezione. Implica che l’informazione resti comprensibile e verificabile da chi ne possiede la competenza.

## Gate

La promozione fallisce chiusa quando uno stakeholder richiesto non dispone di informazioni sufficienti. Il gate non può essere compensato con testo generico o con una semplice dichiarazione `PASS`.

Per i manifest schema v2 la ricevuta cognitiva deve conservare:

1. stato `SATISFIED`;
2. tutti gli stakeholder richiesti;
3. almeno un’evidenza verificabile per stakeholder;
4. una nota auditabile per stakeholder;
5. una nota complessiva.

## Provenienza didattica e strutturale

Le sorgenti legate a una proiezione hanno contributo distinto:

- `DIDACTIC`: contribuisce al contenuto mostrato e deve essere esposto nella provenienza operativa;
- `STRUCTURAL`: serve a identità, fingerprint o coerenza del Piano, ma non deve comparire come se fosse autorità didattica del contenuto.

Un PACK associato dal Piano non acquisisce automaticamente autorità sull’attività, sull’evidenza o sulla valutazione.

## Evidenza deterministica

Quando il Piano non specifica l’evidenza alla granularità del blocco, la UDA può sostenerla soltanto attraverso un binding verificabile:

- `UDA_SECTION_ITEMS`: intestazione della sezione + indici delle voci selezionate;
- `UDA_PHASES`: ordinali delle fasi selezionate.

Il testo approvato deve essere ricostruibile dalla generazione canonica corrente. Non è ammesso un testo libero dell’automazione semplicemente accompagnato da una motivazione.

## Applicazione B31–B33 / UDA 1-07

Fonti congelate:

- CAN-PLAN-1 — `d327355b-76a9-496f-99cb-dc942fd950e4`;
- CAN-UDA-1-07 — `92194b46-b7e5-4c52-82a7-b1d75403b8b1`;
- CAN-PACK-1D — `1d150f77-6a7f-4f8b-8e85-2fa370956e29`, contributo `STRUCTURAL`.

Binding approvati:

- **B31**: fasi operative 1+2; evidenza da `PRODOTTO ATTESO`, voci 1–3.
- **B32**: fasi operative 3+4; evidenza da `PRODOTTO ATTESO`, voci 4–8.
- **B33**: fasi operative 5+6; evidenza derivata direttamente dal contenuto delle fasi 5–6.

Nessuna temporizzazione interna viene inventata: i blocchi restano da 120 minuti e i passaggi interni conservano `minutes: null` quando la fonte non li dettaglia ulteriormente.

## Invalidazione

Una modifica alla generazione delle fonti, ai binding dell’evidenza, al set di stakeholder richiesti o al significato strutturale del PACK invalida la ricevuta e richiede una nuova verifica prima della promozione.
