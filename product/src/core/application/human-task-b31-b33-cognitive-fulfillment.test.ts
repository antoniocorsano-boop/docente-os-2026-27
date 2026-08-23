import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildPlanGuidedUdaProjectionDraftWithEvidence } from './human-task-plan-guided-evidence-source'
import {
  B31_B33_RECIPE_PROPOSALS,
  B31_EVIDENCE_BINDING,
  B31_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B33_EVIDENCE_BINDING,
  B33_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
} from './human-task-projection-recipes-b31-b33'
import { assessPlanGuidedStakeholderCognition } from './human-task-stakeholder-cognition-assessor'
import { isHumanTaskStakeholderCognitiveReviewComplete } from './human-task-stakeholder-cognition'

const UDA_107 = `CAN-UDA-1-07 — PROGETTO TECNOLOGICO SOSTENIBILE
Classe prima
Durata prevista: 6 ore.
4. OBIETTIVI DI APPRENDIMENTO
- riconoscere vincoli e opportunità presenti in una situazione problematica;
- formulare semplici criteri di qualità della soluzione;
- produrre schizzi e rappresentazioni essenziali;
- selezionare materiali privilegiando, quando possibile, riduzione degli sprechi, riuso, riciclabilità e durata;
- organizzare le fasi operative secondo una sequenza logica;
- utilizzare dati semplici per motivare una scelta;
- riconoscere possibili effetti ambientali della soluzione progettata;
- comunicare il progetto con linguaggio tecnico essenziale.
8. ARTICOLAZIONE OPERATIVA — 6 ORE
Fase 1 — Problema e requisiti — 1 ora.
Presentazione di un problema concreto riferito alla vita scolastica o quotidiana. Individuazione di destinatari, funzione, requisiti, vincoli e criteri di sostenibilità.
Fase 2 — Idee e confronto — 1 ora.
Produzione di più ipotesi, schizzi rapidi e confronto mediante criteri quali utilità, semplicità, quantità di materiale, possibilità di riuso, durata e facilità di realizzazione.
Fase 3 — Progetto della soluzione — 1 ora.
Scelta motivata dell’ipotesi; rappresentazione grafica; definizione di dimensioni essenziali; elenco di materiali, strumenti e fasi operative.
Fase 4 — Modello/prototipo o simulazione — 1 ora.
Realizzazione guidata di un modello semplice, oppure simulazione documentata quando tempi, sicurezza o materiali non consentano la costruzione fisica.
Fase 5 — Verifica e miglioramento — 1 ora.
Controllo del risultato rispetto ai requisiti iniziali; rilevazione di criticità; proposta di almeno un miglioramento tecnico o ambientale.
Fase 6 — Comunicazione e valutazione — 1 ora.
Presentazione del progetto, restituzione individuale, autovalutazione e verifica finale.
10. PRODOTTO ATTESO
Dossier progettuale composto almeno da:
- scheda del problema;
- requisiti e vincoli;
- schizzi delle alternative;
- scelta motivata;
- rappresentazione grafica della soluzione;
- elenco materiali e strumenti;
- sequenza delle fasi;
- eventuale modello/prototipo;
- breve valutazione di sostenibilità;
- autovalutazione finale.
11. EVIDENZE OSSERVABILI
- identifica correttamente il problema e la funzione della soluzione;
- considera requisiti e vincoli;
- propone e confronta alternative;
- sceglie materiali coerenti;
- rappresenta il progetto con chiarezza adeguata al livello;
- organizza una sequenza operativa plausibile;
- valuta almeno alcuni aspetti ambientali;
- utilizza dati o criteri per motivare decisioni;
- comunica in modo comprensibile il processo seguito;
- collabora e rispetta materiali, tempi e consegne.
12. VERIFICA E VALUTAZIONE
Valutazione formativa durante le fasi di ideazione, confronto, progettazione e realizzazione. Valutazione finale del dossier/prodotto e della presentazione. La valutazione considera sia il prodotto sia il processo.`

