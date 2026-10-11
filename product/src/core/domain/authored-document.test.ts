import assert from 'node:assert/strict'
import test from 'node:test'

import * as authoredDocumentDomain from './authored-document'

type GeneralizedDomain = typeof authoredDocumentDomain & {
  validateAuthoredDocumentContext?: (document: Record<string, unknown>) => string[]
  isUdaAuthoredDocument?: (document: Record<string, unknown>) => boolean
  isFinalReportAuthoredDocument?: (document: Record<string, unknown>) => boolean
  canOpenUdaAuthoring?: (document: Record<string, unknown>) => boolean
}

const domain = authoredDocumentDomain as GeneralizedDomain

const validUda = {
  id: 'doc-uda-1',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  sourceAssetId: 'asset-1',
  sectionId: null,
  teachingDisciplineId: null,
  documentKind: 'UDA',
  title: 'UDA Tecnologia',
  currentVersionNo: 1,
  createdBy: 'teacher-1',
  createdAt: '2026-10-11T08:00:00.000Z',
  updatedAt: '2026-10-11T08:00:00.000Z',
}

const validFinalReport = {
  id: 'doc-final-1',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  sourceAssetId: null,
  sectionId: 'section-2c',
  teachingDisciplineId: 'technology',
  documentKind: 'FINAL_REPORT',
  title: 'Relazione finale 2C — Tecnologia',
  currentVersionNo: 1,
  createdBy: 'teacher-1',
  createdAt: '2026-10-11T08:00:00.000Z',
  updatedAt: '2026-10-11T08:00:00.000Z',
}

function requireValidator() {
  if (typeof domain.validateAuthoredDocumentContext !== 'function') {
    assert.fail('validateAuthoredDocumentContext must be exported')
  }
  return domain.validateAuthoredDocumentContext
}

function requireKindGuards() {
  if (typeof domain.isUdaAuthoredDocument !== 'function') {
    assert.fail('isUdaAuthoredDocument must be exported')
  }
  if (typeof domain.isFinalReportAuthoredDocument !== 'function') {
    assert.fail('isFinalReportAuthoredDocument must be exported')
  }
  return {
    isUda: domain.isUdaAuthoredDocument,
    isFinalReport: domain.isFinalReportAuthoredDocument,
  }
}

function requireUdaAuthoringGuard() {
  if (typeof domain.canOpenUdaAuthoring !== 'function') {
    assert.fail('canOpenUdaAuthoring must be exported')
  }
  return domain.canOpenUdaAuthoring
}

test('generalized authored-document domain accepts valid UDA context unchanged', () => {
  assert.deepEqual(requireValidator()(validUda), [])
})

test('generalized authored-document domain accepts valid FINAL_REPORT context', () => {
  assert.deepEqual(requireValidator()(validFinalReport), [])
})

test('generalized authored-document domain requires a source asset for UDA', () => {
  const errors = requireValidator()({ ...validUda, sourceAssetId: null })
  assert.ok(errors.includes('UDA_SOURCE_REQUIRED'))
})

test('generalized authored-document domain rejects a source asset for FINAL_REPORT', () => {
  const errors = requireValidator()({ ...validFinalReport, sourceAssetId: 'asset-forbidden' })
  assert.ok(errors.includes('FINAL_REPORT_SOURCE_FORBIDDEN'))
})

test('UDA authoring guard rejects FINAL_REPORT and source-less UDA contexts', () => {
  const canOpen = requireUdaAuthoringGuard()
  assert.equal(canOpen(validUda), true)
  assert.equal(canOpen(validFinalReport), false)
  assert.equal(canOpen({ ...validUda, sourceAssetId: null }), false)
})

test('generalized authored-document kind guards distinguish UDA and FINAL_REPORT', () => {
  const { isUda, isFinalReport } = requireKindGuards()
  assert.equal(isUda(validUda), true)
  assert.equal(isUda(validFinalReport), false)
  assert.equal(isFinalReport(validFinalReport), true)
  assert.equal(isFinalReport(validUda), false)
})
