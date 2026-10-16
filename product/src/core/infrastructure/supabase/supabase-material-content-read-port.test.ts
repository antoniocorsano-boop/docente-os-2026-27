import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { materializeKnowledgeGenerationRecordV1 } from './supabase-material-content-read-port'

const bytes = new Uint8Array([1, 2, 3, 4])
const sourceSha256 = createHash('sha256').update(bytes).digest('hex')

function input(overrides: Record<string, unknown> = {}) {
  return {
    asset: {
      id: 'asset-1',
      current_generation_id: 'generation-2',
      source_locator: 'storage:knowledge-assets/workspace-1/asset-1/material.pdf',
      original_text: null,
      mime_type: 'application/pdf',
      sha256: sourceSha256,
    },
    generation: {
      id: 'generation-1',
      asset_id: 'asset-1',
      status: 'SUCCEEDED',
    },
    document: {
      id: 'document-1',
      asset_id: 'asset-1',
      generation_id: 'generation-1',
      title: 'Energia',
      document_type: 'TEACHING',
      language: 'it',
      normalized_text: 'Energia e trasformazioni.',
      normalized_markdown: null,
      summary: 'Sintesi.',
      extracted_data: { topic: 'energia' },
    },
    units: [
      {
        document_id: 'document-1',
        ordinal: 0,
        unit_type: 'CHUNK',
        title: 'Introduzione',
        content: 'Energia e trasformazioni.',
        structured_data: { key: true },
        source_page: 1,
        start_offset: 0,
        end_offset: 24,
      },
    ],
    localSourceBytes: bytes,
    ...overrides,
  }
}

test('materializes an exact historical generation without substituting current generation', () => {
  const record = materializeKnowledgeGenerationRecordV1(input())
  assert.equal(record.assetId, 'asset-1')
  assert.equal(record.generationId, 'generation-1')
  assert.equal(record.currentGenerationId, 'generation-2')
  assert.equal(record.generationStatus, 'SUCCEEDED')
  assert.equal(record.snapshot?.document.normalizedText, 'Energia e trasformazioni.')
})

test('local storage bytes are immutable captured content and participate in the snapshot', () => {
  const record = materializeKnowledgeGenerationRecordV1(input())
  assert.equal(record.sourceIsImmutableLocal, true)
  assert.equal(record.sourceContentAvailable, true)
  assert.equal(record.sourceSha256MatchesBytes, true)
  assert.equal(record.snapshot?.referencedBinaryContent.length, 1)
  assert.equal(record.snapshot?.referencedBinaryContent[0]?.ref, 'storage:knowledge-assets/workspace-1/asset-1/material.pdf')
  assert.deepEqual(record.snapshot?.referencedBinaryContent[0]?.bytes, bytes)
})

test('loaded bytes that do not match declared source SHA are surfaced as mismatch', () => {
  const record = materializeKnowledgeGenerationRecordV1(
    input({
      asset: {
        ...(input().asset as Record<string, unknown>),
        sha256: 'f'.repeat(64),
      },
    }),
  )
  assert.equal(record.sourceSha256MatchesBytes, false)
})

test('external URL without captured original text or local bytes remains mutable-only', () => {
  const base = input()
  const record = materializeKnowledgeGenerationRecordV1({
    ...base,
    asset: {
      ...(base.asset as Record<string, unknown>),
      source_locator: 'https://example.test/live.pdf',
      sha256: null,
    },
    localSourceBytes: null,
  })
  assert.equal(record.sourceIsImmutableLocal, false)
  assert.equal(record.sourceContentAvailable, false)
  assert.equal(record.sourceSha256MatchesBytes, true)
  assert.equal(record.snapshot?.referencedBinaryContent.length, 0)
})

test('captured original text is exact local content even when the source locator is external', () => {
  const base = input()
  const record = materializeKnowledgeGenerationRecordV1({
    ...base,
    asset: {
      ...(base.asset as Record<string, unknown>),
      source_locator: 'https://example.test/page',
      original_text: 'Copia acquisita del contenuto.',
      mime_type: 'text/plain',
      sha256: null,
    },
    localSourceBytes: null,
  })
  assert.equal(record.sourceIsImmutableLocal, false)
  assert.equal(record.sourceContentAvailable, true)
  assert.equal(record.snapshot?.assetContent.originalText, 'Copia acquisita del contenuto.')
})

test('document or generation context mismatch fails while materializing instead of being repaired silently', () => {
  assert.throws(
    () =>
      materializeKnowledgeGenerationRecordV1(
        input({
          generation: { id: 'generation-other', asset_id: 'asset-1', status: 'SUCCEEDED' },
        }),
      ),
    /generation context/i,
  )

  assert.throws(
    () =>
      materializeKnowledgeGenerationRecordV1(
        input({
          document: {
            ...(input().document as Record<string, unknown>),
            asset_id: 'asset-other',
          },
        }),
      ),
    /document context/i,
  )
})
