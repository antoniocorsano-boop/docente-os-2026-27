import type { AssetTransformerPort } from '@/core/application/ports/knowledge-base'
import type { NormalizedKnowledge, TransformableAsset } from '@/core/domain/knowledge'
import {
  isLocalPdfTextDerivativeFilename,
  meaningfulKnowledgeSummary,
  normalizeKnowledgeWorkingText,
} from '@/core/domain/knowledge-text-quality'

export class PlainTextKnowledgeTransformer implements AssetTransformerPort {
  supports(asset: TransformableAsset['asset']): boolean {
    return asset.assetKind === 'NOTE' || asset.mimeType?.startsWith('text/') === true
  }

  async transform(input: TransformableAsset): Promise<NormalizedKnowledge> {
    const sourceText = input.text?.trim()
    if (!sourceText) throw new Error('Plain text transformer requires non-empty text')

    const localPdfTextDerivative = isLocalPdfTextDerivativeFilename(input.asset.originalName)
    const quality = normalizeKnowledgeWorkingText(sourceText, { localPdfTextDerivative })
    const text = quality.text
    if (!text) throw new Error('Plain text transformer produced an empty working copy')

    const title = inferTitle(text, input.asset.originalName)

    return {
      title,
      documentType: 'GENERAL',
      language: 'it',
      text,
      markdown: text,
      summary: meaningfulKnowledgeSummary(text),
      extractedData: localPdfTextDerivative
        ? {
            workingCopy: {
              mode: 'LOCAL_PDF_TEXT_DERIVATIVE',
              removedBoilerplateLines: quality.removedBoilerplateLines,
              sourcePreserved: true,
            },
          }
        : {},
      units: chunkText(text).map((content, ordinal) => ({
        type: 'CHUNK',
        title: ordinal === 0 ? title : null,
        content,
        confidence: 1,
      })),
      processor: 'plain-text',
      processorVersion: '1.1.2',
    }
  }
}

function inferTitle(text: string, originalName: string | null) {
  if (originalName) return originalName.replace(/\.[^.]+$/, '')
  const firstLine = text.split(/\r?\n/, 1)[0]?.trim()
  return firstLine ? firstLine.slice(0, 120) : 'Nota'
}

function chunkText(text: string, maxLength = 1200) {
  const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (!current) {
      current = paragraph
      continue
    }
    if (`${current}\n\n${paragraph}`.length <= maxLength) {
      current = `${current}\n\n${paragraph}`
    } else {
      chunks.push(current)
      current = paragraph
    }
  }

  if (current) chunks.push(current)
  return chunks
}
