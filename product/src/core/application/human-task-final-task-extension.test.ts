import assert from 'node:assert/strict'
import test from 'node:test'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import { compileHumanTaskTrancheReviewWithDirectPack } from './human-task-tranche-compiler-direct-extension'
import { compileHumanTaskTrancheReviewWithFinalTask } from './human-task-tranche-compiler-final-task-extension'

const UDA_2_03 = `CAN-UDA-2-03 — TERRITORIO, CITTÀ E PIANIFICAZIONE
Classe seconda — Tecnologia — Scuola secondaria di primo grado
Raccordo: CAN-PRG-2 — Periodo: novembre/dicembre — Durata prevista: 8 ore
SENSO DELL’UNITÀ
Comprendere il territorio come sistema trasformato nel tempo da insediamenti, reti, servizi, mobilità e scelte di pianificazione.
ATTIVITÀ
Attivazione delle conoscenze iniziali e definizione del problema.
Osservazione guidata di casi, oggetti, sistemi, immagini, schemi o dati.
PRODOTTO AUTENTICO
Mappa ragionata di un quartiere o territorio con funzioni, reti, criticità e proposta di miglioramento.
EVIDENZE E VERIFICA
Comprensione dei nuclei disciplinari; correttezza delle relazioni; uso del lessico tecnologico; qualità della rappresentazione; motivazione delle scelte; autonomia e revisione.`

const PACK_2C = `CAN-PACK-2C — TERRITORIO, CITTÀ E PIANIFICAZIONE
Classe seconda — Tecnologia — a.s. 2026/2027
DURATA
8 ore UDA 3, articolate in quattro lezioni da 2 ore. Le attività grafiche possono concorrere alle 6 ore trasversali di UDA 6 previste entro dicembre, senza duplicazione del monte ore.

LEZIONE 1 — LEGGERE IL TERRITORIO — 2 ORE
Focus: territorio naturale, rurale, urbano e produttivo.
Attività: osservazione guidata di immagini, mappe o schemi; individuazione di elementi naturali, agricoli, edificati e infrastrutturali; classificazione delle funzioni presenti.
Prodotto: Scheda 2C-1 — “Carta d’identità di un territorio”.
Evidenza: riconosce e distingue le principali funzioni territoriali.

LEZIONE 2 — COME FUNZIONA UNA CITTÀ — 2 ORE
Focus: funzioni urbane, servizi e mobilità.
Attività: costruzione di una mappa concettuale; analisi di casi; discussione su distanze, accessibilità e conflitti tra funzioni; introduzione a orientamento e legenda.
Prodotto: Scheda 2C-2 — “La città come sistema”.
Evidenza: mette in relazione funzioni, servizi e spostamenti.

LEZIONE 3 — PROBLEMI E SCELTE DI PIANIFICAZIONE — 2 ORE
Focus: organizzare lo spazio secondo criteri.
Attività: analisi di una micro-area con problemi intenzionali; individuazione delle criticità; confronto tra alternative; scelta motivata secondo funzione, sicurezza, accessibilità e sostenibilità.
Prodotto: Scheda 2C-3 — “Diagnosi e miglioramento”.
Evidenza: identifica criticità e propone una soluzione motivata.

LEZIONE 4 — MICRO-AREA TERRITORIALE — 2 ORE
Focus: sintesi Open Day e raccordo con UDA 6.
Compito significativo: “UN TERRITORIO CHE FUNZIONA: RISORSE, CIBO, SPAZI E SERVIZI”.
Consegna: progettare o riorganizzare una semplice micro-area territoriale.
Il gruppo deve produrre:
1. schema territoriale o planimetria semplificata;
2. titolo, orientamento e legenda;
3. indicazione delle principali funzioni;
4. almeno un collegamento di filiera produzione → trasformazione/distribuzione;
5. almeno tre scelte motivate di sostenibilità;
6. almeno una criticità evitata o risolta;
7. semplice riferimento alla scala, se già affrontata nella quota UDA 6;
8. pitch finale di 90–120 secondi.
SCHEDA 2C-4 — PROGETTO DELLA MICRO-AREA
Nome della micro-area: __________
Problema/obiettivo: __________
Funzioni da inserire: __________
Tre scelte sostenibili: __________
Una criticità evitata: __________

RUBRICA BREVE — 4 LIVELLI
Indicatori:
A. Lettura e organizzazione delle funzioni territoriali.
B. Coerenza tra attività produttive, servizi e mobilità.
C. Chiarezza della rappresentazione grafica e della legenda.
D. Qualità e motivazione delle scelte di sostenibilità.
Livelli: Avanzato / Intermedio / Base / In via di prima acquisizione.
CRITERI OD-READY
- le funzioni territoriali sono leggibili;
- la legenda è coerente;
- sono presenti almeno tre scelte motivate.

INCLUSIONE
- planimetrie-base parzialmente predisposte.`

