import type { KnowledgeRetrievalBenchmarkRun } from '../semantic-benchmark'
import type { KnowledgeSemanticGoldSet } from '../semantic-gold-set'

/** Synthetic-only evaluator fixture. It MUST NOT be used as activation evidence. */
export const SYNTHETIC_K3C_REFERENCE_GOLD_SET: KnowledgeSemanticGoldSet = {
  id: 'k3c-synthetic-reference-v1', locale: 'it-IT', version: 1, publicationClass: 'PUBLIC_SANITIZED_FIXTURE',
  queries: [
    query('q-object-function', 'Quale attività introduce la funzione di un oggetto tecnico?', 'unit-object-function', 'EXACT', 'CONCEPT', 'TECNOLOGIA', '1A', 'VERIFIED'),
    query('q-measurement', 'Quale risorsa propone di misurare e rappresentare un oggetto?', 'unit-measurement', 'CONCEPTUAL', 'RESOURCE', 'TECNOLOGIA', '2C', 'VERIFIED'),
    query('q-materials', 'Dove viene collegata la scelta dei materiali alla funzione?', 'unit-materials', 'EXACT', 'CONCEPT', 'TECNOLOGIA', '2C', 'AUTO'),
    query('q-drawing', 'Quale attività richiede un disegno quotato con il righello?', 'unit-drawing', 'CONCEPTUAL', 'ACTIVITY', 'TECNOLOGIA', '1A', 'AUTO'),
    query('q-assessment', 'Quale controllo finale verifica osservazione, misura e spiegazione?', 'unit-assessment', 'EXACT', 'ASSESSMENT', 'TECNOLOGIA', '2C', 'MIXED'),
    query('q-sequence', 'Quale percorso collega bisogno, funzione, parti e materiali?', 'unit-sequence', 'CONCEPTUAL', 'SEQUENCE', 'TECNOLOGIA', '1A', 'VERIFIED'),
  ],
}

function query(id: string, queryText: string, unitId: string, queryType: 'EXACT' | 'CONCEPTUAL', category: string, discipline: string, classRef: string, reliability: 'VERIFIED' | 'AUTO' | 'MIXED') {
  return { id, queryText, relevantUnitIds: [unitId], queryType, category, discipline, classRef, reliability, dataClass: 'SANITIZED_NON_PERSONAL' as const, verification: null }
}

export const SYNTHETIC_K3C_REFERENCE_RUNS: readonly KnowledgeRetrievalBenchmarkRun[] = [
  { channel: 'FULL_TEXT', implementationRef: 'synthetic:full-text:v1', observations: [
    observation('q-object-function', ['unit-object-function', 'noise-1'], 80), observation('q-measurement', ['noise-2', 'unit-measurement'], 90), observation('q-materials', ['noise-3', 'noise-4', 'unit-materials'], 95), observation('q-drawing', ['unit-drawing'], 85), observation('q-assessment', ['noise-5', 'unit-assessment'], 110), observation('q-sequence', ['noise-6', 'noise-7', 'unit-sequence'], 100),
  ] },
  { channel: 'SEMANTIC', implementationRef: 'synthetic:semantic:v1', observations: [
    observation('q-object-function', ['unit-object-function'], 120), observation('q-measurement', ['unit-measurement'], 130), observation('q-materials', ['unit-materials'], 125), observation('q-drawing', ['noise-8', 'unit-drawing'], 140), observation('q-assessment', ['unit-assessment'], 150), observation('q-sequence', ['unit-sequence'], 135),
  ] },
  { channel: 'HYBRID', implementationRef: 'synthetic:rrf:v1', observations: [
    observation('q-object-function', ['unit-object-function'], 150), observation('q-measurement', ['unit-measurement'], 160), observation('q-materials', ['unit-materials'], 155), observation('q-drawing', ['unit-drawing'], 165), observation('q-assessment', ['unit-assessment'], 170), observation('q-sequence', ['unit-sequence'], 158),
  ] },
]

function observation(queryId: string, rankedUnitIds: string[], latencyMs: number) {
  return { queryId, rankedUnitIds, latencyMs, workspaceLeakageCount: 0, staleGenerationLeakageCount: 0, filterViolationCount: 0 }
}
