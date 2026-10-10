import assert from 'node:assert/strict'
import test from 'node:test'
import { findForbiddenTechnicalReferences } from './document-template-quality'

test('professional purity blocks every remaining serialized policy and privacy token', () => {
  assert.deepEqual(
    findForbiddenTechnicalReferences(
      [
        'DERIVED',
        'TEACHER_INPUT',
        'STATIC',
        'PUBLIC_INSTITUTIONAL',
        'PROFESSIONAL_CONTEXT',
        'AGGREGATE_CLASS_DATA',
        'SENSITIVE_AGGREGATE',
        'PERSONAL_STUDENT_DATA',
        'SPECIAL_CATEGORY_DATA',
      ].join(' · '),
    ),
    ['INTERNAL_STATE'],
  )
})
