import type {
  AssetContentPort,
  AssetTransformerPort,
  KnowledgeAssetRepository,
  KnowledgeDocumentRepository,
  KnowledgeEnrichmentPort,
  KnowledgeGenerationRepository,
  KnowledgeIngestionLog,
} from '@/core/application/ports/knowledge-base'
import type { CapturedAssetInput, KnowledgeAsset, NormalizedKnowledge } from '@/core/domain/knowledge'

export class KnowledgeIngestionService {
  constructor(
    private readonly assets: KnowledgeAssetRepository,
    private readonly generations: KnowledgeGenerationRepository,
    private readonly documents: KnowledgeDocumentRepository,
    private readonly content: AssetContentPort,
    private readonly transformers: AssetTransformerPort[],
    private readonly log: KnowledgeIngestionLog,
    private readonly enrichment?: KnowledgeEnrichmentPort,
  ) {}

  async ingest(input: CapturedAssetInput): Promise<KnowledgeAsset> {
    if (input.sourceLocator) {
      const existing = await this.assets.findBySource(input.workspaceId, input.sourceProvider, input.sourceLocator)
      if (existing) return existing
    }
    const asset = await this.assets.capture(input)
    return this.process(asset)
  }

  async reprocess(assetId: string): Promise<KnowledgeAsset> {
    const asset = await this.assets.getById(assetId)
    if (!asset) throw new Error('Knowledge asset not found')
    return this.process(asset)
  }

  private async process(asset: KnowledgeAsset): Promise<KnowledgeAsset> {
    const generation = await this.generations.startGeneration(asset)
    let processorLabel = 'unknown'

    try {
      const loaded = await this.content.load(asset)
      const transformer = this.transformers.find((candidate) => candidate.supports(asset))
      if (!transformer) throw new Error(`No transformer available for ${asset.assetKind}/${asset.mimeType ?? 'unknown'}`)
      processorLabel = transformer.constructor.name

      const normalizeRun = await this.log.start({
        workspaceId: asset.workspaceId,
        assetId: asset.id,
        stage: 'NORMALIZE',
        processor: processorLabel,
      })

      let normalized: NormalizedKnowledge
      try {
        normalized = await transformer.transform({ asset, ...loaded })
        processorLabel = `${normalized.processor}@${normalized.processorVersion}`
        await this.log.succeed(normalizeRun, {
          generationId: generation.id,
          generationNo: generation.generationNo,
          unitCount: normalized.units.length,
          documentType: normalized.documentType,
        })
      } catch (error) {
        await this.log.fail(normalizeRun, error)
        throw error
      }

      if (this.enrichment) {
        const enrichRun = await this.log.start({
          workspaceId: asset.workspaceId,
          assetId: asset.id,
          stage: 'ENRICH',
          processor: this.enrichment.constructor.name,
        })
        try {
          normalized = await this.enrichment.enrich(normalized)
          await this.log.succeed(enrichRun, { generationId: generation.id, unitCount: normalized.units.length })
        } catch (error) {
          await this.log.fail(enrichRun, error)
          throw error
        }
      }

      const indexRun = await this.log.start({
        workspaceId: asset.workspaceId,
        assetId: asset.id,
        stage: 'INDEX',
        processor: normalized.processor,
        processorVersion: normalized.processorVersion,
      })

      try {
        const document = await this.documents.upsertNormalized(asset, generation.id, normalized)
        const units = await this.documents.replaceUnits(document, normalized)
        await this.log.succeed(indexRun, {
          generationId: generation.id,
          generationNo: generation.generationNo,
          documentId: document.id,
          unitCount: units.length,
        })
      } catch (error) {
        await this.log.fail(indexRun, error)
        throw error
      }

      await this.generations.succeedGeneration(generation.id, processorLabel)
      await this.assets.setCurrentGeneration(asset.id, generation.id)
      return (await this.assets.getById(asset.id)) ?? asset
    } catch (error) {
      await this.generations.failGeneration(generation.id, error)
      if (!asset.currentGenerationId) await this.assets.setProcessingStatus(asset.id, 'FAILED')
      throw error
    }
  }
}
