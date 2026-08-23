import assert from 'node:assert/strict'
import test from 'node:test'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import { discoverHumanTaskPortfolioFrontier } from './human-task-portfolio-discovery'
import { compileHumanTaskTrancheReviewWithDirectPack } from './human-task-tranche-compiler-direct-extension'

const UDA_2_01 = `CAN-UDA-2-01 — AGRICOLTURA, SUOLO E PRODUZIONI SOSTENIBILI
Classe seconda — Tecnologia — Scuola secondaria di primo grado
Raccordo: CAN-PRG-2 — Periodo: settembre/ottobre — Durata prevista: 8 ore
SENSO DELL’UNITÀ
Comprendere l’agricoltura come sistema tecnologico che mette in relazione suolo, acqua, clima, lavoro, macchine, produzioni e impatti ambientali.
COMPETENZE PRIORITARIE
Analizzare una semplice filiera agricola.
Riconoscere relazioni tra risorse, tecniche produttive e sostenibilità.
ATTIVITÀ
Osservazione guidata di prodotti e filiere.
Analisi di immagini, schemi e dati essenziali.
Costruzione di una mappa del sistema agricolo.
Confronto tra pratiche produttive e relativi impatti.
PRODOTTO AUTENTICO
Scheda visuale di una filiera agricola sostenibile con fasi, risorse, criticità e proposta di miglioramento.
EVIDENZE E VERIFICA
Correttezza della sequenza di filiera; uso del lessico tecnologico; qualità delle relazioni individuate; motivazione della proposta. Verifica mediante osservazioni sistematiche, elaborato, breve prova strutturata e restituzione orale.
INCLUSIONE
Consegne segmentate, anticipazione del lessico, mappe e immagini, modelli guidati, possibilità di prodotto multimodale e valutazione centrata sui nuclei essenziali.`

const PACK_2A = `CAN-PACK-2A — AGRICOLTURA, SUOLO E PRODUZIONI SOSTENIBILI
Classe seconda — Tecnologia — a.s. 2026/2027
FUNZIONE
Pacchetto operativo per l’attuazione di CAN-PRG-2 / UDA 1.

LEZIONE 1 — Il territorio agricolo come sistema — 2 ore
Attività: lettura guidata di immagini/casi; individuazione di suolo, acqua, colture, infrastrutture, macchine, lavoro umano, energia, input e output.
Prodotto: Scheda 2A-1 “Leggo un paesaggio agricolo”.
Evidenza: riconosce componenti e relazioni del sistema.

LEZIONE 2 — Il suolo: struttura, funzioni e rischi — 2 ore
Attività: osservazione di campioni o immagini; tessitura, porosità, permeabilità, sostanza organica; erosione e consumo di suolo.
Prodotto: Scheda 2A-2 “Carta d’identità del suolo” + semplice prova comparativa quando fattibile.
Evidenza: distingue proprietà osservabili, dato e interpretazione.

LEZIONE 3 — Dal campo al prodotto: ciclo colturale e mezzi tecnici — 2 ore
Attività: ordinare le fasi di una coltura; associare operazioni, macchine/attrezzi, acqua, energia, fertilizzazione e protezione delle colture.
Prodotto: Scheda 2A-3 “Dal seme al raccolto” con diagramma di processo.
Evidenza: ricostruisce una sequenza produttiva e riconosce input/output.

LEZIONE 4 — Agricoltura sostenibile: scegliere e motivare — 2 ore
Attività: confronto tra pratiche; rotazioni, riduzione degli sprechi idrici, tutela del suolo, biodiversità, riduzione degli input, recupero degli scarti, precisione nell’uso delle risorse.
Prodotto: Scheda 2A-4 “Tre scelte per una produzione più sostenibile”.
Evidenza: formula una scelta tecnica motivata.`

function source(code: string, assetId: string, generationId: string, normalizedText: string): HumanTaskPipelineSource {
  return { code, assetId, generationId, title: code, normalizedText }
}

