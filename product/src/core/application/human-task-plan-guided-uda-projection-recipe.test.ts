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

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(blockId: 'B16' | 'B17' | 'B18' | 'B19') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-03', '296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c', UDA_103),
    pack: source('CAN-PACK-1B', '1902bdd3-c65f-46c0-b419-99bcd45131ad', PACK_1B),
  })
}

test('batch dispatcher prepares B16-B19 with PLAN_GUIDED_UDA recipes', () => {
  const review = buildProjectionBatchReview(
    ['B16', 'B17', 'B18', 'B19'].map((blockId) => candidate(blockId as 'B16' | 'B17' | 'B18' | 'B19')),
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
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B16'), B16_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.equal(draft.projection.steps.length, 1)
  assert.equal(draft.projection.steps[0].minutes, null)
  assert.match(draft.projection.steps[0].instruction, /Costruzioni geometriche guidate con verbalizzazione delle procedure/i)
  assert.equal(draft.projection.evidence, 'Tavola procedurale.')
  assert.deepEqual(draft.projection.provenance.packs, [])
})

test('B17 and B18 share the four-hour UDA phase but Plan disambiguates their distinct two-hour tasks', () => {
  const b17 = buildPlanGuidedUdaProjectionDraft(candidate('B17'), B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  const b18 = buildPlanGuidedUdaProjectionDraft(candidate('B18'), B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
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
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B17'), invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((issue) => issue.code === 'GUIDE_DURATION_MISMATCH' && issue.severity === 'BLOCKING'))
})

test('plan generation drift invalidates the recipe without changing the existing candidate fingerprint', () => {
  const invalidRecipe = {
    ...B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    planSource: {
      ...B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL.planSource,
      generationId: 'different-plan-generation',
    },
  }
  const currentCandidate = candidate('B18')
  assert.equal(currentCandidate.candidateId, B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL.candidateId)
  const draft = buildPlanGuidedUdaProjectionDraft(currentCandidate, invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((issue) => issue.code === 'PLAN_BINDING_MISMATCH' && issue.severity === 'BLOCKING'))
})

test('B19 keeps the Plan-specific final evidence instead of reducing it to a generic UDA indicator', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B19'), B19_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
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
