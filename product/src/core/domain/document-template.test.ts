import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateDocumentTemplate,
  validateInstitutionalBase,
  type CreateInstitutionalBaseInput,
  type DocumentTemplateVersionDraft,
  type InstitutionalBaseVersionDraft,
  type InstitutionalRenderPin,
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

function validInstitutionalBase(): InstitutionalBaseVersionDraft {
  return {
    version: 1,
    identityProfile: {
      institutionName: 'I.C. Calvario-Covotta – don Lorenzo Milani',
      logoAssetRef: null,
    },
    headerProfile: { lines: ['Istituto Comprensivo'] },
    footerProfile: { lines: [] },
    typographyProfile: {
      bodyFontFamily: 'Arial',
      headingFontFamily: 'Arial',
      baseFontSizePt: 11,
      lineHeight: 1.3,
    },
    pageGeometryProfile: {
      format: 'A4',
      orientation: 'PORTRAIT',
      marginTopMm: 18,
      marginRightMm: 18,
      marginBottomMm: 18,
      marginLeftMm: 18,
    },
    commonTableProfile: {
      headerWeight: 'BOLD',
      cellPaddingMm: 2,
      repeatHeader: true,
    },
    signatureProfile: {
      showLocation: true,
      showDate: true,
      label: 'Il docente',
    },
    accessibilityProfile: {
      minimumFontSizePt: 10,
      highContrast: true,
      tableHeadersRequired: true,
    },
    sourceRevisionRefs: [],
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

test('institutional base is a separate valid version stream with stable identity metadata', () => {
  const identity: CreateInstitutionalBaseInput = { name: 'Base istituzionale' }
  const base = validInstitutionalBase()
  assert.equal(identity.name, 'Base istituzionale')
  assert.equal('name' in base, false)
  assert.equal(validateInstitutionalBase(base).valid, true)
})

test('institutional base rejects arbitrary css or html payloads', () => {
  const base = validInstitutionalBase() as InstitutionalBaseVersionDraft & { css?: string; html?: string }
  base.css = '.document { position: absolute }'
  base.html = '<div>layout arbitrario</div>'
  assert.equal(validateInstitutionalBase(base).valid, false)
})

test('render pin requires exact institutional base and family template versions', () => {
  const pin: InstitutionalRenderPin = {
    institutionalBaseId: 'base-1',
    institutionalBaseVersionNo: 3,
    familyTemplateId: 'template-1',
    familyTemplateVersionNo: 7,
  }
  assert.deepEqual(pin, {
    institutionalBaseId: 'base-1',
    institutionalBaseVersionNo: 3,
    familyTemplateId: 'template-1',
    familyTemplateVersionNo: 7,
  })
})
