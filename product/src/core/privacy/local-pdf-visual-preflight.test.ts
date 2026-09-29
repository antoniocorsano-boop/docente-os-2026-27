import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyPdfPages,
  classifyTextExtractionFailure,
  MAX_LOCAL_VISUAL_PDF_PAGES,
} from './local-pdf-visual-preflight'

test('PDF apribile ma senza estrazione testuale ricade sulla revisione visuale locale', () => {
  assert.deepEqual(classifyTextExtractionFailure(1), {
    state: 'SINGLE_PAGE_VISUAL_REVIEWABLE',
    totalPages: 1,
    missingNativeTextPages: [1],
    diagnostic: 'TEXT_EXTRACTION_FAILED_VISUAL_FALLBACK',
  })

  assert.deepEqual(classifyTextExtractionFailure(3), {
    state: 'MULTI_PAGE_VISUAL_REVIEWABLE',
    totalPages: 3,
    missingNativeTextPages: [1, 2, 3],
    diagnostic: 'TEXT_EXTRACTION_FAILED_VISUAL_FALLBACK',
  })
})

test('fallback visuale resta fail-closed oltre il limite locale', () => {
  const pages = MAX_LOCAL_VISUAL_PDF_PAGES + 1
  const result = classifyTextExtractionFailure(pages)

  assert.equal(result.state, 'MULTI_PAGE_VISUAL_BLOCKED')
  assert.equal(result.totalPages, pages)
  assert.deepEqual(result.missingNativeTextPages, Array.from({ length: pages }, (_, index) => index + 1))
  assert.equal(result.diagnostic, 'TEXT_EXTRACTION_FAILED_VISUAL_FALLBACK')
})

test('classificazione testuale normale resta invariata', () => {
  const result = classifyPdfPages(2, [
    'Questa pagina contiene abbastanza testo utile per essere considerata testuale.',
    'Anche questa seconda pagina contiene contenuto testuale sufficiente.',
  ])

  assert.equal(result.state, 'NATIVE_TEXT_ONLY')
  assert.deepEqual(result.missingNativeTextPages, [])
})
