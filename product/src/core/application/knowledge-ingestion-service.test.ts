import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  AssetContentPort,
  AssetTransformerPort,
  KnowledgeAssetRepository,
  KnowledgeDocumentRepository,
  KnowledgeGenerationRepository,
  KnowledgeIngestionLog,
} from '@/core/application/ports/knowledge-base'
import type { CapturedAssetInput, KnowledgeAsset, KnowledgeProcessingGeneration } from '@/core/domain/knowledge'
import { KnowledgeIngestionService } from './knowledge-ingestion-service.ts'

test('Errore OCR: registra FAILED e conserva la generazione corrente', async () => {
  const assets = new MemoryAssets()
  const generations = new MemoryGenerations()
  const service = new KnowledgeIngestionService(
    assets,
    generations,
    noDocuments,
    emptyContent,
    [failingTransformer],
    noLog,
  )

  await assert.rejects(() => service.reprocess(assets.asset.id), /OCR non disponibile/)

  assert.equal(generations.failed, true)
  assert.equal(assets.asset.currentGenerationId, 'generation-stable')
  assert.equal(assets.currentGenerationUpdates, 0)
  assert.equal(assets.statusUpdates, 0)
})

class MemoryAssets implements KnowledgeAssetRepository {
  currentGenerationUpdates = 0
  statusUpdates = 0
  asset: KnowledgeAsset = {
    id: 'asset-1', workspaceId: 'workspace-1', academicYearId: null, assetKind: 'FILE', sourceProvider: 'UPLOAD',
    sourceLocator: 'storage:test', originalName: 'scansione.pdf', originalText: null, mimeType: 'application/pdf', byteSize: 3,
    sha256: null, processingStatus: 'INDEXED', sourceMetadata: {}, currentGenerationId: 'generation-stable',
    capturedAt: '2026-08-21T00:00:00Z', createdBy: 'user-1', createdAt: '2026-08-21T00:00:00Z', updatedAt: '2026-08-21T00:00:00Z',
  }

  async capture(_input: CapturedAssetInput) { return this.asset }
  async setProcessingStatus() { this.statusUpdates += 1 }
  async setCurrentGeneration() { this.currentGenerationUpdates += 1 }
  async getById() { return this.asset }
}

class MemoryGenerations implements KnowledgeGenerationRepository {
  failed = false
  generation: KnowledgeProcessingGeneration = {
    id: 'generation-new', assetId: 'asset-1', workspaceId: 'workspace-1', generationNo: 2, status: 'RUNNING',
    processorLabel: null, startedAt: '2026-08-21T00:00:00Z', finishedAt: null, errorMessage: null, createdAt: '2026-08-21T00:00:00Z',
  }

  async startGeneration() { return this.generation }
  async succeedGeneration() {}
  async failGeneration() { this.failed = true }
  async listGenerations() { return [this.generation] }
}

const failingTransformer: AssetTransformerPort = {
  supports: () => true,
  async transform() { throw new Error('OCR non disponibile') },
}

const emptyContent: AssetContentPort = { async load() { return { bytes: new Uint8Array([1]) } } }

const noDocuments: KnowledgeDocumentRepository = {
  async upsertNormalized() { throw new Error('non previsto') },
  async replaceUnits() { return [] },
}

const noLog: KnowledgeIngestionLog = {
  async start() { return 'run-1' },
  async succeed() {},
  async fail() {},
}
