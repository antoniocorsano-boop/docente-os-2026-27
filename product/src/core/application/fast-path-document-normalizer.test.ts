import assert from 'node:assert/strict'
import test from 'node:test'
import type { AssetTransformerPort } from '@/core/application/ports/knowledge-base'
import {
  CANONICAL_DOCUMENT_SCHEMA,
  canDisposeIngressPayload,
  ingressArtifactFromTransformableAsset,
} from '@/core/domain/document-intake'
import type { KnowledgeAsset, TransformableAsset } from '@/core/domain/knowledge'
import { FastPathDocumentNormalizer } from './fast-path-document-normalizer'

const asset: KnowledgeAsset = {
  id: 'asset-1',
  workspaceId: 'workspace-1',
  academicYearId: null,
  assetKind: 'FILE',
  sourceProvider: 'UPLOAD',
  sourceLocator: 'storage:knowledge-assets/workspace-1/file.pdf',
  originalName: 'circolare.pdf',
  originalText: null,
  mimeType: 'application/pdf',
  byteSize: 1200,
  sha256: 'abc123',
  processingStatus: 'CAPTURED',
  sourceMetadata: {},
  currentGenerationId: null,
  contentCategory: 'CIRCULAR',
  disciplines: [],
  classLabels: [],
  contextStatus: 'UNCLASSIFIED',
  reliability: 'AUTO',
  capturedAt: '2026-09-29T00:00:00Z',
  createdBy: 'user-1',
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
}

const source: TransformableAsset = { asset, bytes: new Uint8Array([1, 2, 3]) }

test('fast path riusa il transformer esistente e aggiunge il contratto canonico senza cambiare il normalized payload', async () => {
  const transformer: AssetTransformerPort = {
    supports: (candidate) => candidate.mimeType === 'application/pdf',
    async transform() {
      return {
        title: 'Circolare',
        documentType: 'CIRCULAR',
        language: 'it',
        text: 'Testo normalizzato',
        markdown: 'Testo normalizzato',
        summary: 'Testo normalizzato',
        extractedData: {
          extraction: {
            unresolvedVisualPages: [2],
          },
        },
        units: [{
          type: 'CHUNK',
          content: 'Testo normalizzato',
          sourcePage: 1,
          structuredData: { requiresHumanReview: true },
        }],
        processor: 'unpdf+visual-ocr',
        processorVersion: '1.8.1+v1',
      }
    },
  }

  const artifact = ingressArtifactFromTransformableAsset(source, {
    intakeId: 'intake-1',
    sourceProvider: 'SHARE_TARGET',
    retentionClass: 'TRANSIENT',
    payloadRef: 'LOCAL',
  })
  const result = await new FastPathDocumentNormalizer([transformer]).normalize({ artifact, source })

  assert.equal(result.schema, CANONICAL_DOCUMENT_SCHEMA)
  assert.equal(result.artifact.sourceProvider, 'SHARE_TARGET')
  assert.equal(result.normalized.documentType, 'CIRCULAR')
  assert.deepEqual(result.quality.uncertainPages, [2])
  assert.equal(result.quality.requiresReview, true)
  assert.deepEqual(result.quality.extractionMethods, ['unpdf', 'visual-ocr'])
  assert.deepEqual((result.normalized.extractedData?.canonical as Record<string, unknown>).schema, CANONICAL_DOCUMENT_SCHEMA)
})

test('payload transitorio non è eliminabile prima che la generazione canonica sia pubblicata e tracciata', () => {
  const base = {
    retentionClass: 'TRANSIENT' as const,
    generationId: 'generation-2',
    generationStatus: 'SUCCEEDED' as const,
    currentGenerationId: 'generation-2',
    provenancePersisted: true,
    canonicalDocumentPersisted: true,
    requiredUnitsPersisted: true,
  }

  assert.equal(canDisposeIngressPayload(base), true)
  assert.equal(canDisposeIngressPayload({ ...base, generationStatus: 'RUNNING' }), false)
  assert.equal(canDisposeIngressPayload({ ...base, currentGenerationId: 'generation-1' }), false)
  assert.equal(canDisposeIngressPayload({ ...base, provenancePersisted: false }), false)
  assert.equal(canDisposeIngressPayload({ ...base, retentionClass: 'ARCHIVE_REQUIRED' }), false)
})

test('adapter fast path segnala correttamente quando nessun transformer corrente supporta il formato', async () => {
  const artifact = ingressArtifactFromTransformableAsset(source, {
    intakeId: 'intake-2',
    retentionClass: 'TRANSIENT',
  })
  const normalizer = new FastPathDocumentNormalizer([])

  assert.equal(normalizer.supports({ artifact, source }), false)
  await assert.rejects(
    () => normalizer.normalize({ artifact, source }),
    /No document normalizer is available/,
  )
})
