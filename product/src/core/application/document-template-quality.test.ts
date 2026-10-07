import assert from 'node:assert/strict'
import test from 'node:test'
import type { DocumentTemplateVersionDraft } from '../domain/document-template'
import {
  findForbiddenTechnicalReferences,
  reviewDocumentTemplate,
} from './document-template-quality'

function requiredSensitiveDraft(): DocumentTemplateVersionDraft {
  return {
    kind: 'FINAL_REPORT',
    name: 'Relazione finale del docente',
    version: 1,
    sourceRevisionRefs: [],
    sections: [
      {
        key: 'CLASS_PROFILE',
        label: 'Profilo della classe',
        purpose: 'Descrivere sinteticamente il gruppo classe',
        required: true,
        repeatable: false,
        renderRole: 'PARAGRAPH',
        fields: [
          {
            key: 'class.composition.sensitiveAggregate',
            label: 'Dato aggregato',
            type: 'NUMBER',
            required: true,
            cardinality: 'ONE',
            valuePolicy: 'AUTO_DOCUMENTED',
            privacyClass: 'SENSITIVE_AGGREGATE',
          },
        ],
      },
    ],
  }
}

test('required sensitive aggregate fields require human review', () => {
  assert.equal(reviewDocumentTemplate(requiredSensitiveDraft()).result, 'REVIEW_REQUIRED')
})

test('technical reference scanner finds Bxx and UUID without false categories', () => {
  assert.deepEqual(
    findForbiddenTechnicalReferences('Classe 2C · B03 · uuid 123e4567-e89b-12d3-a456-426614174000'),
    ['BXX_CODE', 'UUID'],
  )
})
