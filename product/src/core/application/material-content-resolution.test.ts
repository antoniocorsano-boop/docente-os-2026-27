import assert from 'node:assert/strict'
import test from 'node:test'
import { digestMaterialContentV1, type MaterialContentSnapshotV1 } from './material-content-digest'
import {
  resolveCanonicalMaterialContentV1,
  type KnowledgeGenerationMaterialRecordV1,
  type MaterialContentReadPortV1,
} from './material-content-resolution'
import type { CanonicalMaterialRefV1 } from '@/core/domain/lesson-material-binding'

function snapshot(): MaterialContentSnapshotV1 {
  return {
    assetContent: {
      originalText: 'Materiale esatto della lezione.',
      mimeType: 'text/plain',
      sourceSha256: null,
    },
    document: {
      title: 'Materiale energia',
      documentType: 'TEACHING',
      language: 'it',
      normalizedText: 'Materiale esatto della lezione.',
      normalizedMarkdown: null,
      summary: 'Sintesi.',
      extractedData: { topic: 'energia' },
    },
    units: [
      {
        ordinal: 0,
        unitType: 'CHUNK',
        title: 'Introduzione',
        content: 'Materiale esatto della lezione.',
        structuredData: {},
        sourcePage: null,
        startOffset: 0,
        endOffset: 31,
      },
    ],
    referencedBinaryContent: [],
  }
}

function record(overrides: Partial<KnowledgeGenerationMaterialRecordV1> = {}): KnowledgeGenerationMaterialRecordV1 {
  return {
    assetId: 'asset-1',
    generationId: 'generation-1',
    generationStatus: 'SUCCEEDED',
    currentGenerationId: 'generation-2',
    sourceLocator: null,
    sourceIsImmutableLocal: true,
    sourceContentAvailable: true,
    sourceSha256MatchesBytes: true,
    snapshot: snapshot(),
    ...overrides,
  }
}

function knowledgeRef(content = snapshot()): CanonicalMaterialRefV1 {
  return {
    kind: 'KNOWLEDGE_GENERATION',
    assetId: 'asset-1',
    generationId: 'generation-1',
    contentDigest: digestMaterialContentV1(content),
  }
}

class FakeReadPort implements MaterialContentReadPortV1 {
  constructor(private readonly value: KnowledgeGenerationMaterialRecordV1 | null) {}

  async readKnowledgeGeneration() {
    return this.value
  }
}

test('exact historical generation resolves READY when its content digest still matches', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(record()),
  })

  assert.equal(result.status, 'READY')
  if (result.status === 'READY') {
    assert.equal(result.actualDigest.value, knowledgeRef().contentDigest.value)
    assert.equal(result.snapshot.document.title, 'Materiale energia')
  }
})

test('missing exact asset/generation fails closed', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(null),
  })
  assert.deepEqual(result, { status: 'MISSING', reason: 'KNOWLEDGE_GENERATION_NOT_FOUND' })
})

test('non-succeeded generation fails closed even when content is present', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(record({ generationStatus: 'FAILED' })),
  })
  assert.deepEqual(result, { status: 'INCOMPLETE', reason: 'GENERATION_NOT_SUCCEEDED' })
})

test('missing content-bearing document fails closed', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(record({ snapshot: null })),
  })
  assert.deepEqual(result, { status: 'INCOMPLETE', reason: 'CONTENT_SNAPSHOT_UNAVAILABLE' })
})

test('mutable remote binary source without immutable local content fails closed', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(
      record({
        sourceLocator: 'https://example.test/live-material.pdf',
        sourceIsImmutableLocal: false,
        sourceContentAvailable: false,
      }),
    ),
  })
  assert.deepEqual(result, { status: 'INCOMPLETE', reason: 'MUTABLE_SOURCE_ONLY' })
})

test('source SHA mismatch against loaded immutable bytes fails closed', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(record({ sourceSha256MatchesBytes: false })),
  })
  assert.deepEqual(result, { status: 'INCOMPLETE', reason: 'SOURCE_SHA256_MISMATCH' })
})

test('same generation identity with changed exact content resolves STALE', async () => {
  const changed = snapshot()
  changed.document.normalizedText = 'Contenuto modificato sotto la stessa generazione.'
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: knowledgeRef(),
    readPort: new FakeReadPort(record({ snapshot: changed })),
  })

  assert.equal(result.status, 'STALE')
  if (result.status === 'STALE') {
    assert.equal(result.expectedDigest.value, knowledgeRef().contentDigest.value)
    assert.notEqual(result.actualDigest.value, result.expectedDigest.value)
  }
})

test('immutable revision ref fails closed until an authoritative revision store exists', async () => {
  const result = await resolveCanonicalMaterialContentV1({
    workspaceId: 'workspace-1',
    ref: {
      kind: 'IMMUTABLE_REVISION',
      assetId: 'asset-1',
      revisionRef: 'revision-1',
      contentDigest: digestMaterialContentV1(snapshot()),
    },
    readPort: new FakeReadPort(record()),
  })

  assert.deepEqual(result, { status: 'UNSUPPORTED_REFERENCE', reason: 'IMMUTABLE_REVISION_STORE_UNAVAILABLE' })
})
