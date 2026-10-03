// @trama-readonly — local OCR worker/progress state is transient; no domain/storage write.
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

type TesseractProgressLike = Readonly<{
  status?: unknown
  progress?: unknown
}>

export type LocalOcrProgress = Readonly<{
  status: string
  progress: number
}>

export const LOCAL_OCR_MAX_EDGE = 1200
export const LOCAL_OCR_TIMEOUT_MS = 30_000

export function clearWorkerPromiseIfCurrent<T>(
  current: Promise<T> | null,
  expected: Promise<T>,
): Promise<T> | null {
  return current === expected ? null : current
}

export function remainingLocalOcrBudgetMs(deadlineAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.floor(deadlineAtMs - nowMs))
}

let workerPromise: Promise<Worker> | null = null
const progressListeners = new Set<(progress: LocalOcrProgress) => void>()

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function localOcrDimensions(
  width: number,
  height: number,
  maxEdge = LOCAL_OCR_MAX_EDGE,
): Readonly<{ width: number; height: number; coordinateScale: number }> {
  if (![width, height, maxEdge].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Local OCR dimensions must be positive finite numbers')
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    coordinateScale: 1 / scale,
  }
}

export function localOcrProgressFromLog(value: unknown): LocalOcrProgress | null {
  if (!value || typeof value !== 'object') return null
  const input = value as TesseractProgressLike
  const status = typeof input.status === 'string' ? input.status.trim() : ''
  const progress = finite(input.progress)
  if (!status || progress === null || progress < 0 || progress > 1) return null
  return { status, progress }
}

export class LocalDocumentOcrTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Local OCR exceeded ${timeoutMs} ms`)
    this.name = 'LocalDocumentOcrTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export function withLocalOcrDeadline<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void | Promise<void>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      void Promise.resolve().then(onTimeout).catch(() => undefined)
      reject(new LocalDocumentOcrTimeoutError(timeoutMs))
    }, timeoutMs)

    work.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function mapTesseractWordsToLocalDocumentTextItems(
  words: readonly TesseractWordLike[],
  page: number,
  offset: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
  coordinateScale = 1,
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
      { x: x0 * coordinateScale + offset.x, y: y0 * coordinateScale + offset.y },
      { x: x1 * coordinateScale + offset.x, y: y0 * coordinateScale + offset.y },
      { x: x1 * coordinateScale + offset.x, y: y1 * coordinateScale + offset.y },
      { x: x0 * coordinateScale + offset.x, y: y1 * coordinateScale + offset.y },
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
    logger: (entry) => {
      const progress = localOcrProgressFromLog(entry)
      if (!progress) return
      for (const listener of progressListeners) {
        try {
          listener(progress)
        } catch {
          // Progress feedback must never abort OCR.
        }
      }
    },
  })
}

async function worker(): Promise<Worker> {
  if (!workerPromise) {
    const pending = createLocalWorker()
    let guarded: Promise<Worker>
    guarded = pending.catch((error) => {
      workerPromise = clearWorkerPromiseIfCurrent(workerPromise, guarded)
      throw error
    })
    workerPromise = guarded
  }
  return workerPromise
}

export async function recognizeLocalDocumentImage(input: {
  image: Blob | HTMLCanvasElement
  page: number
  offset?: Readonly<{ x: number; y: number }>
  coordinateScale?: number
  timeoutMs?: number
  onProgress?: (progress: LocalOcrProgress) => void
}): Promise<LocalDocumentTextItem[]> {
  if (input.onProgress) progressListeners.add(input.onProgress)
  const pendingWorker = worker()
  let instance: Worker | null = null
  let timedOut = false
  const timeoutMs = input.timeoutMs ?? LOCAL_OCR_TIMEOUT_MS

  try {
    const result = await withLocalOcrDeadline(
      (async () => {
        instance = await pendingWorker
        if (timedOut) throw new LocalDocumentOcrTimeoutError(timeoutMs)
        return instance.recognize(input.image, undefined, {
          text: true,
          blocks: true,
        })
      })(),
      timeoutMs,
      async () => {
        timedOut = true
        workerPromise = clearWorkerPromiseIfCurrent(workerPromise, pendingWorker)
        const current = instance ?? await pendingWorker.catch(() => null)
        await current?.terminate()
      },
    )

    return mapTesseractWordsToLocalDocumentTextItems(
      wordsFromBlocks(result.data.blocks),
      input.page,
      input.offset ?? { x: 0, y: 0 },
      input.coordinateScale ?? 1,
    )
  } finally {
    if (input.onProgress) progressListeners.delete(input.onProgress)
  }
}

export async function disposeLocalDocumentOcr(): Promise<void> {
  const current = workerPromise
  workerPromise = null
  if (!current) return
  const instance = await current.catch(() => null)
  await instance?.terminate()
}
