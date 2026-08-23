import assert from 'node:assert/strict'
import test from 'node:test'
import { discoverRuntimeHumanTaskCoveredBlockIds } from '@/core/presentation/human-task-runtime'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'
import { compileHumanTaskTrancheReviewFromCanonicalSources } from './human-task-tranche-compiler-source-adapter'

const UDA_1_07 = `CAN-UDA-1-07 — PROGETTO TECNOLOGICO SOSTENIBILE
Classe prima — Scuola secondaria di primo grado — a.s. 2026/2027
1. COLLOCAZIONE NEL PERCORSO
Periodo: maggio/giugno.
Durata prevista: 6 ore.
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
11. EVIDENZE OSSERVABILI
- identifica correttamente il problema e la funzione della soluzione;
- considera requisiti e vincoli;
- propone e confronta alternative;
- sceglie materiali coerenti;
- rappresenta il progetto con chiarezza adeguata al livello;
- organizza una sequenza operativa plausibile;
- valuta almeno alcuni aspetti ambientali;
- utilizza dati o criteri per motivare decisioni;
- comunica in modo comprensibile il processo seguito.`

const PACK_1D = `CAN-PACK-1D — ALLESTIMENTO E CONDUZIONE OPEN DAY — CLASSE PRIMA
Scuola secondaria di primo grado — Tecnologia — a.s. 2026/2027
FUNZIONE DEL PACCHETTO
Regia logistica e didattica dell’Open Day per la classe prima. Il pacchetto trasforma i prodotti delle UDA e del micro-progetto in un percorso espositivo leggibile, sicuro e condotto dagli alunni. Non sostituisce le UDA: organizza la loro restituzione pubblica.
1. OBIETTIVI DELL’ALLESTIMENTO
- mostrare processi, non semplici manufatti;
- rendere visibile il percorso problema → analisi → disegno → scelta dei materiali → prototipo → verifica → miglioramento;
- valorizzare il linguaggio tecnico e la capacità di spiegare.
2. STRUTTURA CONSIGLIATA IN 5 STAZIONI
STAZIONE 4 — DAL PROBLEMA ALLA SOLUZIONE
Materiali: dossier dei micro-progetti, alternative, matrice di scelta, tavola progettuale, prototipo.
Domanda guida: “Come si passa da un problema a una soluzione verificabile?”
STAZIONE 5 — SOSTENIBILITÀ E MIGLIORAMENTO
Materiali: scheda materiali/fine vita, criteri di riduzione-riuso-riciclo, test e miglioramenti proposti.
Domanda guida: “Una buona soluzione è anche responsabile nell’uso delle risorse?”
13. OSSERVAZIONE E VALUTAZIONE DURANTE L’OPEN DAY
L’Open Day non genera automaticamente un voto autonomo. Può fornire evidenze integrative sulla comprensione del processo, il lessico tecnico, la chiarezza comunicativa, la collaborazione e la consapevolezza di sostenibilità e miglioramento.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return {
    code,
    assetId: `asset-${code}`,
    generationId,
    title: code,
    normalizedText: text,
  }
}

test('runtime coverage autonomously discovers the next Prima segment and compiles it from current source generations', () => {
  const coveredBlockIds = discoverRuntimeHumanTaskCoveredBlockIds('Prima')
  const covered = new Set(coveredBlockIds)

  assert.equal(covered.has('B01'), true)
  assert.equal(covered.has('B30'), true)
  assert.equal(covered.has('B31'), false)
  assert.equal(coveredBlockIds.length, 30)

  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds,
    sources: [
      source('CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1', UDA_1_07),
      source('CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29', PACK_1D),
    ],
  })

  console.info('HUMAN_TASK_NEXT_CYCLE', JSON.stringify({
    segmentKey: review.segmentKey,
    blockIds: review.blockIds,
    status: review.status,
    items: review.items.map((item) => ({
      blockId: item.blockId,
      status: item.status,
      recipe: item.proposedRecipe,
      phases: item.proposedPhaseOrdinals,
      alternatives: item.alternativePhaseSets,
    })),
    issues: review.issues,
  }))

  assert.deepEqual(review.blockIds, ['B31', 'B32', 'B33'])
  assert.equal(review.segmentKey, 'Prima:11')
  assert.equal(review.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.notEqual(review.status, 'BLOCKED')
  assert.deepEqual(review.sourceBindings.map((binding) => [binding.code, binding.generationId]), [
    ['CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29'],
    ['CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1'],
  ])
})
