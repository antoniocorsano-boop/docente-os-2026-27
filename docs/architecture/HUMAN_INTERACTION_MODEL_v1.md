# Human Interaction Model (HIM) v1

Status: FOUNDATION / PILOT IN DOCENTE OS
Version: 1.0.0

## Scopo

HIM rende riusabile tra repository la governance dell'interazione umana già maturata in DOCENTE OS.

Catena canonica:

`Human Model -> Human Task -> Journey -> Interaction Contract -> Pattern -> Implementation -> Human Interaction Acceptance -> Evidence -> Improvement`

HIM non è un design system e non sostituisce i componenti UI. Definisce invece le condizioni minime perché una capacità significativa sia considerata progettata per un compito umano reale.

## Principi invarianti

1. Task before feature.
2. Real-world language.
3. One dominant task in focused contexts.
4. Recognition over recall.
5. Progressive disclosure.
6. Visible system state.
7. Predictable interaction.
8. Error prevention before error explanation.
9. Recoverability.
10. Reversibility where feasible.
11. Human authority at consequential boundaries.
12. Accessibility by construction.

## Profili

### HIM-L1 Foundation

Richiede Human Task, stati, errori, recovery e accessibilità.

### HIM-L2 Product

Aggiunge journey, pattern registry, consequential-action contract, Human Interaction Acceptance ed evidenza visuale/operativa.

### HIM-L3 Critical

Aggiunge authority boundary, audit/provenance rafforzati, doppia validazione dove richiesta e gate fail-closed.

DOCENTE OS adotta `HIM-L2` come primo pilota.

## Contratti d'interazione canonici

### Read / inspect

`intent -> locate -> inspect -> understand`

### Create / mutate

`intent -> compose/proposal -> preview -> commit -> receipt`

### Consequential action

`intent -> consequence preview -> explicit human decision -> commit -> receipt -> recovery`

### Asynchronous processing

`submit -> acknowledged -> processing -> visible status -> outcome -> retry/recovery`

### AI-assisted action

`human intent -> AI proposal -> provenance/context -> human inspection -> decision boundary -> controlled execution -> audit/reversal`

## Human Interaction Acceptance (HIA)

HIA è il gate generale. HVA resta compatibile come evidenza visuale esistente e può essere progressivamente assorbito in HIA.

Per ogni task critico HIA verifica almeno:

- task identificabile;
- ingresso scopribile;
- azione primaria chiara;
- linguaggio del dominio;
- contesto preservato;
- stato del sistema visibile;
- recovery disponibile;
- azioni con conseguenze protette;
- reversibilità adeguata;
- accessibilità;
- gerarchia visuale;
- assenza di leakage tecnico nel primo livello dell'interazione.

## Regola di promozione

Una capacità significativa non è HUMAN_READY solo perché build e test tecnici passano.

La promozione richiede un Human Task dichiarato e, secondo il profilo adottato, journey/pattern/acceptance/evidence coerenti.

## Installazione nel repository

Il pacchetto foundation vive in `tools/human-interaction-model/` ed espone:

- `init.mjs` per inizializzare `.human/` in un repository;
- `validate.mjs` per validare la configurazione e i task;
- schema JSON per i Human Task;
- configurazione di esempio;
- skill agente in `agent_skills/human-interaction-model/SKILL.md`.

Comandi dalla radice del repository:

```bash
node tools/human-interaction-model/init.mjs
node tools/human-interaction-model/validate.mjs
```

Il gate CI dedicato deve restituire `HUMAN_INTERACTION_PASS` solo quando il contratto installato è valido.
