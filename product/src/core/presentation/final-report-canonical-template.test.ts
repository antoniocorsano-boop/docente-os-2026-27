import assert from 'node:assert/strict'
import test from 'node:test'
import { findForbiddenTechnicalReferences, reviewDocumentTemplate } from '../application/document-template-quality'
import {
  composeFinalReportEvidenceBundle,
  deriveFinalReportReadiness,
} from '../domain/final-report-evidence'
import {
  FINAL_REPORT_CANONICAL_TEMPLATE_V1,
  finalReportCanonicalTemplate,
} from './final-report-canonical-template'

const expectedOrder = [
  'IDENTITY',
  'CLASS_PROFILE',
  'EXECUTED_PATH',
  'OUTCOMES',
  'METHODS_TOOLS_INCLUSION',
  'ASSESSMENT',
  'CIVIC_TRANSVERSAL',
  'FINAL_REFLECTION',
  'SIGNATURE',
]

test('final report canonical template uses the approved institutional section order', () => {
  assert.deepEqual(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.map((section) => section.key), expectedOrder)
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'EXECUTED_PATH')?.renderRole, 'TABLE')
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'OUTCOMES')?.renderRole, 'PARAGRAPH')
  assert.equal(FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.find((section) => section.key === 'CIVIC_TRANSVERSAL')?.required, false)
})

test('canonical template external labels are clean and quality review passes', () => {
  const labels = FINAL_REPORT_CANONICAL_TEMPLATE_V1.sections.flatMap((section) => [
    section.label,
    ...section.fields.map((field) => field.label),
  ])
  assert.deepEqual(findForbiddenTechnicalReferences(labels.join('\n')), [])
  assert.equal(reviewDocumentTemplate(FINAL_REPORT_CANONICAL_TEMPLATE_V1).result, 'PASS')
})

test('template factory returns a defensive copy', () => {
  const first = finalReportCanonicalTemplate()
  first.sections[0].label = 'Mutato'
  assert.notEqual(finalReportCanonicalTemplate().sections[0].label, 'Mutato')
})

test('final report evidence keeps planned and executed authority separate and fails closed on missing institutional base', () => {
  const bundle = composeFinalReportEvidenceBundle({
    context: {
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      sectionId: 'section-2c',
      disciplineId: 'technology',
    },
    plannedBlocks: [
      { blockId: 'B01', state: 'SVOLTO' },
      { blockId: 'B02', state: 'PIANIFICATO' },
    ],
    teachingSessions: {
      sessions: [
        {
          id: 'session-old',
          workspaceId: 'workspace-1',
          academicYearId: 'year-1',
          sectionId: 'section-2c',
          disciplineId: 'technology',
          localDate: '2026-10-01',
          plannedStartAt: null,
          plannedEndAt: null,
          plannedMinutes: 45,
          actualMinutes: 45,
          evidenceNote: null,
          source: {
            sourceKind: 'MANUAL',
            projectedOccurrenceLogicalId: null,
            timetableVersionId: null,
            timetableSlotId: null,
            calendarState: 'SCHOOL_DAY',
            provenance: [],
          },
          supersedesSessionId: null,
          recordedBy: 'teacher-1',
          recordedAt: '2026-10-01T10:00:00Z',
        },
        {
          id: 'session-current',
          workspaceId: 'workspace-1',
          academicYearId: 'year-1',
          sectionId: 'section-2c',
          disciplineId: 'technology',
          localDate: '2026-10-02',
          plannedStartAt: null,
          plannedEndAt: null,
          plannedMinutes: 60,
          actualMinutes: 60,
          evidenceNote: null,
          source: {
            sourceKind: 'MANUAL',
            projectedOccurrenceLogicalId: null,
            timetableVersionId: null,
            timetableSlotId: null,
            calendarState: 'SCHOOL_DAY',
            provenance: [],
          },
          supersedesSessionId: 'session-old',
          recordedBy: 'teacher-1',
          recordedAt: '2026-10-02T10:00:00Z',
        },
        {
          id: 'session-unallocated',
          workspaceId: 'workspace-1',
          academicYearId: 'year-1',
          sectionId: 'section-2c',
          disciplineId: 'technology',
          localDate: '2026-10-03',
          plannedStartAt: null,
          plannedEndAt: null,
          plannedMinutes: 60,
          actualMinutes: 60,
          evidenceNote: null,
          source: {
            sourceKind: 'MANUAL',
            projectedOccurrenceLogicalId: null,
            timetableVersionId: null,
            timetableSlotId: null,
            calendarState: 'SCHOOL_DAY',
            provenance: [],
          },
          supersedesSessionId: null,
          recordedBy: 'teacher-1',
          recordedAt: '2026-10-03T10:00:00Z',
        },
      ],
      allocations: [
        {
          id: 'allocation-1',
          sessionId: 'session-current',
          blockId: 'B02',
          minutes: 60,
          canonicalPlanAssetId: 'plan-1',
          canonicalGenerationId: 'generation-1',
          createdAt: '2026-10-02T10:00:00Z',
        },
      ],
    },
    observations: [],
    evidenceReferences: [],
    materialUsageReceipts: [],
    institutionalSources: {
      hasActiveInstitutionalBase: false,
      hasActiveFinalReportTemplate: true,
    },
    humanRequired: ['Quadro professionale della classe'],
    evidenceFreshness: 'frontier-1',
  })

  const readiness = deriveFinalReportReadiness(bundle)

  assert.equal(bundle.executed.totalActualMinutes, 120)
  assert.equal(bundle.executed.supersededSessionCount, 1)
  assert.equal(bundle.executed.unallocatedSessions.length, 1)
  assert.ok(readiness.findings.some((finding) => finding.code === 'PLAN_BLOCK_WITHOUT_SESSION'))
  assert.ok(readiness.findings.some((finding) => finding.code === 'SESSION_ON_PLANNED_BLOCK'))
  assert.ok(readiness.findings.some((finding) => finding.code === 'UNALLOCATED_SESSION'))
  assert.ok(readiness.findings.some((finding) => finding.code === 'MISSING_ACTIVE_INSTITUTIONAL_BASE'))
  assert.notEqual(readiness.state, 'PRONTA_PER_BOZZA')
})
