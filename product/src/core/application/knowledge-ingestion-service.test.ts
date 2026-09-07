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
import type {
  CapturedAssetInput,
  KnowledgeAsset,
  KnowledgeAssetContextInput,
  KnowledgeDocument,
  KnowledgeProcessingGeneration,
  NormalizedKnowledge,
} from '@/core/domain/knowledge'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'

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

test('Drive: la stessa identità sorgente non crea un secondo asset', async () => {
  const assets = new MemoryAssets()
  assets.asset = { ...assets.asset, sourceProvider: 'DRIVE', sourceLocator: 'drive:file-1' }
  let transformed = false
  const service = new KnowledgeIngestionService(
    assets,
    new MemoryGenerations(),
    noDocuments,
    emptyContent,
    [{ supports: () => true, async transform() { transformed = true; throw new Error('non previsto') } }],
    noLog,
  )

  const result = await service.ingest({ workspaceId: assets.asset.workspaceId, assetKind: 'FILE', sourceProvider: 'DRIVE', sourceLocator: 'drive:file-1' })

  assert.equal(result.id, assets.asset.id)
  assert.equal(transformed, false)
})

test('Il profilo scolastico precompila il contesto come suggerimento da verificare', async () => {
  const assets = new MemoryAssets()
  assets.asset = {
    ...assets.asset,
    currentGenerationId: null,
    processingStatus: 'CAPTURED',
    contextStatus: 'UNCLASSIFIED',
    reliability: 'AUTO',
  }
  const service = successfulService(assets)

  await service.reprocess(assets.asset.id)

  assert.deepEqual(assets.lastContext, {
    academicYearId: null,
    contentCategory: 'CURRICULUM',
    disciplines: ['Tecnologia'],
    classLabels: ['Classe prima'],
    contextStatus: 'NEEDS_REVIEW',
    reliability: 'TO_VERIFY',
  })
})

test('Una rielaborazione non sovrascrive il contesto già controllato dall’utente', async () => {
  const assets = new MemoryAssets()
  assets.asset = {
    ...assets.asset,
    currentGenerationId: 'generation-stable',
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    contentCategory: 'CURRICULUM',
    disciplines: ['Tecnologia'],
  }
  const service = successfulService(assets)

  await service.reprocess(assets.asset.id)

  assert.equal(assets.lastContext, null)
})

class MemoryAssets implements KnowledgeAssetRepository {
  currentGenerationUpdates = 0
  statusUpdates = 0
  lastContext: KnowledgeAssetContextInput | null = null
  asset: KnowledgeAsset = {
    id: 'asset-1', workspaceId: 'workspace-1', academicYearId: null, assetKind: 'FILE', sourceProvider: 'UPLOAD',
    sourceLocator: 'storage:test', originalName: 'scansione.pdf', originalText: null, mimeType: 'application/pdf', byteSize: 3,
    sha256: null, processingStatus: 'INDEXED', sourceMetadata: {}, currentGenerationId: 'generation-stable',
    contentCategory: 'OTHER', disciplines: [], classLabels: [], contextStatus: 'UNCLASSIFIED', reliability: 'AUTO',
    capturedAt: '2026-08-21T00:00:00Z', createdBy: 'user-1', createdAt: '2026-08-21T00:00:00Z', updatedAt: '2026-08-21T00:00:00Z',
  }

  async capture(_input: CapturedAssetInput) { return this.asset }
  async setProcessingStatus() { this.statusUpdates += 1 }
  async setCurrentGeneration(_assetId: string, generationId: string) {
    this.currentGenerationUpdates += 1
    this.asset = { ...this.asset, currentGenerationId: generationId, processingStatus: 'INDEXED' }
  }
  async getById() { return this.asset }
  async findBySource(_workspaceId: string, _sourceProvider: KnowledgeAsset['sourceProvider'], sourceLocator: string) {
    return sourceLocator === this.asset.sourceLocator ? this.asset : null
  }
  async updateContext(_assetId: string, input: KnowledgeAssetContextInput) {
    this.lastContext = input
  }
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

class MemoryDocuments implements KnowledgeDocumentRepository {
  async upsertNormalized(asset: KnowledgeAsset, generationId: string, normalized: NormalizedKnowledge): Promise<KnowledgeDocument> {
    return {
      id: 'document-1',
      assetId: asset.id,
      generationId,
      workspaceId: asset.workspaceId,
      title: normalized.title ?? null,
      documentType: normalized.documentType,
      language: normalized.language ?? 'it',
      normalizedText: normalized.text ?? null,
      normalizedMarkdown: normalized.markdown ?? null,
      summary: normalized.summary ?? null,
      extractedData: normalized.extractedData ?? {},
      processingVersion: `${normalized.processor}@${normalized.processorVersion}`,
      createdAt: '2026-08-21T00:00:00Z',
      updatedAt: '2026-08-21T00:00:00Z',
    }
  }
  async replaceUnits() { return [] }
}

function successfulService(assets: MemoryAssets) {
  const transformer: AssetTransformerPort = {
    supports: () => true,
    async transform() {
      return {
        documentType: 'GENERAL',
        text: 'Curricolo verticale di Tecnologia',
        units: [],
        processor: 'fixture',
        processorVersion: '1',
      }
    },
  }
  const enrichment = {
    async enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge> {
      return {
        ...input,
        extractedData: {
          schoolDocumentProfile: {
            suggestedCategory: 'CURRICULUM',
            disciplines: ['Tecnologia'],
            classLabels: ['Classe prima'],
            qualityFlags: ['INSTITUTION_NAME_CANONICALIZATION_REQUIRED'],
            institutionalStatus: 'PROPOSAL',
          },
        },
      }
    },
  }
  return new KnowledgeIngestionService(
    assets,
    new MemoryGenerations(),
    new MemoryDocuments(),
    emptyContent,
    [transformer],
    noLog,
    enrichment,
  )
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
