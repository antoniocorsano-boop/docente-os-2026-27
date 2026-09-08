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

const PROFILE_CATEGORIES = new Set([
  'CIRCULAR', 'MODEL', 'PROGRAMMING', 'UDA', 'ASSESSMENT', 'TEACHING_RESOURCE', 'COMMUNICATION', 'CURRICULUM', 'REPORT', 'OTHER',
])

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
      await this.applySuggestedContext(asset.id, normalized)
      return (await this.assets.getById(asset.id)) ?? asset
    } catch (error) {
      await this.generations.failGeneration(generation.id, error)
      if (!asset.currentGenerationId) await this.assets.setProcessingStatus(asset.id, 'FAILED')
      throw error
    }
  }

  private async applySuggestedContext(assetId: string, normalized: NormalizedKnowledge) {
    const rawProfile = normalized.extractedData?.schoolDocumentProfile
    if (!isRecord(rawProfile)) return

    const rawCategory = typeof rawProfile.suggestedCategory === 'string' ? rawProfile.suggestedCategory : 'OTHER'
    const contentCategory = PROFILE_CATEGORIES.has(rawCategory)
      ? rawCategory as KnowledgeAsset['contentCategory']
      : 'OTHER'
    const disciplines = stringArray(rawProfile.disciplines)
    const classLabels = stringArray(rawProfile.classLabels)
    const qualityFlags = stringArray(rawProfile.qualityFlags)
    const meaningful = contentCategory !== 'OTHER' || disciplines.length > 0 || classLabels.length > 0 || qualityFlags.length > 0
    if (!meaningful) return

    // Re-read immediately before applying automatic suggestions. Reprocessing can be long:
    // if the teacher corrected the context while it was running, that newer human state wins.
    const currentAsset = await this.assets.getById(assetId)
    if (!currentAsset || currentAsset.contextStatus === 'REVIEWED' || currentAsset.reliability === 'VERIFIED') return

    await this.assets.updateContext(assetId, {
      academicYearId: currentAsset.academicYearId,
      contentCategory,
      disciplines,
      classLabels,
      contextStatus: 'NEEDS_REVIEW',
      reliability: 'AUTO',
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(0, 20)
    : []
}