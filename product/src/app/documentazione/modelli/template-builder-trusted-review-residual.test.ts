import assert from 'node:assert/strict'
import test from 'node:test'
import { finalReportCanonicalTemplate } from '../../../core/presentation/final-report-canonical-template'
import { reviewDocumentTemplate, reviewInstitutionalBase } from '../../../core/application/document-template-quality'
import type { DocumentTemplateSnapshot } from '../../../core/infrastructure/supabase/supabase-document-template-repository'
import type { InstitutionalBaseSnapshot } from '../../../core/infrastructure/supabase/supabase-institutional-base-repository'
import type { InstitutionalBaseVersionDraft, TemplateQualityReview } from '../../../core/domain/document-template'
import { buildGovernedTemplateBuilderViewModel } from './template-builder-model'

function baseDraft(version = 1): InstitutionalBaseVersionDraft {
  return {
    version,
    identityProfile: { institutionName: 'I.C. Calvario-Covotta – don Lorenzo Milani', logoAssetRef: null },
    headerProfile: { lines: ['Istituto Comprensivo'] },
    footerProfile: { lines: [] },
    typographyProfile: { bodyFontFamily: 'Arial', headingFontFamily: 'Arial', baseFontSizePt: 11, lineHeight: 1.3 },
    pageGeometryProfile: { format: 'A4', orientation: 'PORTRAIT', marginTopMm: 18, marginRightMm: 18, marginBottomMm: 18, marginLeftMm: 18 },
    commonTableProfile: { headerWeight: 'BOLD', cellPaddingMm: 2, repeatHeader: true },
    signatureProfile: { showLocation: true, showDate: true, label: 'Il docente' },
    accessibilityProfile: { minimumFontSizePt: 10, highContrast: true, tableHeadersRequired: true },
    sourceRevisionRefs: [],
  }
}

function blockedReview(versionNo: number): TemplateQualityReview {
  return {
    result: 'BLOCKED',
    versionNo,
    findings: [{
      code: 'EXTERNAL_INTERNAL_STATE',
      severity: 'BLOCKER',
      category: 'EXTERNAL_PURITY',
      summary: 'Riferimento tecnico vietato.',
    }],
  }
}

function familySnapshot(): DocumentTemplateSnapshot {
  const draft = finalReportCanonicalTemplate()
  return {
    template: {
      id: 'family', workspaceId: 'workspace', kind: 'FINAL_REPORT', name: draft.name,
      status: 'QUALITY_REVIEWED', currentVersionNo: 1, activeVersionNo: null,
      createdBy: 'owner', createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z',
    },
    activeVersion: null,
    versions: [{
      id: 'family-v1', templateId: 'family', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-09T00:00:00Z',
    }],
    qualityReviews: [{
      id: 'family-review-blocked', templateId: 'family', versionNo: 1,
      result: 'BLOCKED', findings: blockedReview(1).findings, note: null,
      reviewedBy: 'owner', reviewedAt: '2026-10-09T01:00:00Z',
    }],
    sources: [],
  }
}

function baseSnapshot(): InstitutionalBaseSnapshot {
  const draft = baseDraft()
  return {
    base: {
      id: 'base', workspaceId: 'workspace', name: 'Veste istituzionale',
      status: 'QUALITY_REVIEWED', currentVersionNo: 1, activeVersionNo: null,
      createdBy: 'owner', createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z',
    },
    activeVersion: null,
    versions: [{
      id: 'base-v1', baseId: 'base', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-09T00:00:00Z',
    }],
    qualityReviews: [{
      id: 'base-review-blocked', baseId: 'base', versionNo: 1,
      result: 'BLOCKED', findings: blockedReview(1).findings, note: null,
      reviewedBy: 'owner', reviewedAt: '2026-10-09T01:00:00Z',
    }],
    sources: [],
  }
}

test('governed builder uses the persisted trusted review instead of a fresh local recomputation', () => {
  const family = familySnapshot()
  const base = baseSnapshot()
  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    institutionalBaseReview: reviewInstitutionalBase(base.versions[0].draft),
    familyTemplate: family,
    familyTemplateReview: reviewDocumentTemplate(family.versions[0].draft),
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.reviewLabel, 'Pubblicazione bloccata')
  assert.equal(model.familyTemplate.reviewLabel, 'Pubblicazione bloccata')
  assert.equal(model.institutionalBase.actions.some((action) => action.key === 'ACTIVATE'), false)
  assert.equal(model.familyTemplate.actions.some((action) => action.key === 'ACTIVATE'), false)
})

test('governed builder exposes historical versions for both independently versioned streams', () => {
  const family = familySnapshot()
  const base = baseSnapshot()
  const familyV2 = { ...finalReportCanonicalTemplate(), version: 2 }
  const baseV2 = baseDraft(2)

  family.template.currentVersionNo = 2
  family.template.activeVersionNo = 1
  family.versions.push({
    id: 'family-v2', templateId: 'family', versionNo: 2, draft: familyV2,
    sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-09T02:00:00Z',
  })
  family.qualityReviews.push({
    id: 'family-review-v2', templateId: 'family', versionNo: 2,
    result: 'PASS', findings: [], note: null, reviewedBy: 'owner', reviewedAt: '2026-10-09T03:00:00Z',
  })
  base.base.currentVersionNo = 2
  base.base.activeVersionNo = 1
  base.versions.push({
    id: 'base-v2', baseId: 'base', versionNo: 2, draft: baseV2,
    sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-09T02:00:00Z',
  })
  base.qualityReviews.push({
    id: 'base-review-v2', baseId: 'base', versionNo: 2,
    result: 'PASS', findings: [], note: null, reviewedBy: 'owner', reviewedAt: '2026-10-09T03:00:00Z',
  })

  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    institutionalBaseReview: reviewInstitutionalBase(baseV2),
    familyTemplate: family,
    familyTemplateReview: reviewDocumentTemplate(familyV2),
    role: 'OWNER',
  }) as typeof buildGovernedTemplateBuilderViewModel extends (...args: never[]) => infer R ? R & {
    institutionalBase: { history: Array<{ versionNo: number; current: boolean; active: boolean }> }
    familyTemplate: { history: Array<{ versionNo: number; current: boolean; active: boolean }> }
  } : never

  assert.deepEqual(model.institutionalBase.history.map((entry) => entry.versionNo), [2, 1])
  assert.deepEqual(model.familyTemplate.history.map((entry) => entry.versionNo), [2, 1])
  assert.equal(model.institutionalBase.history[0].current, true)
  assert.equal(model.institutionalBase.history[1].active, true)
  assert.equal(model.familyTemplate.history[0].current, true)
  assert.equal(model.familyTemplate.history[1].active, true)
})
