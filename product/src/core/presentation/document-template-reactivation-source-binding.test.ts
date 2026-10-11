import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewDocumentTemplate, reviewInstitutionalBase } from '../application/document-template-quality'
import type { InstitutionalBaseVersionDraft } from '../domain/document-template'
import type { DocumentTemplateSnapshot } from '../infrastructure/supabase/supabase-document-template-repository'
import type { InstitutionalBaseSnapshot } from '../infrastructure/supabase/supabase-institutional-base-repository'
import { buildGovernedTemplateBuilderViewModel } from '../../app/documentazione/modelli/template-builder-model'
import { finalReportCanonicalTemplate } from './final-report-canonical-template'

function institutionalBaseDraft(): InstitutionalBaseVersionDraft {
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
    commonTableProfile: { headerWeight: 'BOLD', cellPaddingMm: 2, repeatHeader: true },
    signatureProfile: { showLocation: true, showDate: true, label: 'Il docente' },
    accessibilityProfile: { minimumFontSizePt: 10, highContrast: true, tableHeadersRequired: true },
    sourceRevisionRefs: [],
  }
}

test('cleared current versions remain activatable when the retained active pointer matches', () => {
  const baseDraft = institutionalBaseDraft()
  const baseVersion: InstitutionalBaseSnapshot['versions'][number] = {
    id: 'base-version-1',
    baseId: 'institutional-base',
    versionNo: 1,
    draft: baseDraft,
    sourceRevisionIds: [],
    createdBy: 'owner',
    createdAt: '2026-10-11T00:00:00Z',
  }
  const institutionalBase: InstitutionalBaseSnapshot = {
    base: {
      id: 'institutional-base',
      workspaceId: 'workspace',
      name: 'Veste istituzionale',
      status: 'REVIEW_REQUIRED',
      currentVersionNo: 1,
      activeVersionNo: 1,
      createdBy: 'owner',
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z',
    },
    activeVersion: baseVersion,
    versions: [baseVersion],
    qualityReviews: [],
    sources: [],
  }

  const familyDraft = finalReportCanonicalTemplate()
  const familyVersion: DocumentTemplateSnapshot['versions'][number] = {
    id: 'family-version-1',
    templateId: 'final-report-template',
    versionNo: 1,
    draft: familyDraft,
    sourceRevisionIds: [],
    createdBy: 'owner',
    createdAt: '2026-10-11T00:00:00Z',
  }
  const familyTemplate: DocumentTemplateSnapshot = {
    template: {
      id: 'final-report-template',
      workspaceId: 'workspace',
      kind: 'FINAL_REPORT',
      name: familyDraft.name,
      status: 'REVIEW_REQUIRED',
      currentVersionNo: 1,
      activeVersionNo: 1,
      createdBy: 'owner',
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z',
    },
    activeVersion: familyVersion,
    versions: [familyVersion],
    qualityReviews: [],
    sources: [],
  }

  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase,
    institutionalBaseReview: reviewInstitutionalBase(baseDraft),
    familyTemplate,
    familyTemplateReview: reviewDocumentTemplate(familyDraft),
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.actions.some((action) => action.key === 'ACTIVATE'), true)
  assert.equal(model.familyTemplate.actions.some((action) => action.key === 'ACTIVATE'), true)
})
