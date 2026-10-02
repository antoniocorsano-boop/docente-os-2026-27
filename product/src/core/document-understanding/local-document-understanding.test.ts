import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseLocalDocumentStrategy,
  rectFromPolygon,
} from './local-document-understanding'

test('local document strategy prefers native text before all later stages', () => {
  assert.deepEqual(
    chooseLocalDocumentStrategy({
      nativeTextUsable: true,
      localOcrAvailable: true,
      structuralEvidenceAvailable: true,
      browserAiAvailable: true,
      remoteAssistEnabled: true,
    }),
    { strategy: 'NATIVE_TEXT', reason: 'native-text-usable' },
  )
})

test('raster documents prefer local OCR over browser AI and remote assistance', () => {
  assert.deepEqual(
    chooseLocalDocumentStrategy({
      nativeTextUsable: false,
      localOcrAvailable: true,
      structuralEvidenceAvailable: false,
      browserAiAvailable: true,
      remoteAssistEnabled: true,
    }),
    { strategy: 'LOCAL_OCR', reason: 'raster-local-ocr' },
  )
})

test('browser AI remains optional and remote assist remains a later fallback', () => {
  assert.equal(
    chooseLocalDocumentStrategy({
      nativeTextUsable: false,
      localOcrAvailable: false,
      structuralEvidenceAvailable: false,
      browserAiAvailable: true,
      remoteAssistEnabled: true,
    }).strategy,
    'BROWSER_AI',
  )
  assert.equal(
    chooseLocalDocumentStrategy({
      nativeTextUsable: false,
      localOcrAvailable: false,
      structuralEvidenceAvailable: false,
      browserAiAvailable: false,
      remoteAssistEnabled: true,
    }).strategy,
    'REMOTE_ASSIST',
  )
})

test('provider absence degrades to manual review rather than breaking the flow', () => {
  assert.equal(
    chooseLocalDocumentStrategy({
      nativeTextUsable: false,
      localOcrAvailable: false,
      structuralEvidenceAvailable: false,
      browserAiAvailable: false,
      remoteAssistEnabled: false,
    }).strategy,
    'MANUAL_REVIEW',
  )
})

test('OCR polygons normalize into deterministic rectangles for domain geometry', () => {
  assert.deepEqual(
    rectFromPolygon([
      { x: 20, y: 40 },
      { x: 80, y: 38 },
      { x: 82, y: 60 },
      { x: 18, y: 62 },
    ]),
    { x: 18, y: 38, width: 64, height: 24 },
  )
  assert.equal(rectFromPolygon([]), null)
})