function source(code: string, assetId: string, generationId: string, normalizedText: string): HumanTaskPipelineSource {
  return { code, assetId, generationId, title: code, normalizedText }
}

const SOURCES = [
  source('CAN-UDA-2-03', '06e206d1-a209-4ab9-8f40-3d2755bd2f80', '2dadf1db-b3e0-4585-99b9-61d7ac7010f0', UDA_2_03),
  source('CAN-PACK-2C', 'd7645701-f3cd-4d99-af76-8f0428d09004', '8347bccd-6541-4a71-8e47-c08d42ea4f73', PACK_2C),
]
const COVERED_B01_B08 = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08']

function compile(packText = PACK_2C) {
  return compileHumanTaskTrancheReviewWithFinalTask({
    grade: 'Seconda',
    coveredBlockIds: COVERED_B01_B08,
    sources: [SOURCES[0], { ...SOURCES[1], normalizedText: packText }],
  })
}

test('v3 fails closed on the final-task grammar instead of inventing Attività/Prodotto/Evidenza', () => {
  const review = compileHumanTaskTrancheReviewWithDirectPack({
    grade: 'Seconda', coveredBlockIds: COVERED_B01_B08, sources: SOURCES,
  })
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.match(review.directAlignment.note, /Attività, Prodotto ed Evidenza\/Evidenze/i)
})

test('v4 proves B09-B12 using standard DIRECT plus the explicit final-task grammar', () => {
  const review = compile()
  console.info('HUMAN_TASK_SECONDA_NEXT', JSON.stringify({
    compilerVersion: review.compilerVersion,
    segmentKey: review.segmentKey,
    blockIds: review.blockIds,
    status: review.status,
    finalTaskRecovery: review.finalTaskRecovery,
  }))

  assert.equal(review.compilerVersion, 4)
  assert.equal(review.segmentKey, 'Seconda:3')
  assert.deepEqual(review.blockIds, ['B09', 'B10', 'B11', 'B12'])
  assert.equal(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.directAlignment.status, 'READY')
  assert.equal(review.finalTaskRecovery.status, 'READY')
  assert.equal(review.finalTaskRecovery.blockId, 'B12')
  assert.deepEqual(review.directAlignment.blocks.map((item) => item.durationMinutes), [120, 120, 120, 120])
  assert.match(review.directAlignment.blocks[3].activity, /Compito significativo:/i)
  assert.match(review.directAlignment.blocks[3].product, /Il gruppo deve produrre:/i)
  assert.match(review.directAlignment.blocks[3].evidence, /SCHEDA 2C-4.*RUBRICA.*CRITERI OD-READY/i)
  assert.deepEqual(review.sourceBindings.map((item) => [item.code, item.generationId]), [
    ['CAN-PACK-2C', '8347bccd-6541-4a71-8e47-c08d42ea4f73'],
    ['CAN-UDA-2-03', '2dadf1db-b3e0-4585-99b9-61d7ac7010f0'],
  ])
})

test('final-task recovery fails closed without an explicit student sheet', () => {
  const review = compile(PACK_2C.replace('SCHEDA 2C-4 — PROGETTO DELLA MICRO-AREA', 'PROGETTO DELLA MICRO-AREA'))
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.finalTaskRecovery.status, 'BLOCKED')
})

test('final-task recovery fails closed without explicit OD-READY criteria', () => {
  const review = compile(PACK_2C.replace('CRITERI OD-READY', 'CRITERI GENERALI'))
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.finalTaskRecovery.status, 'BLOCKED')
})

test('final-task recovery fails closed when the documented product list disappears', () => {
  const review = compile(PACK_2C.replace(/Il gruppo deve produrre:[\s\S]*?SCHEDA 2C-4/, 'SCHEDA 2C-4'))
  assert.notEqual(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.finalTaskRecovery.status, 'BLOCKED')
})
