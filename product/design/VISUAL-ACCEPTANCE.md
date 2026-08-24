# DOCENTE OS — Visual Acceptance

Stato: **CANONICAL**

## Scopo

Il gate visuale impedisce di considerare conclusa una modifica dell'interfaccia solo perché compila. La sequenza di lavoro è:

**implementa → esegui browser → raccogli evidenza → valuta → correggi → riesegui**.

## Livelli di esito

- `PASS` — nessun problema rilevante per il compito osservato.
- `WATCH` — la superficie è utilizzabile ma esiste una frizione da monitorare o rifinire.
- `FAIL` — il problema impedisce o rende inaffidabile il compito.
- `NOT_APPLICABLE` — controllo non pertinente alla superficie.
- `NOT_IMPLEMENTED` — capacità prevista ma non ancora disponibile; non può essere riportata come PASS.
- `REVIEW_REQUIRED` — controlli automatici verdi, ma il giudizio visuale deve ancora essere espresso da un umano o agente che osservi gli artefatti.

## Controlli automatici minimi

Per ogni superficie coperta:

- pagina raggiungibile e non rediretta inattesa;
- presenza di un titolo/contesto principale;
- nessun errore JavaScript non atteso;
- nessuna richiesta di rete fallita non ammessa;
- nessun overflow orizzontale della pagina;
- screenshot per viewport configurato;
- raccolta di misure di viewport e dimensione documento;
- segnalazione di controlli interattivi molto piccoli su mobile.

Questi controlli sono necessari ma non sufficienti.

## Giudizio visuale

L'osservatore valuta almeno:

1. gerarchia dominante;
2. visibilità del compito/stato corrente;
3. distinzione fra azione primaria e secondaria;
4. densità e lunghezza percepita;
5. comportamento mobile;
6. presenza di elementi troncati, sovrapposti o fuori contesto;
7. coerenza con `DESIGN.md` e `HUMAN-EXPERIENCE-CONTRACT.md`;
8. qualità degli stati vuoti, caricamento, errore e recupero quando presenti.

Un confronto pixel-per-pixel può essere aggiunto per componenti molto stabili, ma non è l'autorità estetica primaria: dati dinamici e contenuti reali rendono più utile il giudizio strutturale e cognitivo.

## Acceptance Receipt

Ogni esecuzione generale produce:

- `acceptance.json` — ricevuta strutturata;
- `acceptance.md` — versione leggibile;
- screenshot per superficie/viewport;
- osservazioni JSON per superficie;
- report Playwright e artefatti di errore.

La ricevuta contiene almeno:

- commit;
- target (`local`, `preview`, `beta`);
- base URL;
- viewport;
- esiti browser/console/rete/layout;
- eventuali `WATCH` automatici;
- copertura delle superfici;
- stato `REVIEW_REQUIRED` finché il risultato visuale non viene osservato.

## Igiene E2E

I test che scrivono dati devono essere riconoscibili come E2E, riusare fixture deterministiche quando possibile e prevedere cleanup o reset. I test visuali generali devono essere **read-only**. Un ambiente di collaudo contaminato da fixture ripetute riduce l'affidabilità del giudizio visuale e va classificato come finding infrastrutturale.