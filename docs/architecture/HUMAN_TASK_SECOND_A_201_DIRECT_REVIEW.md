# DOCENTE OS — Human Task Review · Classe seconda · UDA 2-01

Stato: READY_FOR_HUMAN_REVIEW  
Data: 2026-08-23  
Promotion: HUMAN_APPROVAL_REQUIRED

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

## Raccordo proposto

| Blocco | Titolo operativo documentato dal PACK | Durata | Prodotto | Evidenza |
| --- | --- | ---: | --- | --- |
| B01 | Il territorio agricolo come sistema | 120 min | Scheda 2A-1 “Leggo un paesaggio agricolo” | riconosce componenti e relazioni del sistema |
| B02 | Il suolo: struttura, funzioni e rischi | 120 min | Scheda 2A-2 “Carta d’identità del suolo” + semplice prova comparativa quando fattibile | distingue proprietà osservabili, dato e interpretazione |
| B03 | Dal campo al prodotto: ciclo colturale e mezzi tecnici | 120 min | Scheda 2A-3 “Dal seme al raccolto” con diagramma di processo | ricostruisce una sequenza produttiva e riconosce input/output |
| B04 | Agricoltura sostenibile: scegliere e motivare | 120 min | Scheda 2A-4 “Tre scelte per una produzione più sostenibile” | formula una scelta tecnica motivata |

Il compiler ha verificato meccanicamente che le quattro lezioni sono in ordine, hanno durata esplicita di due ore e contengono tutte `Attività`, `Prodotto` ed `Evidenza`.

## Autorità delle fonti proposta

### Piano annuale

Resta autorità su:

- collocazione curricolare;
- ordine B01–B04;
- appartenenza a UDA 2-01;
- durata complessiva di 8 ore / quattro blocchi da 2 ore;
- posizione nel percorso annuale.

`CAN-PLAN-2` non assegna titoli o evidenze distinti ai singoli B01–B04: descrive l’intero segmento.

### PACK 2A

Diventa autorità operativa, per questa tranche, su:

- titolo umano della singola lezione;
- attività;
- prodotto;
- evidenza;
- scheda alunno pertinente;
- criteri e materiali esplicitamente documentati.

Questo non modifica il Piano e non trasforma il PACK in autorità curricolare.

### UDA 2-01

Resta autorità semantica e valutativa su:

- finalità e competenze;
- contenuti e abilità;
- compito autentico;
- verifica e valutazione;
- inclusione e raccordi.

L’assenza di una sequenza temporizzata `Fase 1…` nella UDA non viene compensata con fasi inventate: il tempo della singola lezione è già documentato dal PACK e il tempo del segmento dal Piano.

## Adempimento cognitivo — pre-gate

### Docente operativo — READY

Può ricostruire senza codici tecnici:

- cosa fare in ciascuna lezione;
- quale scheda/prodotto attendere;
- quale evidenza osservare;
- quali materiali predisporre;
- come adattare il compito per inclusione, recupero e potenziamento.

### Alunno / gruppo — READY

Le quattro schede esplicitano domande, campi da completare, diagrammi o scelte da motivare. Il PACK aggiunge un compito significativo, criteri di qualità e rubrica a quattro livelli. L’alunno può quindi comprendere azione, prodotto, controllo e miglioramento senza conoscere Piano, UDA o codici CAN.

### Revisore professionale-istituzionale — READY

Può distinguere:

- struttura documentata dal Piano;
- semantica/valutazione documentata dalla UDA;
- operatività documentata dal PACK;
- proposta del compiler;
- futura approvazione umana.

Asset e generation sono congelati nella review.

### Automazione — READY

Può derivare deterministicamente:

- primo grado e segmento incompleti;
- ordine delle quattro lezioni;
- durata 120 minuti per ciascuna;
- attività/prodotto/evidenza dai campi del PACK.

Deve fermarsi se manca una lezione, una durata esplicita, un prodotto, un’evidenza o una sorgente corrente.

## Miglioramento del ciclo

Disposition proposta: `SYSTEM_IMPROVEMENT_APPLIED`.

Il ciclo ha prodotto due miglioramenti generalizzabili già integrati:

1. discovery di portafoglio basata sulla copertura runtime, non su un grado prescritto;
2. compiler v3 `DIRECT` fail-closed per PACK con lezioni 1:1.

## Decisione professionale residua

Serve una sola decisione umana:

> **Approvare che, quando il Piano definisce soltanto il segmento e il PACK documenta in modo completo lezioni 1:1, i titoli delle lezioni, le attività, i prodotti e le evidenze operative siano derivati dal PACK, mentre Piano e UDA mantengono rispettivamente autorità strutturale e semantico-valutativa.**

Se approvata, il sistema può produrre le proiezioni B01–B04, applicare il gate cognitivo completo, creare i manifest approvati e poi riscoprire autonomamente la tranche successiva.

Decisione corrente: `PENDING`.