const PACK_1D = `CAN-PACK-1D — ALLESTIMENTO E CONDUZIONE OPEN DAY — CLASSE PRIMA
FUNZIONE DEL PACCHETTO
Regia logistica e didattica dell’Open Day. Non sostituisce le UDA: organizza la loro restituzione pubblica.
13. OSSERVAZIONE E VALUTAZIONE DURANTE L’OPEN DAY
L’Open Day non genera automaticamente un voto autonomo.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(blockId: 'B31' | 'B32' | 'B33') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1', UDA_107),
    pack: source('CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29', PACK_1D),
  })
}

test('B31-B33 derive evidence from the current UDA and never promote CAN-PACK-1D as a didactic source', () => {
  const outputs = B31_B33_RECIPE_PROPOSALS.map(({ recipe, evidence }) =>
    buildPlanGuidedUdaProjectionDraftWithEvidence(candidate(recipe.blockId as 'B31' | 'B32' | 'B33'), recipe, evidence),
  )

  assert.deepEqual(outputs.map((item) => item.draft.status), [
    'READY_FOR_HUMAN_APPROVAL',
    'READY_FOR_HUMAN_APPROVAL',
    'READY_FOR_HUMAN_APPROVAL',
  ])
  assert.deepEqual(outputs.map((item) => item.draft.projection?.provenance.selectedUdaPhases), [
    [1, 2],
    [3, 4],
    [5, 6],
  ])
  assert.deepEqual(outputs.map((item) => item.evidenceBinding.source), [
    'UDA_SECTION_ITEMS',
    'UDA_SECTION_ITEMS',
    'UDA_PHASES',
  ])
  assert.equal(outputs[0].evidenceBinding.text, 'scheda del problema · requisiti e vincoli · schizzi delle alternative')
  assert.match(outputs[1].evidenceBinding.text, /scelta motivata.*rappresentazione grafica.*elenco materiali.*sequenza delle fasi.*modello\/prototipo/i)
  assert.match(outputs[2].evidenceBinding.text, /Controllo del risultato rispetto ai requisiti iniziali.*Presentazione del progetto.*autovalutazione/i)
  assert.equal(outputs.every((item) => item.draft.projection?.provenance.packs.length === 0), true)
  assert.equal(outputs.every((item) => /Evidenza operativa: derivata deterministicamente da/i.test(item.draft.projection?.sourceAlignment.note ?? '')), true)
})

test('B31-B33 satisfy the contextual stakeholder cognitive gate from the actual projections', () => {
  const outputs = B31_B33_RECIPE_PROPOSALS.map(({ recipe, evidence }) =>
    buildPlanGuidedUdaProjectionDraftWithEvidence(candidate(recipe.blockId as 'B31' | 'B32' | 'B33'), recipe, evidence),
  )
  const review = assessPlanGuidedStakeholderCognition(outputs)

  assert.equal(isHumanTaskStakeholderCognitiveReviewComplete(review), true)
  assert.deepEqual(review.assessments.map((item) => [item.stakeholder, item.status]), [
    ['TEACHER_OPERATOR', 'SATISFIED'],
    ['LEARNER', 'SATISFIED'],
    ['PROFESSIONAL_REVIEWER', 'SATISFIED'],
    ['ASSISTED_AUTOMATION', 'SATISFIED'],
  ])
})

test('UDA phase evidence fails closed when it cites phases outside the current block recipe', () => {
  assert.equal(B33_EVIDENCE_BINDING.source, 'UDA_PHASES')
  assert.throws(() => buildPlanGuidedUdaProjectionDraftWithEvidence(
    candidate('B33'),
    B33_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    {
      source: 'UDA_PHASES',
      rationale: B33_EVIDENCE_BINDING.rationale,
      phaseOrdinals: [4, 6],
    },
  ), /fasi operative/i)
})

test('UDA section evidence fails closed when a declared product item is not in the current source', () => {
  assert.equal(B31_EVIDENCE_BINDING.source, 'UDA_SECTION_ITEMS')
  assert.throws(() => buildPlanGuidedUdaProjectionDraftWithEvidence(
    candidate('B31'),
    B31_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
    {
      source: 'UDA_SECTION_ITEMS',
      sectionHeading: B31_EVIDENCE_BINDING.sectionHeading,
      itemIndexes: [1, 99],
      rationale: B31_EVIDENCE_BINDING.rationale,
    },
  ), /voce 99/i)
})
