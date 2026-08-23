import assert from 'node:assert/strict'
import test from 'node:test'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import {
  compileHumanTaskTrancheReviewWithDirectPack,
  resolveExplicitPackSetTiming,
} from './human-task-tranche-compiler-direct-extension'

const UDA_2_02 = `CAN-UDA-2-02 — ALIMENTI, TRASFORMAZIONE E CONSERVAZIONE
Classe seconda — Tecnologia — Scuola secondaria di primo grado
Raccordo: CAN-PRG-2 — Periodo: ottobre/novembre — Durata prevista: 8 ore
SENSO DELL’UNITÀ
Leggere la filiera alimentare come sistema di trasformazioni, controlli, conservazione, distribuzione e consumo consapevole.
ATTIVITÀ
Attivazione delle conoscenze iniziali e definizione del problema.
Osservazione guidata di casi, oggetti, sistemi, immagini, schemi o dati.
Analisi e riorganizzazione delle informazioni con mappe, tabelle o rappresentazioni.
Esercitazione laboratoriale individuale e cooperativa.
PRODOTTO AUTENTICO
Infografica comparativa su un alimento, dalla materia prima al consumo, con trasformazioni, conservazione e criteri di scelta.
EVIDENZE E VERIFICA
Comprensione dei nuclei disciplinari; correttezza delle relazioni; uso del lessico tecnologico; qualità della rappresentazione; motivazione delle scelte; autonomia e revisione.`

const PACK_2B = `CAN-PACK-2B — ALIMENTI, TRASFORMAZIONE E CONSERVAZIONE
Classe seconda — Tecnologia — a.s. 2026/2027
Collegamento: CAN-PRG-2 / UDA 2 — 8 ore — ottobre/novembre
ARTICOLAZIONE — 4 LEZIONI DA 2 ORE

LEZIONE 1 — DAL CAMPO AL PRODOTTO
Focus: materia prima, trasformazione, filiera.
Attività: partire da 3–4 alimenti comuni e ricostruire i passaggi essenziali produzione → raccolta/allevamento → trasformazione → confezionamento → distribuzione → consumo.
Prodotto: Scheda 2B-1 “La storia tecnologica di un alimento”.
Evidenze: riconosce fasi e attori; distingue materia prima e prodotto trasformato.

LEZIONE 2 — COME SI CONSERVA UN ALIMENTO
Focus: deterioramento e tecniche di conservazione.
Attività: classificare esempi reali o fotografici; confronto tra refrigerazione/congelamento, pastorizzazione/sterilizzazione, essiccazione/disidratazione, salagione/zuccheraggio, confezionamento protettivo.
Prodotto: Scheda 2B-2 “Metodo di conservazione: come funziona e perché”.
Evidenze: associa metodo, principio essenziale e vantaggio/limite.

LEZIONE 3 — PACKAGING, ETICHETTA E CONSUMO CONSAPEVOLE
Focus: funzioni dell’imballaggio e informazioni utili.
Attività: analisi guidata di confezioni pulite e sicure; individuare materiale, funzione, informazioni essenziali, simboli di raccolta, data, modalità di conservazione.
Prodotto: Scheda 2B-3 “Leggo una confezione”.
Evidenze: legge informazioni essenziali; collega materiale, funzione e fine vita.

LEZIONE 4 — SPRECO, SCELTE E FILIERA RESPONSABILE
Focus: spreco alimentare, trasporto, conservazione, porzioni, packaging e comportamento del consumatore.
Attività: confronto tra due filiere o due soluzioni distributive; matrice semplice con criteri: durata, energia, trasporto, imballaggio, rischio di spreco, recuperabilità del packaging.
Prodotto: Scheda 2B-4 “Quale filiera riduce meglio gli sprechi?”.
Evidenze: formula un giudizio motivato usando almeno tre criteri.`

function source(code: string, assetId: string, generationId: string, normalizedText: string): HumanTaskPipelineSource {
  return { code, assetId, generationId, title: code, normalizedText }
}

const SOURCES = [
  source('CAN-UDA-2-02', '1fd05883-3332-4f21-a7b3-2c4c531c0ae4', '0d2ffe0d-222a-485b-ae23-1e91eb0072ab', UDA_2_02),
  source('CAN-PACK-2B', 'd8cb0142-3421-4f2e-a546-5e60b1822d7c', '5fbca577-3dcd-4609-a32e-f95a6d3ebc1d', PACK_2B),
]

const COVERED_B01_B04 = ['B01', 'B02', 'B03', 'B04']

function compile(packText = PACK_2B) {
  return compileHumanTaskTrancheReviewWithDirectPack({
    grade: 'Seconda',
    coveredBlockIds: COVERED_B01_B04,
    sources: [SOURCES[0], { ...SOURCES[1], normalizedText: packText }],
  })
}

test('set-level timing grammar is explicit and exact', () => {
  assert.deepEqual(resolveExplicitPackSetTiming(PACK_2B, 4), {
    status: 'READY', lessonCount: 4, durationMinutes: 120,
    note: 'Temporizzazione esplicita del set verificata: 4 lezioni da 2 ore.',
  })
})

test('autonomous next tranche B05-B08 is DIRECT using explicit set timing and plural Evidenze', () => {
  const review = compile()
  console.info('HUMAN_TASK_SECONDA_NEXT', JSON.stringify({
    segmentKey: review.segmentKey,
    blockIds: review.blockIds,
    status: review.status,
    recipes: review.items.map((item) => [item.blockId, item.proposedRecipe, item.proposedPackHeadings]),
  }))
  assert.equal(review.segmentKey, 'Seconda:2')
  assert.deepEqual(review.blockIds, ['B05', 'B06', 'B07', 'B08'])
  assert.equal(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.directAlignment.status, 'READY')
  assert.deepEqual(review.directAlignment.blocks.map((item) => item.durationMinutes), [120, 120, 120, 120])
  assert.equal(review.directAlignment.blocks.every((item) => Boolean(item.activity && item.product && item.evidence)), true)
  assert.match(review.directAlignment.note, /4 lezioni da 2 ore/i)
})

test('set timing blocks DIRECT when declared lesson count differs from the discovered tranche', () => {
  const review = compile(PACK_2B.replace('4 LEZIONI DA 2 ORE', '3 LEZIONI DA 2 ORE'))
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.match(review.directAlignment.note, /3 lezioni per 4 blocchi/i)
})

test('set timing blocks DIRECT when declared duration differs from canonical block duration', () => {
  const review = compile(PACK_2B.replace('4 LEZIONI DA 2 ORE', '4 LEZIONI DA 3 ORE'))
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.match(review.directAlignment.note, /non documenta esattamente 120 minuti/i)
})

test('without per-lesson or valid set timing DIRECT still refuses to infer duration', () => {
  const review = compile(PACK_2B.replace('ARTICOLAZIONE — 4 LEZIONI DA 2 ORE', 'ARTICOLAZIONE — QUATTRO LEZIONI'))
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.match(review.directAlignment.note, /durata non viene inferita/i)
})

test('plural Evidenze remains required rather than synthesized', () => {
  const review = compile(PACK_2B.replace('Evidenze: associa metodo, principio essenziale e vantaggio/limite.', ''))
  assert.equal(review.directAlignment.status, 'BLOCKED')
  assert.match(review.directAlignment.note, /Evidenza\/Evidenze/i)
})
