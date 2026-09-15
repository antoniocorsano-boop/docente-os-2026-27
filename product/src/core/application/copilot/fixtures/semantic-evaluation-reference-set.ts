import type { KnowledgeRetrievalBenchmarkRun } from '../semantic-benchmark'
import type { KnowledgeSemanticGoldSet } from '../semantic-gold-set'

/**
 * Synthetic-only reference set used to regression-test evaluator mechanics.
 * It is intentionally too small and not human-verified, therefore it MUST NOT
 * be used as activation evidence for a semantic provider/profile.
 */
export const SYNTHETIC_K3C_REFERENCE_GOLD_SET: KnowledgeSemanticGoldSet = {
  id: 'k3c-synthetic-reference-v1',
  locale: 'it-IT',
  version: 1,
  publicationClass: 'PUBLIC_SANITIZED_FIXTURE',
  queries: [
    {
      id: 'q-object-function',
      queryText: 'Quale attività introduce la funzione di un oggetto tecnico?',
      relevantUnitIds: ['unit-object-function'],
      reliability: 'VERIFIED',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
    {
      id: 'q-measurement',
      queryText: 'Quale risorsa propone di misurare e rappresentare un oggetto?',
      relevantUnitIds: ['unit-measurement'],
      reliability: 'VERIFIED',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
    {
      id: 'q-materials',
      queryText: 'Dove viene collegata la scelta dei materiali alla funzione?',
      relevantUnitIds: ['unit-materials'],
      reliability: 'AUTO',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
    {
      id: 'q-drawing',
      queryText: 'Quale attività richiede un disegno quotato con il righello?',
      relevantUnitIds: ['unit-drawing'],
      reliability: 'AUTO',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
    {
      id: 'q-assessment',
      queryText: 'Quale controllo finale verifica osservazione, misura e spiegazione?',
      relevantUnitIds: ['unit-assessment'],
      reliability: 'MIXED',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
    {
      id: 'q-sequence',
      queryText: 'Quale percorso collega bisogno, funzione, parti e materiali?',
      relevantUnitIds: ['unit-sequence'],
      reliability: 'VERIFIED',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: null,
    },
  ],
}

export const SYNTHETIC_K3C_REFERENCE_RUNS: readonly KnowledgeRetrievalBenchmarkRun[] = [
  {
    channel: 'FULL_TEXT',
    observations: [
      observation('q-object-function', ['unit-object-function', 'noise-1'], 80),
      observation('q-measurement', ['noise-2', 'unit-measurement'], 90),
      observation('q-materials', ['noise-3', 'noise-4', 'unit-materials'], 95),
      observation('q-drawing', ['unit-drawing'], 85),
      observation('q-assessment', ['noise-5', 'unit-assessment'], 110),
      observation('q-sequence', ['noise-6', 'noise-7', 'unit-sequence'], 100),
    ],
  },
  {
    channel: 'SEMANTIC',
    observations: [
      observation('q-object-function', ['unit-object-function'], 120),
      observation('q-measurement', ['unit-measurement'], 130),
      observation('q-materials', ['unit-materials'], 125),
      observation('q-drawing', ['noise-8', 'unit-drawing'], 140),
      observation('q-assessment', ['unit-assessment'], 150),
      observation('q-sequence', ['unit-sequence'], 135),
    ],
  },
  {
    channel: 'HYBRID',
    observations: [
      observation('q-object-function', ['unit-object-function'], 150),
      observation('q-measurement', ['unit-measurement'], 160),
      observation('q-materials', ['unit-materials'], 155),
      observation('q-drawing', ['unit-drawing'], 165),
      observation('q-assessment', ['unit-assessment'], 170),
      observation('q-sequence', ['unit-sequence'], 158),
    ],
  },
]

function observation(queryId: string, rankedUnitIds: string[], latencyMs: number) {
  return {
    queryId,
    rankedUnitIds,
    latencyMs,
    workspaceLeakageCount: 0,
    staleGenerationLeakageCount: 0,
    filterViolationCount: 0,
  }
}
