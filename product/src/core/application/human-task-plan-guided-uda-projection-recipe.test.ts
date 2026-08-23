import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildPlanGuidedUdaProjectionDraft } from './human-task-plan-guided-uda-projection-recipe'
import { buildProjectionBatchReview } from './human-task-projection-batch'
import {
  B16_B19_RECIPE_PROPOSALS,
  B16_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B19_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
} from './human-task-projection-recipes-b16-b19'
import {
  B20_B22_RECIPE_PROPOSALS,
  B20_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B21_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B22_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
} from './human-task-projection-recipes-b20-b22'

const UDA_103 = `CAN-UDA-1-03 — DISEGNARE PER COMPRENDERE E COMUNICARE
Classe prima
Durata prevista: 14 ore.
3. OBIETTIVI DI APPRENDIMENTO
- riconoscere funzione e uso di matita, righe, squadre, compasso e altri strumenti di base;
- organizzare correttamente il foglio e lo spazio grafico;
- tracciare linee parallele, perpendicolari e inclinate;
- costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane;
- effettuare semplici misurazioni e riportare misure in modo ordinato;
- comprendere il significato di scala, proporzione e convenzione grafica in situazioni elementari;
- distinguere disegno libero, geometrico e tecnico;
- utilizzare semplici procedure di rappresentazione anche con strumenti digitali, ove disponibili.
7. ARTICOLAZIONE DELLE 14 ORE
Fase 1 — Il disegno come linguaggio tecnico — 2 ore
Osservazione di rappresentazioni diverse dello stesso oggetto; distinzione fra disegno libero, geometrico e tecnico; funzione delle convenzioni.
Fase 2 — Strumenti, postura, precisione e organizzazione del foglio — 2 ore
Uso di righe, squadre, compasso e matite; esercizi di controllo del tratto; impostazione ordinata della tavola.
Fase 3 — Linee, parallelismo e perpendicolarità — 2 ore
Esercitazioni progressive e controllo degli errori.
Fase 4 — Segmenti, angoli, assi e bisettrici — 2 ore
Costruzioni geometriche guidate con verbalizzazione delle procedure.
Fase 5 — Figure geometriche piane — 4 ore
Costruzioni di triangoli, quadrilateri e poligoni regolari selezionati; uso delle proprietà geometriche per verificare il risultato.
Fase 6 — Tavola di sintesi e verifica — 2 ore
Realizzazione di un elaborato individuale contenente più costruzioni e breve autovalutazione finale.
12. EVIDENZE OSSERVABILI
- scelta e uso appropriato degli strumenti;
- rispetto della sequenza operativa;
- precisione di linee, intersezioni e costruzioni;
- ordine e leggibilità della tavola;
- capacità di riconoscere e correggere errori;
- uso corretto del lessico geometrico-tecnico;
- progressiva autonomia operativa.`

const PACK_1B = `CAN-PACK-1B — MATERIALI E AVVIO AL DISEGNO TECNICO PER L’OPEN DAY
7. LEZIONE 10 — FIGURA GEOMETRICA COME PROGETTO (2 h)
Attività: costruzione di una semplice composizione geometrica vincolata da misure/consegne; prima riflessione su requisiti e vincoli.
Prodotto: TAVOLA L — Composizione geometrica controllata.
Evidenza: interpretazione della consegna, controllo delle misure, leggibilità.`

const UDA_104 = `CAN-UDA-1-04 — RIFIUTI, RECUPERO ED ECONOMIA CIRCOLARE
Classe prima
Durata prevista: 6 ore.
3. OBIETTIVI DI APPRENDIMENTO
- riconoscere le principali tipologie di rifiuto in relazione al materiale di origine;
- distinguere prevenzione, riduzione, riuso, recupero, riciclo e smaltimento;
- leggere semplici simboli e indicazioni presenti su imballaggi e contenitori;
- ricostruire in forma schematica il percorso di un materiale dopo l’uso;
- confrontare il modello lineare di produzione e consumo con il modello circolare;
- individuare comportamenti di consumo responsabile applicabili alla vita quotidiana;
- raccogliere, classificare e rappresentare semplici dati relativi ai rifiuti;
- motivare una scelta di riduzione, riuso o riciclo con argomentazioni tecniche elementari.
9. ARTICOLAZIONE DELLE ATTIVITÀ — 6 ORE
Fase 1 — Dal prodotto al rifiuto — 1 ora
Richiamo dell’UDA sui materiali. Osservazione di oggetti e imballaggi. Individuazione delle condizioni in cui un prodotto diventa rifiuto. Discussione guidata sul concetto di fine vita.
Fase 2 — Ridurre, riusare, recuperare, riciclare — 1 ora
Costruzione condivisa del lessico essenziale. Classificazione di esempi reali. Confronto tra azioni diverse e riflessione sulla gerarchia delle scelte.
Fase 3 — Come funziona una filiera di recupero — 1 ora
Ricostruzione semplificata del percorso di carta, vetro, metallo, plastica o altro materiale significativo. Schema input-processo-output e individuazione delle trasformazioni principali.
Fase 4 — Dal modello lineare al modello circolare — 1 ora
Confronto tra “estrai-produci-usa-getta” e “riduci-riusa-recupera-ricicla”. Costruzione di un diagramma circolare e discussione sugli effetti ambientali delle diverse scelte.
Fase 5 — Laboratorio di analisi — 1 ora
Analisi di prodotti e imballaggi. Raccolta di dati, lettura di simboli, classificazione dei materiali, individuazione delle possibilità di recupero. Preparazione del prodotto finale.
Fase 6 — Compito significativo e verifica — 1 ora
Completamento e presentazione della scheda “Dallo scarto alla nuova risorsa”. Breve prova individuale di verifica e autovalutazione.
12. EVIDENZE OSSERVABILI
- Classifica correttamente materiali e rifiuti in situazioni note.
- Distingue riuso, recupero, riciclo e smaltimento.
- Ricostruisce il percorso essenziale di un materiale dopo l’uso.
- Riconosce il principio di circolarità.
- Utilizza dati e informazioni pertinenti.
- Motiva comportamenti di riduzione degli sprechi.
- Collabora nel lavoro di gruppo rispettando consegne e ruoli.`

