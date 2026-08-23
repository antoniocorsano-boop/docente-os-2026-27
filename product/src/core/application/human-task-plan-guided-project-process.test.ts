import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildPlanGuidedUdaProjectionDraft } from './human-task-plan-guided-uda-projection-recipe'
import { buildProjectionBatchReview } from './human-task-projection-batch'
import {
  B23_B27_RECIPE_PROPOSALS,
  B23_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B24_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B25_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B26_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
} from './human-task-projection-recipes-b23-b27'

const UDA_105 = `CAN-UDA-1-05 — DAL PROBLEMA AL PROGETTO
Classe prima
Durata prevista: 10 ore.
3. OBIETTIVI DI APPRENDIMENTO
- distinguere bisogno, problema, requisito, vincolo e soluzione;
- formulare in modo semplice un problema progettuale;
- raccogliere dati e informazioni utili prima di proporre una soluzione;
- produrre almeno due ipotesi progettuali;
- confrontare alternative con una semplice matrice di criteri;
- rappresentare la soluzione scelta mediante schizzo, disegno quotato o schema;
- predisporre una sequenza operativa essenziale;
- individuare materiali e strumenti adatti;
- realizzare, quando possibile, un modello fisico o simulato;
- verificare la rispondenza del risultato ai requisiti iniziali;
- motivare eventuali correzioni o miglioramenti.
9. ARTICOLAZIONE DELLE 10 ORE
Fase 1 — Dal bisogno al problema — 2 ore
Analisi di situazioni concrete; distinzione tra bisogno, problema, funzione, requisito e vincolo; formulazione del problema progettuale.
Fase 2 — Cercare informazioni e generare idee — 2 ore
Osservazione di esempi, raccolta di dati utili, produzione guidata di alternative, schizzi preliminari.
Fase 3 — Confrontare e scegliere — 2 ore
Definizione di criteri semplici: funzionalità, fattibilità, materiali, sicurezza, costo indicativo, riduzione degli sprechi. Confronto delle alternative e scelta motivata.
Fase 4 — Rappresentare e pianificare — 2 ore
Disegno della soluzione, indicazione delle misure essenziali, materiali, strumenti e ordine delle operazioni.
Fase 5 — Realizzare, verificare, migliorare — 2 ore
Costruzione o simulazione del modello; prova rispetto ai requisiti; individuazione di difetti, correzioni e possibili miglioramenti; breve presentazione del lavoro.
12. EVIDENZE OSSERVABILI
- Formula o comprende correttamente il problema.
- Individua requisiti e vincoli pertinenti.
- Produce più di una ipotesi.
- Confronta alternative usando criteri espliciti.
- Rappresenta in modo comprensibile la soluzione.
- Sceglie materiali e strumenti coerenti.
- Rispetta la sequenza operativa e le regole di sicurezza.
- Verifica il risultato rispetto ai requisiti.
- Motiva almeno una scelta e un possibile miglioramento.`

