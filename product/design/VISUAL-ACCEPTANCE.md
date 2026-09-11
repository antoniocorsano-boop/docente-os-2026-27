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
7. coerenza con `DESIGN_SYSTEM_V2_CANONICAL.md`, `BRAND_IDENTITY_CANONICAL.md`, `DESIGN_GOVERNANCE_CANONICAL.md` e `HUMAN-EXPERIENCE-CONTRACT.md`;
8. qualità degli stati vuoti, caricamento, errore e recupero quando presenti.

Un confronto pixel-per-pixel può essere aggiunto per componenti molto stabili, ma non è l'autorità estetica primaria: dati dinamici e contenuti reali rendono più utile il giudizio strutturale e cognitivo.

## Design Governance Review — obbligatoria

Quando il diff tocca una superficie visuale, la review deve classificare esplicitamente `PASS`, `WATCH`, `FAIL` o `NOT_APPLICABLE` per i criteri seguenti. Non è ammesso inferire `PASS` soltanto perché browser, build o DPG-1 statico sono verdi.

| Regola | Criterio osservabile |
| --- | --- |
| `DPG-05` | Esiste una sola azione primaria realmente dominante nel contesto. |
| `DPG-06` | La gerarchia si legge come titolo → contesto → stato → azione → contenuto. |
| `DPG-07` | La superficie resta calma e professionale; gli effetti non competono con il compito. |
| `DPG-08` | Tipografia, uppercase, metadata e densità sono coerenti con il sistema. |
| `DPG-09` | Il percorso è realmente fruibile su mobile 360–430 px, non solo tecnicamente responsive. |
| `DPG-10` | Navigazione/header preservano sezione e contesto senza sottrarre spazio al lavoro. |
| `DPG-11` | Stati e feedback sono espressi con parole umane; il colore è soltanto rinforzo. |
| `DPG-12` | Se compare loading, comunica ricomposizione del contesto e usa il brand correttamente. |
| `DPG-15` | Copy breve, professionale, contestuale; l'AI propone e non simula autorità del docente. |
| `DPG-16` | Sulla Home, lo spazio prioritario è dedicato alla realtà della giornata, non alla spiegazione del prodotto. |
| `DPG-17` | Prominenza, colore o posizione non alterano l'autorità reale di DRAFT, TeachingSession, Drive o proposte AI. |
| `DPG-18` | Focus, contrasto, leggibilità, target e uso senza solo colore restano adeguati. |

Il reviewer deve usare screenshot e percorso reale; per una regola non pertinente deve registrare `NOT_APPLICABLE`, non ometterla.

## Relazione con DPG-1

`DESIGN_POLICY_GATE_DPG1.md` controlla staticamente le violazioni deterministiche. HVA completa il contratto sui criteri che richiedono percezione, significato o contesto. I due gate sono complementari:

- **DPG-1 verde non equivale a design approvato**;
- **HVA non può ignorare una violazione statica DPG-1**;
- una modifica visuale trasversale è promuovibile soltanto quando entrambi i livelli sono coerenti.

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
- checklist Design Governance da valutare;
- stato `REVIEW_REQUIRED` finché il risultato visuale non viene osservato.

## Igiene E2E

I test che scrivono dati devono essere riconoscibili come E2E, riusare fixture deterministiche quando possibile e prevedere cleanup o reset. I test visuali generali devono essere **read-only**. Un ambiente di collaudo contaminato da fixture ripetute riduce l'affidabilità del giudizio visuale e va classificato come finding infrastrutturale.
