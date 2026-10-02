import type {
  LocalDocumentPoint,
  LocalDocumentTextItem,
} from './local-document-understanding'

type PaddleOcrItemLike = Readonly<{
  text?: unknown
  score?: unknown
  poly?: unknown
}>

type PaddleOcrResultLike = Readonly<{
  items?: readonly PaddleOcrItemLike[]
}>

type PaddleOcrLike = Readonly<{
  predict: (input: Blob | HTMLCanvasElement) => Promise<readonly PaddleOcrResultLike[]>
  dispose?: () => void | Promise<void>
}>

let runtimePromise: Promise<PaddleOcrLike> | null = null

export type LocalOcrOffset = Readonly<{ x: number; y: number }>

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizePolygon(value: unknown, offset: LocalOcrOffset): LocalDocumentPoint[] {
  if (!Array.isArray(value)) return []
  const points: LocalDocumentPoint[] = []

  for (const raw of value) {
    if (!Array.isArray(raw) || raw.length < 2) continue
    const x = asFiniteNumber(raw[0])
    const y = asFiniteNumber(raw[1])
    if (x === null || y === null) continue
    points.push({ x: x + offset.x, y: y + offset.y })
  }

  return points
}

export function mapPaddleItemsToLocalDocumentTextItems(
  items: readonly PaddleOcrItemLike[],
  page: number,
  offset: LocalOcrOffset = { x: 0, y: 0 },
): LocalDocumentTextItem[] {
  const output: LocalDocumentTextItem[] = []

  for (const item of items) {
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (!text) continue

    const polygon = normalizePolygon(item.poly, offset)
    if (polygon.length < 4) continue

    const rawScore = asFiniteNumber(item.score)
    const confidence = rawScore === null ? null : Math.min(1, Math.max(0, rawScore))

    output.push({
      text,
      confidence,
      polygon,
      page,
    })
  }

  return output
}

async function createRuntime(): Promise<PaddleOcrLike> {
  const module = await import('@paddleocr/paddleocr-js')
  const ocr = await module.PaddleOCR.create({
    lang: 'it',
    ocrVersion: 'PP-OCRv5',
    worker: true,
    ortOptions: {
      backend: 'wasm',
      numThreads: 1,
      simd: true,
    },
  })
  return ocr as PaddleOcrLike
}

async function runtime(): Promise<PaddleOcrLike> {
  if (!runtimePromise) {
    runtimePromise = createRuntime().catch((error) => {
      runtimePromise = null
      throw error
    })
  }
  return runtimePromise
}

export async function recognizeLocalDocumentImage(input: {
  image: Blob | HTMLCanvasElement
  page: number
  offset?: LocalOcrOffset
}): Promise<LocalDocumentTextItem[]> {
  const ocr = await runtime()
  const [result] = await ocr.predict(input.image)
  return mapPaddleItemsToLocalDocumentTextItems(
    result?.items ?? [],
    input.page,
    input.offset ?? { x: 0, y: 0 },
  )
}

export async function disposeLocalDocumentOcr(): Promise<void> {
  const current = runtimePromise
  runtimePromise = null
  if (!current) return
  const ocr = await current.catch(() => null)
  await ocr?.dispose?.()
}
