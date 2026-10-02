import assert from 'node:assert/strict'
import test from 'node:test'
import { mapPaddleItemsToLocalDocumentTextItems } from './paddle-local-ocr'

test('maps PaddleOCR text, confidence and polygon into shared local evidence', () => {
  assert.deepEqual(
    mapPaddleItemsToLocalDocumentTextItems(
      [{
        text: ' Corsano ',
        score: 0.93,
        poly: [[10, 20], [70, 20], [70, 40], [10, 40]],
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

test('drops unusable OCR items and clamps confidence', () => {
  assert.deepEqual(
    mapPaddleItemsToLocalDocumentTextItems([
      { text: '', score: 0.9, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
      { text: 'x', score: 4, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
      { text: 'bad-poly', score: 0.5, poly: [[0, 0]] },
    ], 1),
    [{
      text: 'x',
      confidence: 1,
      page: 1,
      polygon: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    }],
  )
})
