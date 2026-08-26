import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeCmlLocalHandoffFootprint,
  type CmlLocalHandoffV1,
} from './cml-local-handoff'
import {
  buildAnnualPlanFrameworkReviewDraft,
  prepareAnnualPlanFrameworkApply,
  assertApplyMatchesContext,
  type TeacherFrameworkDecision,
} from './cml-handoff-acceptance'

function ref(entityType: string, entityId: string, versionId?: string) {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function handoffFixture(): CmlLocalHandoffV1 {
  const base = {
    format: 'CML_LOCAL_HANDOFF_V1' as const,
    targetProduct: 'DOCENTE_OS' as const,
    acceptanceRequired: true as const,
    importMode: 'PREVIEW_ONLY' as const,
    generatedAt: '2026-08-26T12:15:00.000Z',
    curriculumAdopted: {
      contract: 'CML_INTEROP_V1' as const,
      messageId: 'msg-curriculum-001',
      messageType: 'CURRICULUM_ADOPTED' as const,
      sourceProduct: 'CURMANLIGHT_ARENA' as const,
      sourceVersion: 'arena-v1',
      emittedAt: '2026-08-26T12:00:00.000Z',
      payloadVersion: 1 as const,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL' as const,
      provenance: { sourceRefs: [ref('CurriculumVersion', 'technology-grade-1', '2026-27')], generatedBy: 'HUMAN' as const, humanConfirmed: true },
      payload: {
        schoolYearRef: '2026-2027', disciplineRef: 'technology', gradeRef: 'grade-1',
        curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
      },
    },
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1' as const,
      messageId: 'msg-framework-001',
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE' as const,
      sourceProduct: 'CURMANLIGHT_ARENA' as const,
      sourceVersion: 'arena-v1',
      emittedAt: '2026-08-26T12:00:00.000Z',
      payloadVersion: 1 as const,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL' as const,
      provenance: { sourceRefs: [ref('CurriculumVersion', 'technology-grade-1', '2026-27')], generatedBy: 'SYSTEM_DERIVED' as const, humanConfirmed: true },
      payload: {
        disciplineRef: 'technology', gradeRef: 'grade-1',
        curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
        periods: [
          { periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-001')] },
          { periodId: 'p2', label: 'Secondo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-002')] },
        ],
        constraints: [{ id: 'c1', kind: 'REQUIRED' as const, description: 'Preservare allineamento curricolare.' }],
      },
    },
  }
  return { ...base, structuralFootprint: { algorithm: 'fnv1a', version: 1, hash: computeCmlLocalHandoffFootprint(base) } }
}

function acceptedDecision(handoff: CmlLocalHandoffV1): TeacherFrameworkDecision {
  return {
    contract: 'CML_HANDOFF_ACCEPTANCE_V1',
    decisionId: 'decision-001',
    actorRole: 'TEACHER',
    decision: 'ACCEPTED',
    confirmedAt: '2026-08-26T13:00:00.000Z',
    handoffFootprintHash: handoff.structuralFootprint.hash,
    curriculumMessageId: handoff.curriculumAdopted.messageId,
    frameworkMessageId: handoff.annualPlanningFramework.messageId,
  }
}

describe('CML handoff teacher acceptance and apply', () => {
  it('keeps the review draft non-persistent before teacher decision', () => {
    const draft = buildAnnualPlanFrameworkReviewDraft(handoffFixture())
    assert.equal(draft.status, 'AWAITING_TEACHER_DECISION')
    assert.equal(draft.persistenceAllowed, false)
  })

  it('authorizes an apply command only after explicit teacher acceptance', () => {
    const handoff = handoffFixture()
    const draft = buildAnnualPlanFrameworkReviewDraft(handoff)
    const command = prepareAnnualPlanFrameworkApply({ draft, decision: acceptedDecision(handoff) })
    assert.equal(command.status, 'AUTHORIZED_FOR_PERSISTENCE')
    assert.equal(command.writeAuthorized, true)
    assert.equal(command.target, 'ANNUAL_PLAN_FRAMEWORK_ADOPTION')
  })

  it('rejects a negative teacher decision', () => {
    const handoff = handoffFixture()
    const decision = { ...acceptedDecision(handoff), decision: 'REJECTED' as const }
    assert.throws(() => prepareAnnualPlanFrameworkApply({ draft: buildAnnualPlanFrameworkReviewDraft(handoff), decision }), /framework was not accepted/)
  })

  it('rejects acceptance from an actor other than TEACHER', () => {
    const handoff = handoffFixture()
    const decision = { ...acceptedDecision(handoff), actorRole: 'SYSTEM' as unknown as 'TEACHER' }
    assert.throws(() => prepareAnnualPlanFrameworkApply({ draft: buildAnnualPlanFrameworkReviewDraft(handoff), decision }), /only TEACHER/)
  })

  it('rejects a decision bound to another handoff', () => {
    const handoff = handoffFixture()
    const decision = { ...acceptedDecision(handoff), handoffFootprintHash: 'deadbeef' }
    assert.throws(() => prepareAnnualPlanFrameworkApply({ draft: buildAnnualPlanFrameworkReviewDraft(handoff), decision }), /not bound to this handoff/)
  })

  it('preserves teacher edits in the reviewed framework', () => {
    const handoff = handoffFixture()
    const draft = buildAnnualPlanFrameworkReviewDraft(handoff)
    const editedPeriods = draft.periods.map((period) => period.periodId === 'p1' ? { ...period, label: 'Primo quadrimestre' } : period)
    const command = prepareAnnualPlanFrameworkApply({ draft, decision: acceptedDecision(handoff), reviewedPeriods: editedPeriods })
    assert.equal(command.reviewedFramework.periods[0]?.label, 'Primo quadrimestre')
    assert.equal(draft.periods[0]?.label, 'Primo periodo')
  })

  it('keeps apply bound to the same annual-plan context', () => {
    const handoff = handoffFixture()
    const draft = buildAnnualPlanFrameworkReviewDraft(handoff)
    const command = prepareAnnualPlanFrameworkApply({ draft, decision: acceptedDecision(handoff) })
    assert.doesNotThrow(() => assertApplyMatchesContext(command, draft.context))
    assert.throws(() => assertApplyMatchesContext(command, { ...draft.context, gradeRef: 'grade-2' }), /context mismatch/)
  })
})