const PACK_1C = `CAN-PACK-1C — MICRO-PROGETTO OPEN DAY — CLASSE PRIMA
DURATA INDICATIVA
Monte ore orientativo: 8 ore, rimodulabile in funzione del calendario reale.
RUBRICA DEL MICRO-PROGETTO — 4 LIVELLI
A. DEFINIZIONE DEL PROBLEMA E REQUISITI
Avanzato: problema chiaro, requisiti pertinenti e verificabili.
B. IDEAZIONE E SCELTA
Intermedio: propone due alternative e motiva la scelta.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(blockId: 'B23' | 'B24' | 'B25' | 'B26' | 'B27') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-05', '9c70abfe-9d45-4977-9551-6b745778f248', UDA_105),
    pack: source('CAN-PACK-1C', '2f1da16d-45b4-42aa-841a-09d283d5d96a', PACK_1C),
  })
}

test('B23-B27 all reuse PLAN_GUIDED_UDA without introducing a fifth recipe', () => {
  const review = buildProjectionBatchReview(
    ['B23', 'B24', 'B25', 'B26', 'B27'].map((blockId) => candidate(blockId as 'B23' | 'B24' | 'B25' | 'B26' | 'B27')),
    [...B23_B27_RECIPE_PROPOSALS],
  )

  assert.deepEqual(review.map((item) => [item.blockId, item.status]), [
    ['B23', 'READY_FOR_HUMAN_APPROVAL'],
    ['B24', 'READY_FOR_HUMAN_APPROVAL'],
    ['B25', 'READY_FOR_HUMAN_APPROVAL'],
    ['B26', 'READY_FOR_HUMAN_APPROVAL'],
    ['B27', 'READY_FOR_HUMAN_APPROVAL'],
  ])
})

test('each project block is covered by exactly one two-hour UDA phase and keeps Plan evidence', () => {
  const cases = [
    ['B23', B23_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, /bisogno, problema, funzione, requisito e vincolo/i, 'Brief progettuale.'],
    ['B24', B24_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, /raccolta di dati utili/i, 'Dossier alternative.'],
    ['B25', B25_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, /funzionalità, fattibilità, materiali, sicurezza/i, 'Matrice di scelta motivata.'],
    ['B26', B26_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, /misure essenziali, materiali, strumenti/i, 'Tavola progettuale + piano di lavoro.'],
    ['B27', B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, /prova rispetto ai requisiti/i, 'Dossier completo + presentazione.'],
  ] as const

  for (const [blockId, recipe, instructionPattern, evidence] of cases) {
    const draft = buildPlanGuidedUdaProjectionDraft(candidate(blockId), recipe)
    assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
    assert.ok(draft.projection)
    assert.equal(draft.projection.durationMinutes, 120)
    assert.equal(draft.projection.steps.length, 1)
    assert.equal(draft.projection.steps[0].minutes, null)
    assert.match(draft.projection.steps[0].instruction, instructionPattern)
    assert.equal(draft.projection.evidence, evidence)
    assert.deepEqual(draft.projection.provenance.packs, [])
  }
})

test('the eight-hour Open Day PACK never overrides the ten-hour UDA or two-hour block timing', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B26'), B26_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.equal(draft.projection.durationMinutes, 120)
  assert.equal(draft.projection.steps[0].minutes, null)
  assert.equal(draft.projection.sources, undefined)
  assert.deepEqual(draft.projection.provenance.selectedUdaPhases, [4])
  assert.deepEqual(draft.projection.provenance.selectedPackHeadings, [])
})

test('phase mismatch fails closed instead of borrowing adjacent project hours', () => {
  const invalidRecipe = {
    ...B24_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    operationalPhaseOrdinals: [2, 3],
  }
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B24'), invalidRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((issue) => issue.code === 'GUIDE_DURATION_MISMATCH' && issue.severity === 'BLOCKING'))
})

test('current UDA and PACK generations are part of the candidate fingerprint', () => {
  const current = candidate('B27')
  assert.equal(current.candidateId, B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL.candidateId)

  const drifted = compileHumanTaskContentCandidate('Prima', 'B27', {
    uda: source('CAN-UDA-1-05', 'different-uda-generation', UDA_105),
    pack: source('CAN-PACK-1C', '2f1da16d-45b4-42aa-841a-09d283d5d96a', PACK_1C),
  })
  const draft = buildPlanGuidedUdaProjectionDraft(drifted, B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'INVALID')
  assert.ok(draft.issues.some((issue) => issue.code === 'CANDIDATE_ID_MISMATCH' && issue.severity === 'BLOCKING'))
})

test('B27 closes UDA 1-05 through verification and improvement, not prototype completion alone', () => {
  const draft = buildPlanGuidedUdaProjectionDraft(candidate('B27'), B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.match(draft.projection.steps[0].instruction, /individuazione di difetti, correzioni e possibili miglioramenti/i)
  assert.deepEqual(draft.projection.observation, [
    'Rispetta la sequenza operativa e le regole di sicurezza.',
    'Verifica il risultato rispetto ai requisiti.',
    'Motiva almeno una scelta e un possibile miglioramento.',
  ])
  assert.match(draft.projection.assessmentNote, /proposta di miglioramento/i)
})
