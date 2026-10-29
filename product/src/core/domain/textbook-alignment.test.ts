import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADOPTED_TEXTBOOK,
  validateTextbookAlignment,
  type TextbookAlignment,
} from './textbook-alignment'

function alignment(overrides: Partial<TextbookAlignment> = {}): TextbookAlignment {
  return {
    udaCode: 'CAN-UDA-1-01',
    textbookId: 'TECNOLOGIA_VERDE_2E_9788808950758',
    volume: 'TECNOLOGIA',
    relation: 'COMPOSED',
    coverage: 'FULL',
    evidenceLevel: 'VERIFIED_PAGE',
    pageRange: { from: 16, to: 31 },
    resourceRef: 'teacher-verified:sustainability-pages-16-31',
    ...overrides,
  }
}

test('rende esplicita l’identità del libro adottato senza includere Informatica', () => {
  assert.deepEqual(ADOPTED_TEXTBOOK, {
    id: 'TECNOLOGIA_VERDE_2E_9788808950758',
    title: 'Tecnologia.verde',
    edition: 'seconda edizione',
    configuration: 'Tecnologia + Disegno',
    isbn: '9788808950758',
  })
})

test('VERIFIED_PAGE richiede un intervallo di pagine valido', () => {
  const result = validateTextbookAlignment(alignment({ pageRange: undefined }))
  assert.equal(result.valid, false)
  assert.ok(result.issues.includes('VERIFIED_PAGE_REQUIRES_PAGE_RANGE'))
})

test('TO_VERIFY non può esporre una pagina esatta come autorevole', () => {
  const result = validateTextbookAlignment(alignment({ evidenceLevel: 'TO_VERIFY' }))
  assert.equal(result.valid, false)
  assert.ok(result.issues.includes('TO_VERIFY_FORBIDS_EXACT_PAGE'))
})

test('accetta copertura PARTIAL per i gap digitali senza precisione inventata', () => {
  const result = validateTextbookAlignment(alignment({
    udaCode: 'CAN-UDA-1-06',
    relation: 'SUPPORT',
    coverage: 'PARTIAL',
    evidenceLevel: 'TO_VERIFY',
    pageRange: undefined,
  }))
  assert.deepEqual(result, { valid: true, issues: [] })
})

test('il contratto di allineamento non contiene campi che mutano il canone UDA', () => {
  const value = alignment()
  assert.equal('udaTitle' in value, false)
  assert.equal('udaHours' in value, false)
  assert.equal('udaSequence' in value, false)
  assert.equal('curriculumReference' in value, false)
})
