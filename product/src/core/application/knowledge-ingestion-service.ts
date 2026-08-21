import type {
  AssetContentPort,
  AssetTransformerPort,
  KnowledgeAssetRepository,
  KnowledgeDocumentRepository,
  KnowledgeEnrichmentPort,
  KnowledgeIngestionLog,
} from '@/core/application/ports/knowledge-base'
import type { CapturedAssetInput, KnowledgeAsset, NormalizedKnowledge } from '@/core/domain/knowledge'

export class KnowledgeIngestionService {
  constructor(
    private readonly assets: KnowledgeAssetRepository,
    private readonly documents: KnowledgeDocumentRepository,
    private readonly content: AssetContentPort,
    private readonly transformers: AssetTransformerPort[],
    private readonly log: KnowledgeIngestionLog,
    private readonly enrichment?: KnowledgeEnrichmentPort,
  ) {}

  async ingest(input: CapturedAssetInput): Promise<KnowledgeAsset> {
    const asset = await this.assets.capture(input)

    try {
      const loaded = await this.content.load(asset)
      const transformer = this.transformers.find((candidate) => candidate.supports(asset))
      if (!transformer) throw new Error(`No transformer available for ${asset.assetKind}/${asset.mimeType ?? 'unknown'}`)

      const normalizeRun = await this.log.start({
        workspaceId: asset.workspaceId,
        assetId: asset.id,
        stage: 'NORMALIZE',
        processor: transformer.constructor.name,
      })

      let normalized: NormalizedKnowledge
      try {
        normalized = await transformer.transform({ asset, ...loaded })
        await this.log.succeed(normalizeRun, {
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
          await this.log.succeed(enrichRun, { unitCount: normalized.units.length })
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
        const document = await this.documents.upsertNormalized(asset, normalized)
        const units = await this.documents.replaceUnits(document, normalized)
        await this.assets.setProcessingStatus(asset.id, 'INDEXED')
        await this.log.succeed(indexRun, { documentId: document.id, unitCount: units.length })
      } catch (error) {
        await this.log.fail(indexRun, error)
        throw error
      }

      return (await this.assets.getById(asset.id)) ?? asset
    } catch (error) {
      await this.assets.setProcessingStatus(asset.id, 'FAILED')
      throw error
    }
  }
}
