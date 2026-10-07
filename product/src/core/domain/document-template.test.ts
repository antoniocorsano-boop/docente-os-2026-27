import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateDocumentTemplate,
  type DocumentTemplateVersionDraft,
} from './document-template'

function validDraft(): DocumentTemplateVersionDraft {
  return {
    kind: 'FINAL_REPORT',
    name: 'Relazione finale del docente',
    version: 1,
    sourceRevisionRefs: [],
    sections: [
      {
        key: 'IDENTITY',
        label: 'Intestazione',
        purpose: 'Identificare il documento',
        required: true,
        repeatable: false,
        renderRole: 'KEY_VALUE',
        fields: [
          {
            key: 'class.label',
            label: 'Classe',
            type: 'TEXT_SHORT',
            required: true,
            cardinality: 'ONE',
            valuePolicy: 'AUTO_DOCUMENTED',
            privacyClass: 'PROFESSIONAL_CONTEXT',
          },
        ],
      },
    ],
  }
}

test('a valid institutional template draft passes deterministic validation', () => {
  assert.equal(validateDocumentTemplate(validDraft()).valid, true)
})

test('duplicate field keys are rejected deterministically', () => {
  const draft = validDraft()
  draft.sections.push({
    key: 'SECOND',
    label: 'Seconda sezione',
    purpose: 'Provare una duplicazione',
    required: false,
    repeatable: false,
    renderRole: 'PARAGRAPH',
    fields: [{ ...draft.sections[0].fields[0] }],
  })
  assert.deepEqual(validateDocumentTemplate(draft).codes, ['DUPLICATE_FIELD_KEY'])
})
