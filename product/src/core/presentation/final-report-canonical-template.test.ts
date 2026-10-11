import assert from 'node:assert/strict'
import test from 'node:test'
import { findForbiddenTechnicalReferences, reviewDocumentTemplate } from '../application/document-template-quality'
import {
  FINAL_REPORT_CANONICAL_TEMPLATE_V1,
  finalReportCanonicalTemplate,
} from './final-report-canonical-template'

const expectedOrder = [
  'IDENTITY',
  'CLASS_PROFILE',
  'EXECUTED_PATH',
  'OUTCOMES',
  'METHODS_TOOLS_INCLUSION',
  'ASSESSMENT',
  'CIVIC_TRANSVERSAL',
  'FINAL_REFLECTION',
  'SIGNATURE',
]

test('final report canonical template uses the approved institutional section order', () => {
  assert.deepEqual(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.map((section) => section.key), expectedOrder)
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'EXECUTED_PATH')?.renderRole, 'TABLE')
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'OUTCOMES')?.renderRole, 'PARAGRAPH')
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'CIVIC_TRANSVERSAL')?.required, false)
})

test('canonical template external labels are clean and quality review passes', () => {
  const labels = FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.flatMap((section) => [
    section.label,
    ...section.fields.map((field) => field.label),
  ])
  assert.deepEqual(findForbiddenTechnicalReferences(labels.join('\n')), [])
  assert.equal(reviewDocumentTemplate(FINAL_REPORT_CANONICAL_TEMPLATE_V1).result, 'PASS')
})

test('template factory returns a defensive copy', () => {
  const first = finalReportCanonicalTemplate()
  first.sections[0].label = 'Mutato'
  assert.notEqual(finalReportCanonicalTemplate().sections[0].label, 'Mutato')
})
