import assert from 'node:assert/strict'
import test from 'node:test'
import type { DocumentTemplateVersionDraft, InstitutionalBaseVersionDraft } from '../domain/document-template'
import {
  findForbiddenTechnicalReferences,
  reviewDocumentTemplate,
  reviewInstitutionalBase,
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

test('required sensitive aggregate fields require human review', () => {
  assert.equal(reviewDocumentTemplate(requiredSensitiveDraft()).result, 'REVIEW_REQUIRED')
})

test('institutional base application review accepts a valid shared base', () => {
  const review = reviewInstitutionalBase(validInstitutionalBase())
  assert.equal(review.result, 'PASS')
  assert.equal(review.versionNo, 1)
  assert.deepEqual(review.findings, [])
})

test('institutional base application review fails closed on professional technical references', () => {
  const base = validInstitutionalBase()
  base.headerProfile.lines = ['document_template_versions']
  const review = reviewInstitutionalBase(base)
  assert.equal(review.result, 'BLOCKED')
  assert.equal(review.findings.some((finding) => finding.category === 'EXTERNAL_PURITY'), true)
})

test('technical reference scanner finds Bxx and UUID without false categories', () => {
  assert.deepEqual(
    findForbiddenTechnicalReferences('Classe 2C · B03 · uuid 123e4567-e89b-12d3-a456-426614174000'),
    ['BXX_CODE', 'UUID'],
  )
})

test('technical reference scanner blocks every serialized lifecycle state and restricted policy', () => {
  assert.deepEqual(
    findForbiddenTechnicalReferences(
      'DRAFT · QUALITY_REVIEWED · REVIEW_REQUIRED · ACTIVE · RETIRED · BLOCKED · PASS_WITH_NOTES · TEACHER_CONFIRMATION',
    ),
    ['INTERNAL_STATE'],
  )
})

test('technical reference scanner blocks template-engine database entities', () => {
  assert.deepEqual(
    findForbiddenTechnicalReferences(
      'document_templates institutional_base_versions document_template_lifecycle_decisions institutional_base_quality_reviews',
    ),
    ['SOFTWARE_ENTITY'],
  )
})
