import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import type { AssetTransformerPort } from '@/core/application/ports/knowledge-base'
import type { NormalizedKnowledge, TransformableAsset } from '@/core/domain/knowledge'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export class PdfKnowledgeTransformer implements AssetTransformerPort {
  supports(asset: TransformableAsset['asset']): boolean {
    return asset.mimeType === PDF_MIME
  }

  async transform(input: TransformableAsset): Promise<NormalizedKnowledge> {
    if (!input.bytes?.length) throw new Error('PDF transformer requires file bytes')

    const pdf = await getDocumentProxy(input.bytes)
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pages = text.map((page) => page.trim())
    const merged = pages.filter(Boolean).join('\n\n')
    if (!merged) throw new Error('No extractable text found in PDF')

    return {
      title: cleanFileTitle(input.asset.originalName) ?? inferTitle(merged),
      documentType: 'GENERAL',
      language: 'it',
      text: merged,
      markdown: merged,
      summary: firstSentence(merged),
      extractedData: { totalPages },
      units: pages.flatMap((page, pageIndex) => chunkText(page).map((content, chunkIndex) => ({
        type: 'CHUNK' as const,
        title: chunkIndex === 0 ? `Pagina ${pageIndex + 1}` : null,
        content,
        sourcePage: pageIndex + 1,
        confidence: 1,
      }))),
      processor: 'unpdf',
      processorVersion: '1.8.1',
    }
  }
}

export class DocxKnowledgeTransformer implements AssetTransformerPort {
  supports(asset: TransformableAsset['asset']): boolean {
    return asset.mimeType === DOCX_MIME
  }

  async transform(input: TransformableAsset): Promise<NormalizedKnowledge> {
    if (!input.bytes?.length) throw new Error('DOCX transformer requires file bytes')

    const result = await mammoth.extractRawText({ buffer: Buffer.from(input.bytes) })
    const text = result.value.trim()
    if (!text) throw new Error('No extractable text found in DOCX')

    return {
      title: cleanFileTitle(input.asset.originalName) ?? inferTitle(text),
      documentType: 'GENERAL',
      language: 'it',
      text,
      markdown: text,
      summary: firstSentence(text),
      extractedData: {
        conversionMessages: result.messages.map((message) => ({ type: message.type, message: message.message })),
      },
      units: chunkText(text).map((content, ordinal) => ({
        type: 'CHUNK' as const,
        title: ordinal === 0 ? cleanFileTitle(input.asset.originalName) ?? inferTitle(text) : null,
        content,
        confidence: 1,
      })),
      processor: 'mammoth-raw-text',
      processorVersion: '1.12.1',
    }
  }
}

function cleanFileTitle(name: string | null) {
  if (!name) return null
  return name.replace(/\.(pdf|docx)$/i, '').trim().slice(0, 180) || null
}

function inferTitle(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0]?.trim()
  return firstLine ? firstLine.slice(0, 180) : 'Documento'
}

function firstSentence(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/^(.{1,400}?[.!?])(?:\s|$)/s)
  return (match?.[1] ?? normalized.slice(0, 400)).trim()
}

function chunkText(text: string, maxLength = 1200) {
  if (!text.trim()) return []
  const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs.length ? paragraphs : [text.trim()]) {
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
