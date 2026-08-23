import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import { compileHumanTaskTrancheReviewFromCanonicalSources } from './human-task-tranche-compiler-source-adapter'

const UDA_1_06 = `CAN-UDA-1-06 — INFORMAZIONI, DATI E SISTEMI DIGITALI
Classe prima — Scuola secondaria di primo grado — a.s. 2026/2027
1. COLLOCAZIONE NEL PERCORSO
Periodo: aprile/maggio.
Durata prevista: 6 ore.
8. ARTICOLAZIONE DELLE ATTIVITÀ — 6 ORE
Fase 1 — Dati o informazioni? — 1 ora
Situazioni concrete: misure, conteggi, rilevazioni, elenchi. Individuazione della differenza tra dato isolato e informazione ottenuta organizzando più dati.
Fase 2 — Raccogliere e classificare — 1 ora
Breve rilevazione su un tema tecnologico o ambientale della classe. Definizione di categorie, conteggio e ordinamento dei dati.
Fase 3 — Tabelle e grafici — 1 ora
Costruzione guidata di una tabella e trasformazione dei dati in un grafico elementare. Lettura comparativa di più rappresentazioni.
Fase 4 — Come funziona un sistema digitale — 1 ora
Schema funzionale input → elaborazione → output → memoria. Esempi: computer, smartphone, termometro digitale, macchina fotografica digitale, sensore o altro dispositivo disponibile.
Fase 5 — Laboratorio digitale — 1 ora
Uso guidato di uno strumento digitale semplice per organizzare o rappresentare dati. Produzione di una tabella, di un grafico o di una scheda sintetica.
Fase 6 — Restituzione e verifica — 1 ora
Interpretazione di dati, spiegazione del funzionamento di un sistema digitale semplice e breve prova individuale.
13. EVIDENZE OSSERVABILI
- distingue correttamente dato e informazione;
- usa criteri coerenti di classificazione;
- organizza i dati in modo leggibile;
- costruisce o legge correttamente una semplice rappresentazione;
- individua input, output e funzione di elaborazione;
- usa lo strumento digitale rispettando consegne e regole.`

const PACK_1F = `Dai dati all’informazione
Pacchetto operativo CAN-PACK-1F · Classe prima · Supporto a CAN-UDA-1-06

Finalità
Trasformare semplici osservazioni o conteggi in informazioni leggibili mediante classificazione, tabelle e grafici elementari e comprendere il funzionamento essenziale di un sistema digitale come input → elaborazione → output → memoria.

Risultati attesi
Distinguere dato e informazione; individuare dati pertinenti; raccogliere e classificare secondo un criterio; costruire tabella e grafico; ricavare almeno due informazioni supportate dai dati; riconoscere input, elaborazione, output e memoria; usare responsabilmente gli strumenti digitali.

Percorso
Domanda circoscritta e scelta dei dati; raccolta e classificazione; tabella e grafico; analisi funzionale di un dispositivo digitale comune; laboratorio «Dai dati all’informazione» con controllo tra pari delle conclusioni e dello schema funzionale.

Compito autentico
Realizzare un piccolo dossier composto da domanda, insieme di dati ordinato, tabella, grafico, due informazioni motivate e schema input-elaborazione-output-memoria di un semplice sistema digitale. Il procedimento deve poter essere ricostruito da un compagno.

Valutazione
Pertinenza dei dati; coerenza della classificazione; correttezza e leggibilità di tabella e grafico; corrispondenza dati-informazioni; riconoscimento delle funzioni del sistema digitale; uso responsabile dello strumento e chiarezza della documentazione.

Cittadinanza digitale, inclusione e validazione
Usare dati non personali o anonimizzati e file negli spazi indicati dal docente. Prevedere insiemi ridotti, tabelle predisposte, categorie illustrate e lavoro a coppie.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return {
    code,
    assetId: `asset-${code}`,
    generationId,
    title: code,
    normalizedText: text,
  }
}

function coveredThroughB27() {
  return buildBlocks('Prima').slice(0, 27).map((block) => block.id)
}

test('discovers the next coherent tranche instead of compiling B28 alone', () => {
  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds: coveredThroughB27(),
    sources: [
      source('CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe', UDA_1_06),
      source('CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894', PACK_1F),
    ],
  })

  assert.deepEqual(review.blockIds, ['B28', 'B29', 'B30'])
  assert.equal(review.segmentKey, 'Prima:10')
  assert.equal(review.promotion, 'HUMAN_REVIEW_REQUIRED')
})

test('adapts the compact CAN-PACK-1F grammar without rewriting source identity', () => {
  const result = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds: coveredThroughB27(),
    sources: [
      source('CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe', UDA_1_06),
      source('CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894', PACK_1F),
    ],
  })

  assert.equal(result.adapterNotes.length, 1)
  assert.match(result.adapterNotes[0], /CAN-PACK-1F/)
  assert.equal(result.review.status, 'AMBIGUOUS_SOURCE_ALIGNMENT')
  assert.deepEqual(
    result.review.sourceBindings.map((binding) => [binding.code, binding.generationId]),
    [
      ['CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894'],
      ['CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe'],
    ],
  )
})

test('allocates the six UDA hours across the three canonical blocks and surfaces only the real ambiguity', () => {
  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds: coveredThroughB27(),
    sources: [
      source('CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe', UDA_1_06),
      source('CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894', PACK_1F),
    ],
  })

  assert.deepEqual(
    review.recommendedAllocation?.blocks.map((item) => [item.blockId, item.phaseOrdinals]),
    [
      ['B28', [1, 2]],
      ['B29', [3, 5]],
      ['B30', [4, 6]],
    ],
  )

  const b28 = review.items.find((item) => item.blockId === 'B28')
  const b29 = review.items.find((item) => item.blockId === 'B29')
  const b30 = review.items.find((item) => item.blockId === 'B30')

  assert.equal(b28?.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(b28?.proposedRecipe, 'PLAN_GUIDED_UDA')
  assert.deepEqual(b28?.proposedPhaseOrdinals, [1, 2])

  assert.equal(b29?.status, 'AMBIGUOUS_SOURCE_ALIGNMENT')
  assert.equal(b29?.proposedRecipe, 'UNRESOLVED')
  assert.deepEqual(b29?.alternativePhaseSets, [[3, 5], [3, 6]])

  assert.equal(b30?.status, 'AMBIGUOUS_SOURCE_ALIGNMENT')
  assert.equal(b30?.proposedRecipe, 'UNRESOLVED')
  assert.deepEqual(b30?.alternativePhaseSets, [[4, 5], [4, 6]])
})

test('fails closed when the canonical PACK source is missing', () => {
  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds: coveredThroughB27(),
    sources: [source('CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe', UDA_1_06)],
  })

  assert.equal(review.status, 'BLOCKED')
  assert.equal(review.items.every((item) => item.status === 'BLOCKED'), true)
  assert.equal(review.issues.some((issue) => /CAN-PACK-1F/.test(issue)), true)
})

test('returns COMPLETE when every canonical block is already covered', () => {
  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds: buildBlocks('Prima').map((block) => block.id),
    sources: [],
  })

  assert.equal(review.status, 'COMPLETE')
  assert.equal(review.promotion, 'NONE')
  assert.deepEqual(review.blockIds, [])
})
