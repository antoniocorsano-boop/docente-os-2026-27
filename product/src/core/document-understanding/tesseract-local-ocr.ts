import { createWorker, OEM, type Worker } from 'tesseract.js'
import type {
  LocalDocumentPoint,
  LocalDocumentTextItem,
} from './local-document-understanding'

type TesseractWordLike = Readonly<{
  text?: unknown
  confidence?: unknown
  bbox?: Readonly<{ x0?: unknown; y0?: unknown; x1?: unknown; y1?: unknown }>
}>

let workerPromise: Promise<Worker> | null = null

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function mapTesseractWordsToLocalDocumentTextItems(
  words: readonly TesseractWordLike[],
  page: number,
  offset: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
): LocalDocumentTextItem[] {
  const items: LocalDocumentTextItem[] = []

  for (const word of words) {
    const text = typeof word.text === 'string' ? word.text.trim() : ''
    const x0 = finite(word.bbox?.x0)
    const y0 = finite(word.bbox?.y0)
    const x1 = finite(word.bbox?.x1)
    const y1 = finite(word.bbox?.y1)
    if (!text || x0 === null || y0 === null || x1 === null || y1 === null || x1 <= x0 || y1 <= y0) {
      continue
    }

    const rawConfidence = finite(word.confidence)
    const confidence = rawConfidence === null
      ? null
      : Math.min(1, Math.max(0, rawConfidence / 100))

    const polygon: LocalDocumentPoint[] = [
      { x: x0 + offset.x, y: y0 + offset.y },
      { x: x1 + offset.x, y: y0 + offset.y },
      { x: x1 + offset.x, y: y1 + offset.y },
      { x: x0 + offset.x, y: y1 + offset.y },
    ]

    items.push({ text, confidence, polygon, page })
  }

  return items
}

function wordsFromBlocks(blocks: unknown): TesseractWordLike[] {
  if (!Array.isArray(blocks)) return []
  const words: TesseractWordLike[] = []

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const paragraphs = (block as { paragraphs?: unknown }).paragraphs
    if (!Array.isArray(paragraphs)) continue
    for (const paragraph of paragraphs) {
      if (!paragraph || typeof paragraph !== 'object') continue
      const lines = (paragraph as { lines?: unknown }).lines
      if (!Array.isArray(lines)) continue
      for (const line of lines) {
        if (!line || typeof line !== 'object') continue
        const lineWords = (line as { words?: unknown }).words
        if (!Array.isArray(lineWords)) continue
        words.push(...(lineWords as TesseractWordLike[]))
      }
    }
  }

  return words
}

async function createLocalWorker(): Promise<Worker> {
  return createWorker('ita', OEM.LSTM_ONLY, {
    workerPath: '/local-ocr/worker.min.js',
    corePath: '/local-ocr/core',
    langPath: '/local-ocr/lang',
    gzip: true,
    workerBlobURL: false,
    logger: () => {},
  })
}

async function worker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createLocalWorker().catch((error) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

export async function recognizeLocalDocumentImage(input: {
  image: Blob | HTMLCanvasElement
  page: number
  offset?: Readonly<{ x: number; y: number }>
}): Promise<LocalDocumentTextItem[]> {
  const instance = await worker()
  const result = await instance.recognize(input.image, undefined, {
    text: true,
    blocks: true,
  })

  return mapTesseractWordsToLocalDocumentTextItems(
    wordsFromBlocks(result.data.blocks),
    input.page,
    input.offset ?? { x: 0, y: 0 },
  )
}

export async function disposeLocalDocumentOcr(): Promise<void> {
  const current = workerPromise
  workerPromise = null
  if (!current) return
  const instance = await current.catch(() => null)
  await instance?.terminate()
}
