# DOCENTE OS — Human Task Review · Classe seconda · UDA 2-01

Stato: APPROVED  
Data: 2026-08-23  
Promotion: AUTHORIZED

## Discovery autonoma

La tranche non è stata prescritta manualmente.

La discovery multi-grado ha rilevato:

- Prima: `COMPLETE` — 33/33 blocchi risolti dal runtime;
- primo grado incompleto: **Seconda**;
- primo segmento incompleto: `Seconda:1`;
- blocchi scoperti: `B01–B04`;
- classificazione del compiler v3: **DIRECT** per tutti e quattro i blocchi;
- ambiguità: nessuna.

## Fonti congelate

- `CAN-PLAN-2` — asset `36ef3be5-925f-4e28-afff-df11097827a9` — generation `a1066c0a-2720-40b0-841e-306cb998ce3e`;
- `CAN-UDA-2-01` — asset `b407c74c-6c04-476e-a444-7262ae830ba0` — generation `8d905b43-7cb7-4640-977f-6b036fa36910`;
- `CAN-PACK-2A` — asset `c0e97e14-eb14-4541-ba14-259df6c8106a` — generation `78ba42d8-f209-4355-bae9-4c9732ea38e4`.

Qualunque source drift invalida questa review.

## Raccordo approvato

| Blocco | Titolo operativo documentato dal PACK | Durata | Prodotto | Evidenza |
| --- | --- | ---: | --- | --- |
| B01 | Il territorio agricolo come sistema | 120 min | Scheda 2A-1 “Leggo un paesaggio agricolo” | riconosce componenti e relazioni del sistema |
| B02 | Il suolo: struttura, funzioni e rischi | 120 min | Scheda 2A-2 “Carta d’identità del suolo” + semplice prova comparativa quando fattibile | distingue proprietà osservabili, dato e interpretazione |
| B03 | Dal campo al prodotto: ciclo colturale e mezzi tecnici | 120 min | Scheda 2A-3 “Dal seme al raccolto” con diagramma di processo | ricostruisce una sequenza produttiva e riconosce input/output |
| B04 | Agricoltura sostenibile: scegliere e motivare | 120 min | Scheda 2A-4 “Tre scelte per una produzione più sostenibile” | formula una scelta tecnica motivata |

Il compiler ha verificato meccanicamente che le quattro lezioni sono in ordine, hanno durata esplicita di due ore e contengono tutte `Attività`, `Prodotto` ed `Evidenza`.

## Autorità delle fonti approvata

### Piano annuale

Resta autorità su:

- collocazione curricolare;
- ordine B01–B04;
- appartenenza a UDA 2-01;
- durata complessiva di 8 ore / quattro blocchi da 2 ore;
- posizione nel percorso annuale.

`CAN-PLAN-2` non assegna titoli o evidenze distinti ai singoli B01–B04: descrive l’intero segmento.

### PACK 2A

È autorità operativa, per questa tranche, su:

- titolo umano della singola lezione;
- attività;
- prodotto;
- evidenza;
- scheda alunno pertinente;
- criteri e materiali esplicitamente documentati.

Questo non modifica l’autorità curricolare del Piano.

### UDA 2-01

Resta autorità semantica e valutativa su:

- finalità e competenze;
- contenuti e abilità;
- compito autentico;
- verifica e valutazione;
- inclusione e raccordi.

L’assenza di una sequenza temporizzata `Fase 1…` nella UDA non viene compensata con fasi inventate: il tempo della singola lezione è già documentato dal PACK e il tempo del segmento dal Piano.

## Adempimento cognitivo — gate approvato

### Docente operativo — SATISFIED

Può ricostruire senza codici tecnici cosa fare, quale prodotto attendere, quale evidenza osservare, quali materiali predisporre e come adattare il compito.

### Alunno / gruppo — SATISFIED

Le schede esplicitano azione, prodotto, domande/criteri e possibilità di controllo/miglioramento; compito significativo, criteri di qualità e rubrica rendono il lavoro comprensibile senza esporre la struttura tecnica delle fonti.

### Revisore professionale-istituzionale — SATISFIED

Può distinguere struttura del Piano, semantica/valutazione della UDA, operatività del PACK, decisione umana e versioni congelate delle fonti.

### Governance — SATISFIED

Responsabilità professionale, decisione, source binding e improvement disposition sono tracciati e verificabili.

### Automazione — SATISFIED

Può derivare deterministicamente grado/segmento, ordine, durata e campi operativi; deve fermarsi se manca una lezione, una durata esplicita, un prodotto, un’evidenza o una sorgente corrente.

## Miglioramento del ciclo

Disposition: `SYSTEM_IMPROVEMENT_APPLIED`.

Miglioramenti generalizzabili già integrati:

1. discovery di portafoglio basata sulla copertura runtime, non su un grado prescritto;
2. compiler v3 `DIRECT` fail-closed per PACK con lezioni 1:1.

## Decisione professionale

> **APPROVATO:** quando il Piano definisce soltanto il segmento e il PACK documenta in modo completo lezioni 1:1, i titoli delle lezioni, le attività, i prodotti e le evidenze operative sono derivati dal PACK; Piano e UDA mantengono rispettivamente autorità strutturale e semantico-valutativa.

Decisione: `APPROVE`.  
Approvata dall’utente in chat il 23 agosto 2026 alle 11:47 Europe/Rome.  
Review package: `HTC-REVIEW-PACKAGE:Seconda:Seconda:1:B01-B04:v1`.
