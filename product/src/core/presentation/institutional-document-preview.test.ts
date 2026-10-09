import assert from 'node:assert/strict'
import test from 'node:test'
import type { InstitutionalBaseVersionDraft, InstitutionalRenderPin } from '../domain/document-template'
import { finalReportCanonicalTemplate } from './final-report-canonical-template'
import {
  assertInstitutionalOutputPurity,
  renderInstitutionalPreview,
  renderPinnedInstitutionalPreview,
} from './institutional-document-preview'

function institutionalBase(version = 1): InstitutionalBaseVersionDraft {
  return {
    version,
    identityProfile: {
      institutionName: 'I.C. Calvario-Covotta – don Lorenzo Milani',
      logoAssetRef: null,
    },
    headerProfile: { lines: ['Istituto Comprensivo', 'Scuola secondaria di primo grado'] },
    footerProfile: { lines: ['Documento istituzionale'] },
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

const values = {
  'academic_year.label': '2026/27',
  'class.label': '2C',
  'discipline.label': 'Tecnologia',
  'teacher.display_name': 'Docente',
  'learning.executed_path': {
    columns: ['Ambiti / nuclei', 'Conoscenze e contenuti', 'Abilità sviluppate', 'Competenze perseguite'],
    rows: [['Materiali', 'Proprietà e impieghi', 'Confrontare materiali', 'Scegliere in base alla funzione']],
  },
  'methods.selected': ['LABORATORY', 'PROBLEM_SOLVING'],
}

test('normal school-professional text passes output purity', () => {
  assert.doesNotThrow(() => assertInstitutionalOutputPurity('Relazione finale · Tecnologia · Classe 2C'))
})

for (const sample of [
  'Blocco B03',
  'CAN-PRG-2',
  '123e4567-e89b-12d3-a456-426614174000',
  'TeachingSession',
  'AUTO_DOCUMENTED',
  '/Google Drive/Relazioni/finale.docx',
  'GPT-5.6',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'generato automaticamente dal sistema',
]) {
  test(`technical output is blocked: ${sample}`, () => {
    assert.throws(() => assertInstitutionalOutputPurity(sample), /riferimenti tecnici/i)
  })
}

test('preview composes the exact institutional base and family template without emitting internal keys', () => {
  const preview = renderInstitutionalPreview({
    institutionalBase: {
      baseId: 'base-1',
      versionNo: 1,
      draft: institutionalBase(1),
    },
    template: {
      templateId: 'template-1',
      versionNo: 1,
      draft: finalReportCanonicalTemplate(),
    },
    values,
  })

  assert.match(preview.text, /I\.C\. Calvario-Covotta – don Lorenzo Milani/)
  assert.match(preview.text, /Istituto Comprensivo/)
  assert.match(preview.text, /Documento istituzionale/)
  assert.match(preview.text, /Ambiti \/ nuclei/)
  assert.match(preview.text, /Didattica laboratoriale/)
  assert.match(preview.text, /Problem solving/)
  assert.doesNotMatch(preview.text, /learning\.executed_path|LABORATORY|AUTO_DOCUMENTED/)
})

test('pinned preview fails closed when any of the four render coordinates mismatch', () => {
  const pin: InstitutionalRenderPin = {
    institutionalBaseId: 'base-1',
    institutionalBaseVersionNo: 1,
    familyTemplateId: 'template-1',
    familyTemplateVersionNo: 1,
  }
  const base = { baseId: 'base-1', versionNo: 1, draft: institutionalBase(1) }
  const template = { templateId: 'template-1', versionNo: 1, draft: finalReportCanonicalTemplate() }

  assert.doesNotThrow(() => renderPinnedInstitutionalPreview({ pin, institutionalBase: base, template, values }))
  assert.throws(
    () => renderPinnedInstitutionalPreview({
      pin,
      institutionalBase: { ...base, versionNo: 2, draft: institutionalBase(2) },
      template,
      values,
    }),
    /pin|versione|version/i,
  )
  assert.throws(
    () => renderPinnedInstitutionalPreview({
      pin,
      institutionalBase: base,
      template: { ...template, templateId: 'template-2' },
      values,
    }),
    /pin|identit|template/i,
  )
})

test('historical pinned rendering keeps using the supplied v1 base and template even when v2 objects exist elsewhere', () => {
  const pin: InstitutionalRenderPin = {
    institutionalBaseId: 'base-history',
    institutionalBaseVersionNo: 1,
    familyTemplateId: 'template-history',
    familyTemplateVersionNo: 1,
  }
  const oldBase = institutionalBase(1)
  oldBase.headerProfile = { lines: ['Intestazione storica'] }
  const oldTemplate = finalReportCanonicalTemplate()

  const preview = renderPinnedInstitutionalPreview({
    pin,
    institutionalBase: { baseId: 'base-history', versionNo: 1, draft: oldBase },
    template: { templateId: 'template-history', versionNo: 1, draft: oldTemplate },
    values,
  })

  assert.match(preview.text, /Intestazione storica/)
  assert.doesNotMatch(preview.text, /versione corrente|latest|current/i)
})
