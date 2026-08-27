import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCurriculumFeedbackPreview,
  submitCurriculumFeedback,
  type CurriculumFeedbackDraft,
} from './cml-curriculum-feedback'

const ref = (namespace: string, entityType: string, entityId: string, versionId?: string) => ({
  namespace, entityType, entityId, ...(versionId ? { versionId } : {}),
})

function draft(): CurriculumFeedbackDraft {
  return {
    feedbackId: 'feedback-001',
    sourceVersion: 'docente-os-develop',
    submittedAt: '2026-08-27T21:00:00.000Z',
    baseline: {
      curricularContextId: 'ctx-tech-1a-2026',
      curriculumVersionRef: ref('curmanlight.arena', 'CurriculumVersion', 'technology-grade-1', '2026-27'),
      sourceHandoffFootprintHash: 'deadbeef',
      sourceFrameworkMessageId: 'framework-001',
    },
    category: 'PREREQUISITE',
    alignedNodeRefs: [ref('curmanlight.arena', 'CurriculumNode', 'node-001')],
    evidenceRefs: [ref('docente.os', 'AnnualPlanBlock', 'section-1a:B04', '2026-27')],
    summary: 'Il prerequisito grafico va anticipato prima dell’attività di modellazione.',
    privacyAttestation: 'NO_STUDENT_PERSONAL_DATA',
  }
}

describe('CML curriculum feedback v1 producer', () => {
  it('builds a preview that cannot persist or transport', () => {
    const preview = buildCurriculumFeedbackPreview(draft())
    assert.equal(preview.status, 'READY_FOR_TEACHER_CONFIRMATION')
    assert.equal(preview.persistenceAllowed, false)
    assert.equal(preview.transportAllowed, false)
    assert.deepEqual(preview.excludedData, ['STUDENT_IDENTIFIERS', 'GRADES', 'ATTENDANCE', 'PRIVATE_NOTES', 'RAW_CLASSROOM_EVENTS'])
  })

  it('requires explicit teacher confirmation before creating the envelope', () => {
    assert.throws(() => submitCurriculumFeedback({ draft: draft(), teacherConfirmed: false }), /teacher confirmation is required/)
  })

  it('emits the existing Arena CML_INTEROP_V1 reverse message shape', () => {
    const submission = submitCurriculumFeedback({ draft: draft(), teacherConfirmed: true })
    assert.equal(submission.status, 'SUBMITTED_LOCALLY')
    assert.equal(submission.transportAllowed, false)
    assert.equal(submission.envelope.contract, 'CML_INTEROP_V1')
    assert.equal(submission.envelope.messageType, 'CURRICULUM_FEEDBACK_SUBMITTED')
    assert.equal(submission.envelope.sourceProduct, 'DOCENTE_OS')
    assert.equal(submission.envelope.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.equal(submission.envelope.payload.teacherConfirmed, true)
    assert.equal(submission.idempotencyKey, 'DOCENTE_OS:CURRICULUM_FEEDBACK_SUBMITTED:feedback-001')
  })

  it('preserves the accepted Arena baseline in provenance without claiming authority', () => {
    const submission = submitCurriculumFeedback({ draft: draft(), teacherConfirmed: true })
    assert.equal(submission.envelope.provenance.generatedBy, 'HUMAN')
    assert.equal(submission.envelope.provenance.humanConfirmed, true)
    assert.ok(submission.envelope.provenance.note.includes('ctx-tech-1a-2026'))
    assert.ok(submission.envelope.provenance.sourceRefs.some((entry) => entry.namespace === 'curmanlight.arena' && entry.entityType === 'CurriculumVersion'))
  })

  it('rejects forbidden student-data fields even when hidden in nested input', () => {
    const candidate = draft() as unknown as Record<string, unknown>
    candidate.extra = { studentName: 'forbidden' }
    assert.throws(
      () => buildCurriculumFeedbackPreview(candidate as unknown as CurriculumFeedbackDraft),
      /forbidden personal-data fields/,
    )
  })

  it('requires evidence references rather than raw classroom evidence', () => {
    const candidate = draft()
    candidate.evidenceRefs = []
    assert.throws(() => buildCurriculumFeedbackPreview(candidate), /evidenceRefs must contain professional canonical references/)
  })
})