const CURRENT_SOURCES = [
  source('CAN-UDA-2-01', 'b407c74c-6c04-476e-a444-7262ae830ba0', '8d905b43-7cb7-4640-977f-6b036fa36910', UDA_2_01),
  source('CAN-PACK-2A', 'c0e97e14-eb14-4541-ba14-259df6c8106a', '78ba42d8-f209-4355-bae9-4c9732ea38e4', PACK_2A),
]

/** Replays the pre-promotion classifier contract explicitly; runtime coverage no longer represents that historical state. */
function compilePrePromotion(sources = CURRENT_SOURCES) {
  return compileHumanTaskTrancheReviewWithDirectPack({
    grade: 'Seconda',
    coveredBlockIds: [],
    sources,
  })
}

test('portfolio discovery completes Prima and now advances Seconda coverage through B08', () => {
  const frontier = discoverHumanTaskPortfolioFrontier()
  const prima = frontier.grades.find((item) => item.grade === 'Prima')
  assert.ok(prima)
  assert.equal(prima.complete, true)
  assert.equal(prima.coveredBlockIds.length, 33)
  assert.equal(frontier.nextGrade, 'Seconda')
  assert.deepEqual(frontier.coveredBlockIds, ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08'])
})

test('compiler v3 historical contract proves the approved Seconda:1 DIRECT 1:1 alignment', () => {
  const review = compilePrePromotion()
  assert.equal(review.compilerVersion, 3)
  assert.equal(review.grade, 'Seconda')
  assert.equal(review.segmentKey, 'Seconda:1')
  assert.deepEqual(review.blockIds, ['B01', 'B02', 'B03', 'B04'])
  assert.equal(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.equal(review.directAlignment.status, 'READY')
  assert.deepEqual(review.items.map((item) => item.proposedRecipe), ['DIRECT', 'DIRECT', 'DIRECT', 'DIRECT'])
  assert.deepEqual(review.directAlignment.blocks.map((item) => item.durationMinutes), [120, 120, 120, 120])
  assert.equal(review.directAlignment.blocks.every((item) => Boolean(item.activity && item.product && item.evidence)), true)
})

test('DIRECT preserves approved source generations in the historical review receipt', () => {
  const review = compilePrePromotion()
  assert.deepEqual(review.sourceBindings.map((item) => [item.code, item.generationId]), [
    ['CAN-PACK-2A', '78ba42d8-f209-4355-bae9-4c9732ea38e4'],
    ['CAN-UDA-2-01', '8d905b43-7cb7-4640-977f-6b036fa36910'],
  ])
})

test('a missing PACK evidence fails closed instead of being synthesized', () => {
  const brokenPack = PACK_2A.replace('Evidenza: ricostruisce una sequenza produttiva e riconosce input/output.', '')
  const review = compilePrePromotion([CURRENT_SOURCES[0], { ...CURRENT_SOURCES[1], normalizedText: brokenPack }])
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.match(review.directAlignment.note, /Attività, Prodotto ed Evidenza/i)
})

test('a non-explicit two-hour lesson duration fails closed', () => {
  const brokenPack = PACK_2A.replace('LEZIONE 2 — Il suolo: struttura, funzioni e rischi — 2 ore', 'LEZIONE 2 — Il suolo: struttura, funzioni e rischi')
  const review = compilePrePromotion([CURRENT_SOURCES[0], { ...CURRENT_SOURCES[1], normalizedText: brokenPack }])
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.match(review.directAlignment.note, /durata non viene inferita/i)
})

test('a non phase-structured UDA is tolerated only when DIRECT is otherwise complete', () => {
  const ready = compilePrePromotion()
  assert.equal(ready.status, 'READY_FOR_HUMAN_REVIEW')
  const incompletePack = PACK_2A.replace(/\nLEZIONE 4[\s\S]*$/, '')
  const blocked = compilePrePromotion([CURRENT_SOURCES[0], { ...CURRENT_SOURCES[1], normalizedText: incompletePack }])
  assert.notEqual(blocked.status, 'READY_FOR_HUMAN_REVIEW')
  assert.notEqual(blocked.directAlignment.status, 'READY')
})
