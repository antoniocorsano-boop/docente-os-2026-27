import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildHumanTaskCompilerReviewPackage } from './human-task-compiler-review-package'
import { compileHumanTaskTrancheReviewWithPackAlignment } from './human-task-tranche-compiler-pack-extension'

const UDA_1_06 = `CAN-UDA-1-06 — INFORMAZIONI, DATI E SISTEMI DIGITALI
Classe prima
Durata prevista: 6 ore.
4. OBIETTIVI DI APPRENDIMENTO
- Riconoscere la differenza tra dato grezzo e informazione organizzata.
- Individuare dati utili rispetto a una domanda o a un problema.
- Classificare e ordinare dati secondo criteri espliciti.
- Rappresentare dati mediante tabelle e grafici elementari.
- Interpretare semplici rappresentazioni di dati.
- Riconoscere le componenti funzionali essenziali di un sistema digitale.
- Comprendere il ruolo di input, elaborazione, output e memoria.
- Usare in modo responsabile strumenti digitali scolastici per una consegna semplice.
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
- usa lo strumento digitale rispettando consegne e regole;
- comunica in modo chiaro ciò che ha ricavato dai dati.`

const PACK_1F = `Dai dati all’informazione
Pacchetto operativo CAN-PACK-1F · Classe prima · Supporto a CAN-UDA-1-06

Finalità
Trasformare semplici osservazioni o conteggi in informazioni leggibili mediante classificazione, tabelle e grafici elementari e comprendere il funzionamento essenziale di un sistema digitale come input → elaborazione → output → memoria.

Percorso operativo
1. Dalla domanda ai dati
La classe parte da una domanda circoscritta. Si stabilisce che cosa osservare o contare e con quale criterio.
2. Raccogliere e classificare
Gli studenti registrano un piccolo insieme di dati, controllano che le categorie siano chiare e ordinano i valori in modo leggibile.
3. Dalla tabella al grafico
I dati vengono organizzati in una tabella semplice e trasformati in un grafico adatto. Gli studenti formulano almeno due informazioni ricavate dal grafico.
4. Come funziona un sistema digitale
Attraverso esempi vicini all’esperienza degli alunni si costruisce lo schema input → elaborazione → output → memoria.
5. Laboratorio e restituzione
Ogni coppia o gruppo completa la scheda «Dai dati all’informazione», produce tabella e grafico e aggiunge lo schema funzionale di un sistema digitale. Un compagno controlla se le conclusioni sono supportate dai dati e se lo schema funzionale è coerente.

Scheda «Dai dati all’informazione»
- Domanda di partenza
- Che cosa osservo o conto
- Categorie o criterio di classificazione
- Tabella predisposta
- Grafico scelto
- Informazione 1 ricavata dai dati
- Informazione 2 ricavata dai dati
- Sistema digitale osservato
- Input
- Elaborazione
- Output
- Memoria`

const PLAN_FRAGMENTS = [
  {
    blockId: 'B28',
    activity: 'domanda, dati pertinenti, raccolta e classificazione',
    evidence: 'set dati ordinato',
  },
  {
    blockId: 'B29',
    activity: 'tabella, grafico elementare, due informazioni ricavate dai dati',
    evidence: 'tabella + grafico + interpretazione',
  },
  {
    blockId: 'B30',
    activity: 'analisi funzionale di un dispositivo e restituzione',
    evidence: 'schema funzionale + breve verifica',
  },
]

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function coveredThroughB27() {
  return buildBlocks('Prima').slice(0, 27).map((block) => block.id)
}

function compile(planFragments = PLAN_FRAGMENTS) {
  return compileHumanTaskTrancheReviewWithPackAlignment({
    grade: 'Prima',
    coveredBlockIds: coveredThroughB27(),
    sources: [
      source('CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe', UDA_1_06),
      source('CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894', PACK_1F),
    ],
    planFragments,
  })
}

test('compiler v2 resolves B28-B30 as one coherent PACK_COMPOSED tranche', () => {
  const review = compile()
  assert.equal(review.compilerVersion, 2)
  assert.equal(review.segmentKey, 'Prima:10')
  assert.deepEqual(review.blockIds, ['B28', 'B29', 'B30'])
  assert.equal(review.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(review.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.equal(review.packAlignment?.status, 'READY')
  assert.deepEqual(review.items.map((item) => [item.blockId, item.proposedRecipe]), [
    ['B28', 'PACK_COMPOSED'],
    ['B29', 'PACK_COMPOSED'],
    ['B30', 'PACK_COMPOSED'],
  ])
})

test('ordered PACK classifier derives 1+2 / 3 / 4+5 instead of hard-coding block recipes', () => {
  const review = compile()
  assert.deepEqual(review.items.map((item) => [item.blockId, item.proposedPackHeadings]), [
    ['B28', ['1. Dalla domanda ai dati', '2. Raccogliere e classificare']],
    ['B29', ['3. Dalla tabella al grafico']],
    ['B30', ['4. Come funziona un sistema digitale', '5. Laboratorio e restituzione']],
  ])
})

test('source generations stay bound to the compiler review package', () => {
  const review = compile()
  assert.deepEqual(review.sourceBindings.map((binding) => [binding.code, binding.generationId]), [
    ['CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894'],
    ['CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe'],
  ])
  assert.equal(review.candidateIds.every((id) => id.includes('7b438474-22ad-4f00-99af-c84701c8dfbe:3b884504-990b-4c70-a1a6-51439ad66894')), true)
})

test('without exact Plan fragments v2 does not pretend the PACK partition is proven', () => {
  const review = compile([])
  assert.notEqual(review.packAlignment?.status, 'READY')
  assert.equal(review.items.some((item) => item.proposedRecipe === 'UNRESOLVED'), true)
})

test('review package is declarative, pending and preserves exact Plan evidence', () => {
  const review = compile()
  const reviewPackage = buildHumanTaskCompilerReviewPackage({ review, planFragments: PLAN_FRAGMENTS })

  assert.equal(reviewPackage.packageVersion, 1)
  assert.equal(reviewPackage.compilerVersion, 2)
  assert.equal(reviewPackage.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(reviewPackage.promotion, 'HUMAN_APPROVAL_REQUIRED')
  assert.equal(reviewPackage.decision, 'PENDING')
  assert.equal(reviewPackage.items.every((item) => item.decision === 'PENDING'), true)
  assert.deepEqual(reviewPackage.items.map((item) => [item.blockId, item.planEvidence]), [
    ['B28', 'set dati ordinato'],
    ['B29', 'tabella + grafico + interpretazione'],
    ['B30', 'schema funzionale + breve verifica'],
  ])
  assert.equal(reviewPackage.constraints.some((item) => /non equivale ad approvazione/i.test(item)), true)
})
