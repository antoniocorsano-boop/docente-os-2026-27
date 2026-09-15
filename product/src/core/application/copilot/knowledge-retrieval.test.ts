import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildKnowledgeRetrievalResponse,
  isKnowledgeRetrievalHitEligible,
  type KnowledgeRetrievalFilters,
  type KnowledgeRetrievalQuery,
  type KnowledgeRetrievalRawHit,
} from './knowledge-retrieval'

const QUERY: KnowledgeRetrievalQuery = {
  workspaceId: 'workspace-a',
  query: 'misurare oggetto',
  limit: 10,
  filters: {
    academicYearId: 'year-2026',
    category: 'TEACHING_RESOURCE',
    discipline: 'Tecnologia',
    classLabel: '2C',
  },
}

function hit(overrides: Partial<KnowledgeRetrievalRawHit> = {}): KnowledgeRetrievalRawHit {
  return {
    resultId: 'unit-1',
    channel: 'FULL_TEXT',
    channelRank: 1,
    workspaceId: 'workspace-a',
    academicYearId: 'year-2026',
    assetId: 'asset-1',
    documentId: 'document-1',
    unitId: 'unit-1',
    currentGenerationId: 'generation-current',
    generationId: 'generation-current',
    title: 'Misurare un oggetto',
    content: 'Misurare con il righello e rappresentare un oggetto con quote controllabili.',
    contentCategory: 'TEACHING_RESOURCE',
    disciplines: ['Tecnologia'],
    classLabels: ['2C'],
    reliability: 'AUTO',
    capturedAt: '2026-09-14T10:00:00.000Z',
    sourceProvider: 'UPLOAD',
    sourceLocator: 'storage://knowledge/asset-1/original.pdf',
    sourcePage: 2,
    ...overrides,
  }
}

test('K3A: rejects another workspace and every obsolete generation', () => {
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ workspaceId: 'workspace-b' }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ generationId: 'generation-old' }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ currentGenerationId: null }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit(), QUERY.workspaceId, QUERY.filters), true)
})

test('K3A: professional filters are fail-closed and normalized only for human labels', () => {
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ academicYearId: 'year-2025' }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ contentCategory: 'ASSESSMENT' }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ disciplines: ['Matematica'] }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ classLabels: ['2A'] }), QUERY.workspaceId, QUERY.filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ disciplines: [' tecnologia '], classLabels: ['2c'] }), QUERY.workspaceId, QUERY.filters), true)
})

test('K3A: an explicit reliability allowlist is respected', () => {
  const filters: KnowledgeRetrievalFilters = { ...QUERY.filters, allowedReliability: ['VERIFIED'] }
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ reliability: 'AUTO' }), QUERY.workspaceId, filters), false)
  assert.equal(isKnowledgeRetrievalHitEligible(hit({ reliability: 'VERIFIED' }), QUERY.workspaceId, filters), true)
})

test('K3A: every result preserves current generation and original-source provenance', () => {
  const response = buildKnowledgeRetrievalResponse({ query: QUERY, fullTextHits: [hit()] })

  assert.equal(response.semanticAvailable, false)
  assert.deepEqual(response.channelsUsed, ['FULL_TEXT'])
  assert.equal(response.results.length, 1)
  assert.equal(response.results[0].generationId, 'generation-current')
  assert.equal(response.results[0].provenance.currentGenerationId, 'generation-current')
  assert.equal(response.results[0].provenance.sourceProvider, 'UPLOAD')
  assert.equal(response.results[0].provenance.sourceLocator, 'storage://knowledge/asset-1/original.pdf')
  assert.equal(response.results[0].provenance.assetRef, '/knowledge/asset-1')
  assert.equal(response.results[0].sourcePage, 2)
})

test('K3A: VERIFIED wins an otherwise equal deterministic rank without changing source authority', () => {
  const auto = hit({ resultId: 'unit-auto', unitId: 'unit-auto', assetId: 'asset-auto', reliability: 'AUTO', channelRank: 1 })
  const verified = hit({ resultId: 'unit-verified', unitId: 'unit-verified', assetId: 'asset-verified', reliability: 'VERIFIED', channelRank: 1 })
  const toVerify = hit({ resultId: 'unit-check', unitId: 'unit-check', assetId: 'asset-check', reliability: 'TO_VERIFY', channelRank: 1 })

  const response = buildKnowledgeRetrievalResponse({ query: QUERY, fullTextHits: [auto, toVerify, verified] })

  assert.deepEqual(response.results.map((item) => item.resultId), ['unit-verified', 'unit-auto', 'unit-check'])
  assert.deepEqual(response.results.map((item) => item.reliability), ['VERIFIED', 'AUTO', 'TO_VERIFY'])
})

test('K3A: semantic hits are ignored until the semantic channel is explicitly available', () => {
  const semantic = hit({ channel: 'SEMANTIC', resultId: 'unit-semantic', unitId: 'unit-semantic' })
  const disabled = buildKnowledgeRetrievalResponse({
    query: QUERY,
    fullTextHits: [],
    semanticHits: [semantic],
    semanticAvailable: false,
  })

  assert.equal(disabled.results.length, 0)
  assert.deepEqual(disabled.channelsUsed, [])
  assert.equal(disabled.semanticAvailable, false)
})

test('K3A: provider-neutral channel fusion deduplicates the same evidence deterministically', () => {
  const lexical = hit({ resultId: 'unit-shared', unitId: 'unit-shared', channel: 'FULL_TEXT', channelRank: 2 })
  const semantic = hit({ resultId: 'unit-shared', unitId: 'unit-shared', channel: 'SEMANTIC', channelRank: 1 })
  const lexicalOnly = hit({ resultId: 'unit-lexical', unitId: 'unit-lexical', channel: 'FULL_TEXT', channelRank: 1 })

  const response = buildKnowledgeRetrievalResponse({
    query: QUERY,
    fullTextHits: [lexicalOnly, lexical],
    semanticHits: [semantic],
    semanticAvailable: true,
  })

  assert.equal(response.results.length, 2)
  assert.equal(response.results[0].resultId, 'unit-shared')
  assert.deepEqual(response.results[0].channels, ['FULL_TEXT', 'SEMANTIC'])
  assert.deepEqual(response.channelsUsed, ['FULL_TEXT', 'SEMANTIC'])
  assert.equal(response.semanticAvailable, true)
})

test('K3A: empty query never returns contextual guesses', () => {
  const response = buildKnowledgeRetrievalResponse({
    query: { ...QUERY, query: '   ' },
    fullTextHits: [hit()],
    semanticAvailable: false,
  })
  assert.equal(response.query, '')
  assert.deepEqual(response.results, [])
})
