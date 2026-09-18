# DOCENTE OS — Human Task Review · Classe seconda · UDA 2-03

Stato: READY_FOR_HUMAN_REVIEW  
Data: 2026-08-23  
Promotion: HUMAN_APPROVAL_REQUIRED

## Discovery autonoma

La tranche non è stata prescritta manualmente.

Dopo la promozione runtime di B01–B08, la discovery ha individuato:

- Prima: `COMPLETE` — 33/33;
- Seconda: B01–B08 coperti;
- primo segmento incompleto: `Seconda:3`;
- blocchi: `B09–B12`;
- UDA: `2-03`;
- PACK principale: `CAN-PACK-2C`;
- durata: 8 ore / quattro lezioni da 2 ore;
- ambiguità sul raccordo lezione ↔ blocco: nessuna.

## Fonti congelate

- `CAN-PLAN-2` — asset `36ef3be5-925f-4e28-afff-df11097827a9` — generation `a1066c0a-2720-40b0-841e-306cb998ce3e`;
- `CAN-UDA-2-03` — asset `06e206d1-a209-4ab9-8f40-3d2755bd2f80` — generation `2dadf1db-b3e0-4585-99b9-61d7ac7010f0`;
- `CAN-PACK-2C` — asset `d7645701-f3cd-4d99-af76-8f0428d09004` — generation `8347bccd-6541-4a71-8e47-c08d42ea4f73`.

Qualunque source drift invalida questa review.

## Raccordo operativo proposto

| Blocco | Lezione documentata dal PACK | Durata | Prodotto / artefatto principale | Evidenza |
| --- | --- | ---: | --- | --- |
| B09 | Leggere il territorio | 120 min | Scheda 2C-1 “Carta d’identità di un territorio” | riconosce e distingue le principali funzioni territoriali |
| B10 | Come funziona una città | 120 min | Scheda 2C-2 “La città come sistema” | mette in relazione funzioni, servizi e spostamenti |
| B11 | Problemi e scelte di pianificazione | 120 min | Scheda 2C-3 “Diagnosi e miglioramento” | identifica criticità e propone una soluzione motivata |
| B12 | Micro-area territoriale | 120 min | progetto di micro-area + Scheda 2C-4 + pitch finale | compito significativo verificato mediante prodotto, rubrica e criteri OD-READY |

### B12 — grammatica del compito finale

La quarta lezione non duplica artificialmente `Attività / Prodotto / Evidenza`. La fonte usa invece una struttura professionale esplicita:

`LEZIONE 4 → COMPITO SIGNIFICATIVO / TASK_BRIEF → SCHEDA 2C-4 → RUBRICA → CRITERI OD-READY`.

Il compiler v4, integrato prima di questa review, riconosce questa struttura soltanto se tutti gli artefatti sono presenti nella medesima generazione della fonte. Mancanza di consegna, prodotto, scheda, rubrica o criteri blocca il raccordo. Durata e ordine rimangono sottoposti alle regole fail-closed di DIRECT.

Product CI del compiler v4: test, typecheck, lint e build `PASS`.

## Autorità delle fonti proposta

Si riusa la separazione già approvata per le tranche precedenti:

- **Piano**: struttura, ordine, collocazione e durata;
- **UDA 2-03**: senso formativo, competenze, nuclei disciplinari, prodotto autentico, verifica, valutazione e inclusione;
- **PACK 2C**: titolo umano, attività, prodotto/evidenza e materiali operativi della singola lezione quando il raccordo è documentato 1:1.

## Nuovo punto professionale emerso

CAN-PACK-2C dichiara inoltre che:

> le attività grafiche possono concorrere alle 6 ore trasversali di UDA 2-06 previste entro dicembre, senza duplicazione del monte ore.

Il Piano annuale, contemporaneamente, mantiene un segmento canonico separato di **6 ore UDA 2-06 / PACK 2D** dopo B09–B12.

La fonte non assegna minuti interni di B09–B12 a UDA 2-06. Di conseguenza il sistema non può decidere automaticamente quante ore trasferire senza inventare una ripartizione.

### Regola professionale proposta

1. **B09–B12 restano contabilizzati integralmente come 8 ore di UDA 2-03.**
2. Le attività grafiche svolte in B09–B12 possono essere registrate come **evidenze/contributi trasversali** utili anche a UDA 2-06, senza attribuire automaticamente ore a UDA 2-06.
3. Le **6 ore canoniche di UDA 2-06 restano nel segmento successivo B13–B15** finché l’attuazione reale della classe non documenta una diversa allocazione temporale.
4. Se durante l’attuazione il docente decide esplicitamente che una quota reale di tempo svolta in B09–B12 deve valere anche come quota oraria UDA 2-06, il sistema deve registrare una **riallocazione effettiva**, sottrarre quella quota dal residuo UDA 2-06 e impedire il doppio conteggio.
5. Un collegamento semantico o una evidenza trasversale **non equivale di per sé a una riallocazione di ore**.

Questa regola preserva sia la fonte PACK sia il Piano senza inventare minuti non documentati e rende possibile, più avanti, registrare fedelmente ciò che avviene davvero in classe.

## Adempimento cognitivo — pre-gate

### Docente operativo — READY

Per ogni blocco sono documentati focus, attività, prodotto/evidenza e materiali. B12 fornisce una consegna autentica completa con prodotto articolato, scheda e criteri. Il docente può comprendere cosa preparare, cosa far fare e cosa osservare.

### Alunno / gruppo — READY

Le schede 2C-1…2C-4, il compito significativo, la rubrica e i criteri OD-READY rendono espliciti azione, prodotto, criteri e possibilità di revisione. Il lessico tecnico resta riconducibile a territorio, funzioni, servizi, mobilità, pianificazione, legenda e sostenibilità.

### Coordinamento / revisore professionale — READY

È tracciabile la distinzione tra Piano, UDA e PACK; il raccordo B09–B12 è deterministico; l’eventuale relazione con UDA 2-06 è esplicitamente separata dalla contabilità oraria.

### Governance — HUMAN_DECISION_PENDING

Serve approvazione professionale della regola di non-doppio-conteggio e della distinzione `evidenza trasversale ≠ ora trasferita`.

### Automazione / sistema — READY

Il sistema può:

- derivare B09–B12 e le quattro lezioni;
- verificare durata e ordine;
- recuperare B12 dalla struttura `LEZIONE → TASK_BRIEF → RUBRICA`;
- conservare il collegamento trasversale con UDA 2-06;
- impedire promozione oraria automatica in assenza di un dato reale di riallocazione.

Non può scegliere autonomamente una quantità di ore da attribuire a UDA 2-06.

## Miglioramento del ciclo

Disposition proposta: `SYSTEM_IMPROVEMENT_APPLIED`.

Il ciclo ha già prodotto un miglioramento generalizzabile:

- compiler v4 per compiti finali espliciti strutturati come `LEZIONE → TASK_BRIEF → RUBRICA`, mantenendo v3 come percorso predefinito e fail-closed.

## Decisione professionale residua

Approvare la seguente regola:

> **B09–B12 restano contabilizzati nelle 8 ore di UDA 2-03. Le attività grafiche possono valere come evidenze trasversali anche per UDA 2-06, ma non consumano automaticamente le sue 6 ore. Le 6 ore UDA 2-06 restano B13–B15 finché l’attuazione reale non registra una riallocazione esplicita; ogni riallocazione sottrae la quota dal residuo e non può essere conteggiata due volte.**

Se approvata, il sistema può promuovere B09–B12 con il gate cognitivo completo e proseguire autonomamente alla tranche successiva.

Decisione corrente: `PENDING`.
