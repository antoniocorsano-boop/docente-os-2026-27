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
