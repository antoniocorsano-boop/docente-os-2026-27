import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { LOCAL_OCR_MAX_EDGE, LOCAL_OCR_TIMEOUT_MS, LocalDocumentOcrTimeoutError, clearWorkerPromiseIfCurrent, localOcrDimensions, localOcrProgressFromLog, mapTesseractWordsToLocalDocumentTextItems, remainingLocalOcrBudgetMs, withLocalOcrDeadline } from './tesseract-local-ocr'

test('maps Tesseract words and bounding boxes into shared local evidence', () => {
  assert.deepEqual(
    mapTesseractWordsToLocalDocumentTextItems(
      [{
        text: ' Corsano ',
        confidence: 93,
        bbox: { x0: 10, y0: 20, x1: 70, y1: 40 },
      }],
      2,
      { x: 100, y: 200 },
    ),
    [{
      text: 'Corsano',
      confidence: 0.93,
      page: 2,
      polygon: [
        { x: 110, y: 220 },
        { x: 170, y: 220 },
        { x: 170, y: 240 },
        { x: 110, y: 240 },
      ],
    }],
  )
})

test('drops unusable words and clamps confidence', () => {
  assert.deepEqual(
    mapTesseractWordsToLocalDocumentTextItems([
      { text: '', confidence: 90, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      { text: 'x', confidence: 140, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      { text: 'bad-box', confidence: 50, bbox: { x0: 10, y0: 10, x1: 2, y1: 2 } },
    ], 1),
    [{
      text: 'x',
      confidence: 1,
      page: 1,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    }],
  )
})


test('mobile OCR bounds raster work while preserving coordinate scale', () => {
  assert.equal(LOCAL_OCR_MAX_EDGE, 1200)
  assert.deepEqual(
    localOcrDimensions(1800, 1200),
    { width: 1200, height: 800, coordinateScale: 1.5 },
  )
  assert.deepEqual(
    localOcrDimensions(780, 540),
    { width: 780, height: 540, coordinateScale: 1 },
  )
})

test('normalizes Tesseract progress for teacher-facing feedback', () => {
  assert.deepEqual(
    localOcrProgressFromLog({ status: 'recognizing text', progress: 0.42 }),
    { status: 'recognizing text', progress: 0.42 },
  )
  assert.equal(localOcrProgressFromLog({ status: 'loading tesseract core' }), null)
  assert.equal(localOcrProgressFromLog({ status: 'recognizing text', progress: 2 }), null)
})

test('mobile OCR deadline is bounded and triggers cancellation', async () => {
  assert.equal(LOCAL_OCR_TIMEOUT_MS, 30_000)
  let cancelled = false
  await assert.rejects(
    () => withLocalOcrDeadline(
      new Promise<never>(() => {}),
      5,
      () => { cancelled = true },
    ),
    (error: unknown) => error instanceof LocalDocumentOcrTimeoutError,
  )
  assert.equal(cancelled, true)
})


test('OCR deadline and progress cover worker bootstrap as well as recognition', () => {
  const source = fs.readFileSync(new URL('./tesseract-local-ocr.ts', import.meta.url), 'utf8')
  const recognizeAt = source.indexOf('export async function recognizeLocalDocumentImage')
  const listenerAt = source.indexOf('progressListeners.add(input.onProgress)', recognizeAt)
  const pendingWorkerAt = source.indexOf('const pendingWorker = worker()', recognizeAt)
  const deadlineAt = source.indexOf('withLocalOcrDeadline(', pendingWorkerAt)
  const bootstrapAt = source.indexOf('instance = await pendingWorker', deadlineAt)

  assert.ok(recognizeAt >= 0)
  assert.ok(listenerAt > recognizeAt)
  assert.ok(pendingWorkerAt > listenerAt)
  assert.ok(deadlineAt > pendingWorkerAt)
  assert.ok(bootstrapAt > deadlineAt)
  assert.doesNotMatch(source.slice(recognizeAt), /const instance = await worker\(\)/)
})


test('synchronous timeout cleanup errors cannot bypass deadline rejection', async () => {
  await assert.rejects(
    () => withLocalOcrDeadline(
      new Promise<never>(() => {}),
      5,
      () => { throw new Error('cleanup failed synchronously') },
    ),
    (error: unknown) => error instanceof LocalDocumentOcrTimeoutError,
  )
})

test('stale worker completion cannot clear a newer worker promise', async () => {
  const oldWorker = Promise.resolve({ id: 'old' })
  const newerWorker = Promise.resolve({ id: 'new' })

  assert.equal(clearWorkerPromiseIfCurrent(newerWorker, oldWorker), newerWorker)
  assert.equal(clearWorkerPromiseIfCurrent(oldWorker, oldWorker), null)

  await Promise.all([oldWorker, newerWorker])
})

test('global OCR budget only exposes the time remaining from one shared deadline', () => {
  assert.equal(remainingLocalOcrBudgetMs(30_000, 0), 30_000)
  assert.equal(remainingLocalOcrBudgetMs(30_000, 12_500), 17_500)
  assert.equal(remainingLocalOcrBudgetMs(30_000, 30_000), 0)
  assert.equal(remainingLocalOcrBudgetMs(30_000, 45_000), 0)
})


test('worker accessor preserves cached promise identity for timeout reset', () => {
  const source = fs.readFileSync(new URL('./tesseract-local-ocr.ts', import.meta.url), 'utf8')
  assert.match(source, /\nfunction worker\(\): Promise<Worker>/)
  assert.doesNotMatch(source, /async function worker\(\): Promise<Worker>/)
  assert.match(source, /const pendingWorker = worker\(\)/)
  assert.match(source, /clearWorkerPromiseIfCurrent\(workerPromise, pendingWorker\)/)
})
