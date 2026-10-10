import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { reviewDocumentTemplate, reviewInstitutionalBase } from '../../../core/application/document-template-quality'
import { finalReportCanonicalTemplate } from '../../../core/presentation/final-report-canonical-template'
import type { DocumentTemplateSnapshot } from '../../../core/infrastructure/supabase/supabase-document-template-repository'
import type { InstitutionalBaseSnapshot } from '../../../core/infrastructure/supabase/supabase-institutional-base-repository'
import type { InstitutionalBaseVersionDraft } from '../../../core/domain/document-template'
import {
  buildGovernedTemplateBuilderViewModel,
  buildTemplateBuilderViewModel,
} from './template-builder-model'

function snapshot(): DocumentTemplateSnapshot {
  const draft = finalReportCanonicalTemplate()
  return {
    template: {
      id: 'final-report-template', workspaceId: 'workspace', kind: 'FINAL_REPORT', name: draft.name,
      status: 'DRAFT', currentVersionNo: 1, activeVersionNo: null,
      createdBy: 'teacher', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
    },
    activeVersion: null,
    versions: [{
      id: 'version-1', templateId: 'final-report-template', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'teacher', createdAt: '2026-10-07T00:00:00Z',
    }],
    qualityReviews: [],
    sources: [],
  }
}

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
      bodyFontFamily: 'Arial', headingFontFamily: 'Arial', baseFontSizePt: 11, lineHeight: 1.3,
    },
    pageGeometryProfile: {
      format: 'A4', orientation: 'PORTRAIT', marginTopMm: 18, marginRightMm: 18, marginBottomMm: 18, marginLeftMm: 18,
    },
    commonTableProfile: { headerWeight: 'BOLD', cellPaddingMm: 2, repeatHeader: true },
    signatureProfile: { showLocation: true, showDate: true, label: 'Il docente' },
    accessibilityProfile: { minimumFontSizePt: 10, highContrast: true, tableHeadersRequired: true },
    sourceRevisionRefs: [],
  }
}

function baseSnapshot(status: InstitutionalBaseSnapshot['base']['status'] = 'DRAFT'): InstitutionalBaseSnapshot {
  const draft = institutionalBaseDraft()
  return {
    base: {
      id: 'institutional-base', workspaceId: 'workspace', name: 'Veste istituzionale', status,
      currentVersionNo: 1, activeVersionNo: status === 'ACTIVE' ? 1 : null,
      createdBy: 'owner', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
    },
    activeVersion: status === 'ACTIVE' ? {
      id: 'base-version-1', baseId: 'institutional-base', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-07T00:00:00Z',
    } : null,
    versions: [{
      id: 'base-version-1', baseId: 'institutional-base', versionNo: 1, draft,
      sourceRevisionIds: [], createdBy: 'owner', createdAt: '2026-10-07T00:00:00Z',
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
      id: 'version-2', templateId: 'final-report-template', versionNo: 2, draft: currentDraft,
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
    id: 'version-2', templateId: 'final-report-template', versionNo: 2, draft: currentDraft,
    sourceRevisionIds: [], createdBy: 'teacher', createdAt: '2026-10-07T01:00:00Z',
  })
  const staleReview = { ...reviewDocumentTemplate(source.versions[0].draft), versionNo: 1 }
  assert.throws(
    () => buildTemplateBuilderViewModel(source, staleReview),
    /review.*versione|versione.*review/i,
  )
})

test('governed builder keeps Veste istituzionale and Modello del documento as distinct streams', () => {
  const base = baseSnapshot()
  const family = snapshot()
  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    institutionalBaseReview: reviewInstitutionalBase(base.versions[0].draft),
    familyTemplate: family,
    familyTemplateReview: reviewDocumentTemplate(family.versions[0].draft),
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.heading, 'Veste istituzionale')
  assert.equal(model.familyTemplate.heading, 'Modello del documento')
  assert.equal(model.institutionalBase.title, 'Veste istituzionale')
  assert.equal(model.familyTemplate.title, 'Relazione finale del docente')
  assert.equal(model.familyTemplate.sections.length > 0, true)
})

test('MEMBER can inspect both streams but never receives institution-wide lifecycle controls', () => {
  const base = baseSnapshot()
  const family = snapshot()
  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    institutionalBaseReview: reviewInstitutionalBase(base.versions[0].draft),
    familyTemplate: family,
    familyTemplateReview: reviewDocumentTemplate(family.versions[0].draft),
    role: 'MEMBER',
  })

  assert.deepEqual(model.institutionalBase.actions, [])
  assert.deepEqual(model.familyTemplate.actions, [])
})

test('empty governed streams distinguish a review not yet performed from a blocker-free review', () => {
  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: null,
    familyTemplate: null,
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.reviewAvailable, false)
  assert.equal(model.familyTemplate.reviewAvailable, false)
  assert.equal(model.institutionalBase.reviewLabel, 'Controllo non ancora effettuato')
  assert.equal(model.familyTemplate.reviewLabel, 'Controllo non ancora effettuato')
})

