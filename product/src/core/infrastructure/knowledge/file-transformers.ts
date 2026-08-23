import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import type { AssetTransformerPort, PdfNativeTextExtractionPort, VisualExtractionPort, VisualExtractionPage } from '@/core/application/ports/knowledge-base'
import type { NormalizedKnowledge, TransformableAsset } from '@/core/domain/knowledge'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export class InvalidPdfContentError extends Error {
  constructor() {
    super('PDF content is not readable or is incomplete')
    this.name = 'InvalidPdfContentError'
  }
}

export class PdfKnowledgeTransformer implements AssetTransformerPort {
  constructor(
    private readonly visualExtraction?: VisualExtractionPort,
    private readonly nativeExtraction: PdfNativeTextExtractionPort = new UnpdfNativeTextExtraction(),
  ) {}

  supports(asset: TransformableAsset['asset']): boolean {
    return asset.mimeType === PDF_MIME
  }

  async transform(input: TransformableAsset): Promise<NormalizedKnowledge> {
    if (!input.bytes?.length) throw new Error('PDF transformer requires file bytes')

    const native = await extractPdfNativeText(this.nativeExtraction, input.bytes)
    const nativePages = native.pages.map((page) => normalizeExtractedText(page))
    const missingPages = nativePages.flatMap((page, index) => isUsableText(page) ? [] : [index + 1])
    let visualPages: VisualExtractionPage[] = []
    let visualProcessor: string | null = null
    let visualProcessorVersion: string | null = null

    if (missingPages.length) {
      if (!this.visualExtraction) throw new Error('PDF requires visual extraction but no OCR provider is configured')
      const visual = await this.visualExtraction.extract({
        bytes: input.bytes,
        mimeType: PDF_MIME,
        filename: input.asset.originalName ?? 'document.pdf',
        pageNumbers: missingPages,
      })
      visualPages = visual.pages
      visualProcessor = visual.processor
      visualProcessorVersion = visual.processorVersion
    }

    const visualByPage = new Map(visualPages.map((page) => [page.page, page]))
    const pages = Array.from({ length: native.totalPages }, (_, index) => {
      const page = index + 1
      const nativeText = nativePages[index] ?? ''
      if (isUsableText(nativeText)) return { page, text: nativeText, method: 'NATIVE_TEXT' as const, confidence: 1, description: null }
      const visual = visualByPage.get(page)
      return {
        page,
        text: normalizeExtractedText(visual?.text ?? ''),
        method: 'VISUAL_OCR' as const,
        confidence: visual?.confidence ?? null,
        description: visual?.description ?? null,
      }
    })
    const merged = pages.flatMap((page) => [page.text, page.description ? `Descrizione visiva (pagina ${page.page}): ${page.description}` : '']).filter(Boolean).join('\n\n')
    if (!merged) throw new Error('No useful text found in PDF after native and visual extraction')

    return {
      title: cleanFileTitle(input.asset.originalName) ?? inferTitle(merged),
      documentType: 'GENERAL',
      language: 'it',
      text: merged,
      markdown: merged,
      summary: firstSentence(merged),
      extractedData: {
        totalPages: native.totalPages,
        extraction: {
          nativePageCount: pages.filter((page) => page.method === 'NATIVE_TEXT').length,
          visualPageCount: pages.filter((page) => page.method === 'VISUAL_OCR').length,
          visualProcessor,
          visualProcessorVersion,
        },
      },
      units: pages.flatMap((page) => pageUnits(page)),
      processor: missingPages.length ? `${native.processor}+visual-ocr` : native.processor,
      processorVersion: missingPages.length ? `${native.processorVersion}+${visualProcessorVersion ?? 'unknown'}` : native.processorVersion,
    }
  }
}

export class UnpdfNativeTextExtraction implements PdfNativeTextExtractionPort {
  async extract(bytes: Uint8Array) {
    const pdf = await getDocumentProxy(bytes)
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    return {
      totalPages,
      pages: text,
      processor: 'unpdf',
      processorVersion: '1.8.1',
    }
  }
}

