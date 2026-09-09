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
      units: chunkKnowledgeText(text).map((content, ordinal) => ({
        type: 'CHUNK',
        title: ordinal === 0 ? title : null,
        content,
        confidence: 1,
      })),
      processor: 'plain-text',
      processorVersion: '1.1.3',
    }
  }
}

function inferTitle(text: string, originalName: string | null) {
  if (originalName) return originalName.replace(/\.[^.]+$/, '')
  const firstLine = text.split(/\r?\n/, 1)[0]?.trim()
  return firstLine ? firstLine.slice(0, 120) : 'Nota'
}

export function chunkKnowledgeText(text: string, maxLength = 1200) {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (!current) return
    chunks.push(current)
    current = ''
  }

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flush()
      continue
    }

    for (const piece of splitLongLine(line, maxLength)) {
      if (!current) {
        current = piece
        continue
      }

      const candidate = `${current}\n${piece}`
      if (candidate.length <= maxLength) {
        current = candidate
      } else {
        flush()
        current = piece
      }
    }
  }

  flush()
  return chunks
}

function splitLongLine(line: string, maxLength: number) {
  const pieces: string[] = []
  let remaining = line.trim()
  const minimumNaturalBoundary = Math.floor(maxLength * 0.6)

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1)
    const naturalBoundary = window.lastIndexOf(' ')
    const cut = naturalBoundary >= minimumNaturalBoundary ? naturalBoundary : maxLength
    const piece = remaining.slice(0, cut).trim()

    if (piece) pieces.push(piece)
    remaining = remaining.slice(cut).trimStart()
  }

  if (remaining) pieces.push(remaining)
  return pieces
}