test('OWNER sees state-safe lifecycle actions and RETIRED exposes inspection only', () => {
  const blockedBase = baseSnapshot('BLOCKED')
  const retiredFamily = snapshot()
  retiredFamily.template.status = 'RETIRED'
  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: blockedBase,
    institutionalBaseReview: reviewInstitutionalBase(blockedBase.versions[0].draft),
    familyTemplate: retiredFamily,
    familyTemplateReview: reviewDocumentTemplate(retiredFamily.versions[0].draft),
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.actions.some((action) => action.key === 'ACTIVATE'), false)
  assert.equal(model.institutionalBase.actions.some((action) => action.key === 'CLEAR_BLOCK'), true)
  assert.equal(model.institutionalBase.actions.some((action) => action.key === 'RETIRE'), true)
  assert.deepEqual(model.familyTemplate.actions, [])
})

test('runtime page uses persisted base and family repositories instead of an in-memory pilot snapshot', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/app/documentazione/modelli/page.tsx'), 'utf8')
  const component = readFileSync(resolve(process.cwd(), 'src/app/documentazione/modelli/TemplateBuilder.tsx'), 'utf8')

  assert.match(page, /SupabaseInstitutionalBaseRepository/)
  assert.match(page, /SupabaseDocumentTemplateRepository/)
  assert.match(page, /listForWorkspace/)
  assert.doesNotMatch(page, /pilot-final-report-template|finalReportCanonicalTemplate/)
  assert.match(component, /model\.institutionalBase/)
  assert.match(component, /model\.familyTemplate/)
})

test('browser certification preserves the HVA HTML report before later Playwright gates run', () => {
  const workflow = readFileSync(
    resolve(process.cwd(), '../.github/workflows/browser-certification-orchestrator.yml'),
    'utf8',
  )
  const enforceHVA = workflow.indexOf('name: Enforce HVA receipt')
  const preserveHVA = workflow.indexOf('name: Preserve HVA HTML report')
  const wcag = workflow.indexOf('name: Run WCAG 2.2 AA automated assurance')

  assert.notEqual(enforceHVA, -1)
  assert.notEqual(preserveHVA, -1)
  assert.notEqual(wcag, -1)
  assert.equal(enforceHVA < preserveHVA && preserveHVA < wcag, true)
  assert.match(workflow, /playwright-report\/experience/)
  assert.match(workflow, /test-results\/experience\/hva-html-report/)
})

test('governed builder keeps newly created identities usable before version 1 exists', () => {
  const base = baseSnapshot()
  base.base.currentVersionNo = 0
  base.base.activeVersionNo = null
  base.versions = []
  base.activeVersion = null
  base.qualityReviews = []

  const family = snapshot()
  family.template.currentVersionNo = 0
  family.template.activeVersionNo = null
  family.versions = []
  family.activeVersion = null
  family.qualityReviews = []

  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    familyTemplate: family,
    role: 'OWNER',
  })

  assert.equal(model.institutionalBase.identityId, 'institutional-base')
  assert.equal(model.institutionalBase.currentVersionNo, null)
  assert.equal(model.institutionalBase.reviewAvailable, false)
  assert.deepEqual(model.institutionalBase.actions, [])
  assert.equal(model.familyTemplate.identityId, 'final-report-template')
  assert.equal(model.familyTemplate.currentVersionNo, null)
  assert.equal(model.familyTemplate.reviewAvailable, false)
  assert.deepEqual(model.familyTemplate.sections, [])
  assert.deepEqual(model.familyTemplate.actions, [])
})

test('governed builder fails safe when the current family draft has malformed sections', () => {
  const base = baseSnapshot()
  const family = snapshot()
  family.versions[0].draft = {} as DocumentTemplateSnapshot['versions'][number]['draft']

  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase: base,
    institutionalBaseReview: reviewInstitutionalBase(base.versions[0].draft),
    familyTemplate: family,
    role: 'OWNER',
  })

  assert.equal(model.familyTemplate.reviewAvailable, false)
  assert.equal(model.familyTemplate.canApprove, false)
  assert.deepEqual(model.familyTemplate.sections, [])
})

test('HVA report preservation failure cannot suppress later independent browser gates', () => {
  const workflow = readFileSync(
    resolve(process.cwd(), '../.github/workflows/browser-certification-orchestrator.yml'),
    'utf8',
  )
  const preserveStart = workflow.indexOf('- name: Preserve HVA HTML report')
  const wcagStart = workflow.indexOf('- name: Run WCAG 2.2 AA automated assurance')
  assert.notEqual(preserveStart, -1)
  assert.notEqual(wcagStart, -1)
  const preserveStep = workflow.slice(preserveStart, wcagStart)
  assert.match(preserveStep, /continue-on-error:\s*true/)
})

test('canonical npm test keeps the class task-state regression suite', () => {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    scripts?: { test?: string }
  }
  assert.match(packageJson.scripts?.test ?? '', /src\/app\/classi\/\[sectionId\]\/class-task-state\.test\.ts/)
})
