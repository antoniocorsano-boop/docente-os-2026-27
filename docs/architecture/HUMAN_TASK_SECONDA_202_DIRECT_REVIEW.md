# DOCENTE OS — Human Task Review · Classe seconda · UDA 2-02

Stato: APPROVED  
Data: 2026-08-23  
Approvazione umana registrata: 2026-08-23T13:03:00+02:00  
Promotion: HUMAN_APPROVED

## Discovery autonoma

La tranche non è stata prescritta manualmente.

Dopo la promozione di B01–B04, la discovery runtime ha rilevato:

- Prima: `COMPLETE` — 33/33;
- Seconda: B01–B04 coperti;
- primo segmento incompleto: `Seconda:2`;
- blocchi scoperti: `B05–B08`;
- UDA: `2-02`;
- PACK principale: `CAN-PACK-2B`;
- classificazione compiler v3: **DIRECT** per tutti e quattro i blocchi;
- ambiguità semantica del raccordo: nessuna.

## Fonti correnti congelate

- `CAN-PLAN-2` — asset `36ef3be5-925f-4e28-afff-df11097827a9` — generation `a1066c0a-2720-40b0-841e-306cb998ce3e`;
- `CAN-UDA-2-02` — asset `1fd05883-3332-4f21-a7b3-2c4c531c0ae4` — generation `0d2ffe0d-222a-485b-ae23-1e91eb0072ab`;
- `CAN-PACK-2B` — asset `d8cb0142-3421-4f2e-a546-5e60b1822d7c` — generation `5fbca577-3dcd-4609-a32e-f95a6d3ebc1d`.

Qualunque source drift invalida questa review.

## Raccordo approvato

| Blocco | Titolo operativo documentato dal PACK | Durata documentata | Prodotto | Evidenza |
| --- | --- | ---: | --- | --- |
| B05 | Dal campo al prodotto | 120 min | Scheda 2B-1 “La storia tecnologica di un alimento” | riconosce fasi e attori; distingue materia prima e prodotto trasformato |
| B06 | Come si conserva un alimento | 120 min | Scheda 2B-2 “Metodo di conservazione: come funziona e perché” | associa metodo, principio essenziale e vantaggio/limite |
| B07 | Packaging, etichetta e consumo consapevole | 120 min | Scheda 2B-3 “Leggo una confezione” | legge informazioni essenziali; collega materiale, funzione e fine vita |
| B08 | Spreco, scelte e filiera responsabile | 120 min | Scheda 2B-4 “Quale filiera riduce meglio gli sprechi?” | formula un giudizio motivato usando almeno tre criteri |

La durata non è inferita dal Piano. Il PACK dichiara esplicitamente `ARTICOLAZIONE — 4 LEZIONI DA 2 ORE`; il compiler accetta questa forma soltanto perché:

1. le lezioni esplicite sono esattamente quattro;
2. i blocchi scoperti sono esattamente quattro;
3. ciascun blocco canonico dura due ore;
4. la sequenza è `LEZIONE 1 → LEZIONE 4` senza salti;
5. ogni lezione contiene Attività, Prodotto ed Evidenza/Evidenze.

Conteggio diverso, durata diversa, più dichiarazioni o assenza di temporizzazione esplicita bloccano DIRECT.

## Autorità delle fonti — APPROVATA

La decisione professionale conferma la regola già adottata nella tranche precedente:

- **Piano**: struttura, ordine, collocazione, UDA e durata del segmento;
- **UDA 2-02**: senso formativo, competenze, nuclei disciplinari, compito autentico, verifica, valutazione e inclusione;
- **PACK 2B**: titolo umano, attività, prodotto, evidenza e scheda della singola lezione quando il raccordo 1:1 è completamente documentato.

### Vincolo disciplinare specifico di UDA 2-02

Il lavoro su packaging ed etichetta resta nel campo tecnologico: funzione dell’imballaggio, materiali, conservazione, informazioni essenziali, distribuzione, fine vita e scelte responsabili. Non viene trasformato automaticamente in educazione nutrizionale specialistica.

## Gate di adempimento cognitivo

### Docente operativo — SATISFIED

Le fonti espongono per ciascun blocco focus, attività, prodotto ed evidenza; il PACK aggiunge materiali, compito significativo, criteri e registro di attuazione. Il docente può capire cosa preparare, cosa far fare e cosa osservare.

### Alunno / gruppo — SATISFIED

Le quattro schede rendono concrete consegna e prodotto. Compito significativo, criteri di qualità e rubrica consentono di comprendere cosa conta e come migliorare il lavoro.

### Revisore professionale / coordinamento — SATISFIED

Il raccordo distingue chiaramente Piano, UDA e PACK; source generation, timing e criteri di classificazione sono verificabili.

### Governance — SATISFIED

La promozione è stata autorizzata esplicitamente dall’utente il 23 agosto 2026. La decisione riguarda B05–B08 e riusa la separazione di autorità già approvata; non costituisce approvazione automatica delle tranche future.

### Automazione — SATISFIED

Il sistema conosce i campi derivabili e i casi che devono bloccare il ciclo. Il supporto al timing di set è deterministico e coperto da test fail-closed.

## Miglioramento del ciclo

Disposition: `SYSTEM_IMPROVEMENT_APPLIED`.

Miglioramento generalizzabile già integrato prima di questa review:

- supporto a temporizzazione esplicita di set `N lezioni da M ore` con verifica esatta di cardinalità e durata;
- supporto al campo sorgente `Evidenze` al plurale nel classifier DIRECT;
- mantenimento del rifiuto quando la durata non è documentata.

Product CI della slice di compilazione: **163/163 test PASS + typecheck + lint senza errori + build PASS**.

## Decisione

`APPROVED` — promuovere B05–B08 come quattro proiezioni `DIRECT` usando i titoli e i contenuti operativi di CAN-PACK-2B, mantenendo Piano e UDA nelle rispettive autorità sopra definite.

Review package: `HTC-REVIEW-PACKAGE:Seconda:Seconda:2:B05-B08:v1`.
Approval receipt: `HTC-HUMAN-APPROVAL:Seconda:Seconda:2:B05-B08:2026-08-23T13:03+02:00`.
