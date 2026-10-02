import assert from 'node:assert/strict'
import test from 'node:test'
import { mapTesseractWordsToLocalDocumentTextItems } from './tesseract-local-ocr'

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