const PACK_1E = `Dallo scarto alla nuova risorsa
Pacchetto operativo CAN-PACK-1E · Classe prima · Supporto a CAN-UDA-1-04
Percorso operativo
1. Oggetto, materiale e fine vita
La classe osserva oggetti e imballaggi puliti.
2. Classificare le possibili scelte
Gli studenti associano situazioni concrete a prevenzione, riduzione, riuso, recupero, riciclo o smaltimento.
3. Ricostruire una filiera
Si sceglie un materiale significativo e se ne ricostruisce il percorso essenziale.
4. Laboratorio «Dallo scarto alla nuova risorsa»
Ogni gruppo analizza da tre a cinque oggetti o imballaggi.
5. Controllo e restituzione
Un altro gruppo verifica la coerenza delle scelte.
Scheda «Dallo scarto alla nuova risorsa»
- Oggetto o imballaggio: ____________________
- Funzione: ____________________
- Materiale o materiali prevalenti: ____________________
- Quando diventa rifiuto: ____________________
- Modalità di raccolta o conferimento verificata: ____________________
- Possibile riuso: ____________________
- Recupero o riciclo ipotizzato: ____________________
- Percorso circolare: ____________________
- Azione utile per prevenire o ridurre il rifiuto: ____________________
- Motivazione della scelta: ____________________
Compito autentico
Produrre una scheda o un breve dossier su tre-cinque oggetti di uso comune.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function drawingCandidate(blockId: 'B16' | 'B17' | 'B18' | 'B19') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-03', '296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c', UDA_103),
    pack: source('CAN-PACK-1B', '1902bdd3-c65f-46c0-b419-99bcd45131ad', PACK_1B),
  })
}

function circularCandidate(blockId: 'B20' | 'B21' | 'B22') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-04', 'da460375-d194-42ca-843b-078e73b5b814', UDA_104),
    pack: source('CAN-PACK-1E', '04127af9-0d75-41c1-a190-1fdbf480b1da', PACK_1E),
  })
}

test('batch dispatcher prepares B16-B19 with PLAN_GUIDED_UDA recipes', () => {
  const review = buildProjectionBatchReview(
    ['B16', 'B17', 'B18', 'B19'].map((blockId) => drawingCandidate(blockId as 'B16' | 'B17' | 'B18' | 'B19')),
    [...B16_B19_RECIPE_PROPOSALS],
  )
  assert.deepEqual(review.map((item) => [item.blockId, item.status]), [
    ['B16', 'READY_FOR_HUMAN_APPROVAL'],
    ['B17', 'READY_FOR_HUMAN_APPROVAL'],
    ['B18', 'READY_FOR_HUMAN_APPROVAL'],
    ['B19', 'READY_FOR_HUMAN_APPROVAL'],
  ])
})

test('B16 uses the exact two-hour UDA phase while keeping the Plan evidence', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(drawingCandidate('B16'), B16_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.equal(draft.projection.steps.length, 1)
  assert.equal(draft.projection.steps[0].minutes, null)
  assert.match(draft.projection.steps[0].instruction, /Costruzioni geometriche guidate con verbalizzazione delle procedure/i)
  assert.equal(draft.projection.evidence, 'Tavola procedurale.')
  assert.deepEqual(draft.projection.provenance.packs, [])
})

test('B17 and B18 share the four-hour UDA phase but Plan disambiguates their distinct two-hour tasks', () => {
  const b17 = buildPlanGuidedUdaProjectionDraft(drawingCandidate('B17'), B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  const b18 = buildPlanGuidedUdaProjectionDraft(drawingCandidate('B18'), B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(b17.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.equal(b18.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(b17.projection)
  assert.ok(b18.projection)
  assert.equal(b17.projection.steps[0].instruction, 'Triangoli e quadrilateri selezionati.')
  assert.equal(b18.projection.steps[0].instruction, 'Poligoni regolari selezionati, procedure e controllo.')
  assert.equal(b17.projection.evidence, 'Tavola grafica controllata.')
  assert.equal(b18.projection.evidence, 'Tavola grafica.')
  assert.deepEqual(b17.projection.steps.map((step) => step.minutes), [null])
  assert.deepEqual(b18.projection.steps.map((step) => step.minutes), [null])
})

test('phase coverage must account for all four hours of the shared UDA phase', () => {
  const invalidRecipe = {
    ...B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    phaseCoverageBlockIds: ['B17'],
  }
  const draft = buildPlanGuidedUdaProjectionDraft(drawingCandidate('B17'), invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((item) => item.code === 'GUIDE_DURATION_MISMATCH' && item.severity === 'BLOCKING'))
})

test('plan generation drift invalidates the recipe without changing the existing candidate fingerprint', () => {
  const invalidRecipe = {
    ...B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    planSource: {
      ...B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL.planSource,
      generationId: 'different-plan-generation',
    },
  }
  const currentCandidate = drawingCandidate('B18')
  assert.equal(currentCandidate.candidateId, B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL.candidateId)
  const draft = buildPlanGuidedUdaProjectionDraft(currentCandidate, invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((item) => item.code === 'PLAN_BINDING_MISMATCH' && item.severity === 'BLOCKING'))
})

test('B19 keeps the Plan-specific final evidence instead of reducing it to a generic UDA indicator', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(drawingCandidate('B19'), B19_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.equal(draft.projection.steps[0].instruction, 'Elaborato individuale con più costruzioni e autovalutazione.')
  assert.equal(draft.projection.evidence, 'Tavola VAL + breve prova.')
  assert.deepEqual(draft.projection.observation, [
    'rispetto della sequenza operativa;',
    'precisione di linee, intersezioni e costruzioni;',
    'ordine e leggibilità della tavola;',
    'capacità di riconoscere e correggere errori;',
  ])
})

test('B20-B22 reuse PLAN_GUIDED_UDA by pairing consecutive one-hour phases into exact two-hour blocks', () => {
  const review = buildProjectionBatchReview(
    ['B20', 'B21', 'B22'].map((blockId) => circularCandidate(blockId as 'B20' | 'B21' | 'B22')),
    [...B20_B22_RECIPE_PROPOSALS],
  )
  assert.deepEqual(review.map((item) => [item.blockId, item.status]), [
    ['B20', 'READY_FOR_HUMAN_APPROVAL'],
    ['B21', 'READY_FOR_HUMAN_APPROVAL'],
    ['B22', 'READY_FOR_HUMAN_APPROVAL'],
  ])
  for (const item of review) {
    assert.ok(item.draft?.projection)
    assert.equal(item.draft.projection.steps.length, 2)
    assert.deepEqual(item.draft.projection.steps.map((step) => step.minutes), [null, null])
  }
})

test('B20 derives two operational steps from UDA phases 1 and 2 and keeps the Plan evidence', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(circularCandidate('B20'), B20_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.deepEqual(draft.projection.provenance.selectedUdaPhases, [1, 2])
  assert.match(draft.projection.steps[0].title, /Dal prodotto al rifiuto/i)
  assert.match(draft.projection.steps[1].title, /Ridurre, riusare, recuperare, riciclare/i)
  assert.equal(draft.projection.evidence, 'Classificazione e schema iniziale.')
  assert.deepEqual(draft.projection.provenance.packs, [])
})

test('B21 pairs recovery-chain and circular-model phases without inventing internal timing', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(circularCandidate('B21'), B21_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.deepEqual(draft.projection.provenance.selectedUdaPhases, [3, 4])
  assert.match(draft.projection.steps[0].instruction, /Schema input-processo-output/i)
  assert.match(draft.projection.steps[1].instruction, /diagramma circolare/i)
  assert.equal(draft.projection.evidence, 'Diagramma circolare + dati essenziali.')
})

test('B22 keeps timing from UDA phases but exposes the PACK worksheet as a task resource', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(circularCandidate('B22'), B22_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.deepEqual(draft.projection.provenance.selectedUdaPhases, [5, 6])
  assert.deepEqual(draft.projection.provenance.packs.map((pack) => pack.code), ['CAN-PACK-1E'])
  assert.deepEqual(draft.projection.resources.map((resource) => resource.id), ['STUDENT-CIRCULAR-LIFE'])
  assert.deepEqual(draft.projection.steps[0].resourceIds, ['STUDENT-CIRCULAR-LIFE'])
  assert.deepEqual(draft.projection.steps[1].resourceIds, ['STUDENT-CIRCULAR-LIFE'])
  assert.ok(draft.projection.resources[0].prompts.some((prompt) => /conferimento verificata/i.test(prompt)))
  assert.equal(draft.projection.evidence, 'Scheda/dossier + breve verifica.')
})

test('multi-phase PLAN_GUIDED_UDA fails closed if selected phases do not exactly cover the block', () => {
  const invalidRecipe = {
    ...B20_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    operationalPhaseOrdinals: [1],
  }
  const draft = buildPlanGuidedUdaProjectionDraft(circularCandidate('B20'), invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((item) => item.code === 'GUIDE_DURATION_MISMATCH' && item.severity === 'BLOCKING'))
})