export class ImageKnowledgeTransformer implements AssetTransformerPort {
  constructor(private readonly visualExtraction: VisualExtractionPort) {}

  supports(asset: TransformableAsset['asset']): boolean {
    return asset.mimeType?.startsWith('image/') === true
  }

  async transform(input: TransformableAsset): Promise<NormalizedKnowledge> {
    if (!input.bytes?.length || !input.asset.mimeType) throw new Error('Image transformer requires image bytes and MIME type')
    const result = await this.visualExtraction.extract({
      bytes: input.bytes,
      mimeType: input.asset.mimeType,
      filename: input.asset.originalName ?? 'image',
    })
    const page = result.pages[0]
    const text = normalizeExtractedText(page?.text ?? '')
    const description = page?.description?.trim() || null
    const searchable = [text, description].filter(Boolean).join('\n\n')
    if (!searchable) throw new Error('No useful document semantics found in image')

    return {
      title: cleanFileTitle(input.asset.originalName) ?? inferTitle(searchable),
      documentType: 'GENERAL',
      language: 'it',
      text: searchable,
      markdown: searchable,
      summary: firstSentence(description ?? text),
      extractedData: {
        extraction: {
          method: 'VISUAL_OCR',
          processor: result.processor,
          processorVersion: result.processorVersion,
          visualDescription: description,
        },
      },
      units: [
        ...chunkText(text).map((content, ordinal) => ({
          type: 'CHUNK' as const,
          title: ordinal === 0 ? cleanFileTitle(input.asset.originalName) ?? inferTitle(searchable) : null,
          content,
          sourcePage: 1,
          confidence: page?.confidence ?? null,
          structuredData: {
            extractionMethod: 'VISUAL_OCR',
            extractionContentType: 'OCR_TEXT',
            requiresHumanReview: true,
          },
        })),
        ...(description ? [{
          type: 'CHUNK' as const,
          title: 'Descrizione visiva',
          content: description,
          sourcePage: 1,
          confidence: page?.confidence ?? null,
          structuredData: {
            extractionMethod: 'VISUAL_OCR',
            extractionContentType: 'VISUAL_DESCRIPTION',
            requiresHumanReview: true,
          },
        }] : []),
      ],
      processor: result.processor,
      processorVersion: result.processorVersion,
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

async function extractPdfNativeText(nativeExtraction: PdfNativeTextExtractionPort, bytes: Uint8Array) {
  try {
    return await nativeExtraction.extract(bytes)
  } catch {
    throw new InvalidPdfContentError()
  }
}

function cleanFileTitle(name: string | null) {
  if (!name) return null
  return name.replace(/\.(pdf|docx|png|jpe?g|webp)$/i, '').trim().slice(0, 180) || null
}

function normalizeExtractedText(text: string) {
  return text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function isUsableText(text: string) {
  const alphanumeric = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}

function pageUnits(page: { page: number; text: string; method: 'NATIVE_TEXT' | 'VISUAL_OCR'; confidence: number | null; description: string | null }): NormalizedKnowledge['units'] {
  const textUnits = chunkText(page.text).map((content, chunkIndex) => ({
    type: 'CHUNK' as const,
    title: chunkIndex === 0 ? `Pagina ${page.page}` : null,
    content,
    sourcePage: page.page,
    confidence: page.confidence,
    structuredData: {
      extractionMethod: page.method,
      extractionContentType: page.method === 'NATIVE_TEXT' ? 'NATIVE_TEXT' : 'OCR_TEXT',
      requiresHumanReview: page.method === 'VISUAL_OCR',
    },
  }))
  if (!page.description) return textUnits
  return [...textUnits, {
    type: 'CHUNK',
    title: `Descrizione visiva · pagina ${page.page}`,
    content: page.description,
    sourcePage: page.page,
    confidence: page.confidence,
    structuredData: {
      extractionMethod: 'VISUAL_OCR',
      extractionContentType: 'VISUAL_DESCRIPTION',
      requiresHumanReview: true,
    },
  }]
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
