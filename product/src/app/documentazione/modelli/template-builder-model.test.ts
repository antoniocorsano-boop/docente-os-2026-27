import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewDocumentTemplate } from '../../../core/application/document-template-quality'
import { finalReportCanonicalTemplate } from '../../../core/presentation/final-report-canonical-template'
import type { DocumentTemplateSnapshot } from '../../../core/infrastructure/supabase/supabase-document-template-repository'
import { buildTemplateBuilderViewModel } from './template-builder-model'

function snapshot(): DocumentTemplateSnapshot {
  const draft = finalReportCanonicalTemplate()
  return {
    template: {
      id: 'pilot-final-report', workspaceId: 'workspace', kind: 'FINAL_REPORT', name: draft.name,
      status: 'DRAFT', currentVersionNo: 1, activeVersionNo: null,
      createdBy: 'teacher', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
    },
    activeVersion: null,
    versions: [{
      id: 'version-1', templateId: 'pilot-final-report', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'teacher', createdAt: '2026-10-07T00:00:00Z',
    }],
    qualityReviews: [],
    sources: [],
  }
}

test('builder exposes school-professional labels in semantic order', () => {
  const source = snapshot()
  const model = buildTemplateBuilderViewModel(source, reviewDocumentTemplate(source.versions[0].draft))
  assert.equal(model.sourceSummary, 'Nuovo modello')
  assert.deepEqual(model.sections.slice(0, 3).map((section) => section.label), [
    'Intestazione',
    'Profilo e andamento della classe',
    'Percorso didattico effettivamente svolto',
  ])
  assert.equal(model.sections[2].renderRoleLabel, 'Tabella')
  assert.equal(model.sections.some((section) => section.fields.some((field) => field.label.includes('learning.'))), false)
})

test('builder exposes review findings and approval readiness without technical primary labels', () => {
  const source = snapshot()
  const review = reviewDocumentTemplate(source.versions[0].draft)
  const model = buildTemplateBuilderViewModel(source, review)
  assert.equal(model.reviewLabel, 'Controllo qualità superato')
  assert.equal(model.canApprove, true)
  assert.deepEqual(model.findings, [])
  assert.equal(model.sections.every((section) => section.availableDecisions.length >= 2), true)
})

test('builder reviews the current draft even while an older version remains active', () => {
  const source = snapshot()
  const activeDraft = source.versions[0].draft
  const currentDraft = {
    ...finalReportCanonicalTemplate(),
    version: 2,
    sections: finalReportCanonicalTemplate().sections.map((section, index) => (
      index === 0 ? { ...section, label: 'Intestazione aggiornata' } : section
    )),
  }
  source.template.status = 'ACTIVE'
  source.template.currentVersionNo = 2
  source.template.activeVersionNo = 1
  source.activeVersion = { ...source.versions[0], draft: activeDraft }
  source.versions = [
    source.activeVersion,
    {
      id: 'version-2', templateId: 'pilot-final-report', versionNo: 2, draft: currentDraft,
      sourceRevisionIds: [], createdBy: 'teacher', createdAt: '2026-10-07T01:00:00Z',
    },
  ]
  const review = { ...reviewDocumentTemplate(currentDraft), versionNo: 2 }
  const model = buildTemplateBuilderViewModel(source, review)
  assert.equal(model.sections[0].label, 'Intestazione aggiornata')
  assert.equal(model.canApprove, true)
})

test('builder rejects a quality review that belongs to a different version', () => {
  const source = snapshot()
  source.template.currentVersionNo = 2
  const currentDraft = { ...finalReportCanonicalTemplate(), version: 2 }
  source.versions.push({
    id: 'version-2', templateId: 'pilot-final-report', versionNo: 2, draft: currentDraft,
    sourceRevisionIds: [], createdBy: 'teacher', createdAt: '2026-10-07T01:00:00Z',
  })
  const staleReview = { ...reviewDocumentTemplate(source.versions[0].draft), versionNo: 1 }
  assert.throws(
    () => buildTemplateBuilderViewModel(source, staleReview),
    /review.*versione|versione.*review/i,
  )
})
