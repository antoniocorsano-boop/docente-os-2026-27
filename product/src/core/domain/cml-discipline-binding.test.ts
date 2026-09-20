import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertEco02PilotCurriculumIntakeScope,
  bindArenaDisciplineRefToDocenteOs,
  buildArenaCurriculumTargetScope,
  isEco02PilotClass,
} from './cml-discipline-binding'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'

test('binds Arena Tecnologia to the canonical Docente OS technology key', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('Tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('technology'), 'technology')
})

test('preserves unknown non-empty discipline refs until a canonical alias is defined', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('matematica'), 'matematica')
  assert.throws(() => bindArenaDisciplineRefToDocenteOs('   '), /disciplineRef is required/)
})

test('limits ECO-02 curriculum intake to Technology 2C', () => {
  assert.equal(isEco02PilotClass({ grade: 'SECONDA', sectionCode: 'c' }), true)
  assert.equal(isEco02PilotClass({ grade: 'SECONDA', sectionCode: 'A' }), false)
  assert.equal(isEco02PilotClass({ grade: 'PRIMA', sectionCode: 'C' }), false)

  assert.doesNotThrow(() => assertEco02PilotCurriculumIntakeScope({
    grade: 'SECONDA',
    sectionCode: 'C',
    disciplineRef: 'tecnologia',
  }))
  assert.throws(
    () => assertEco02PilotCurriculumIntakeScope({
      grade: 'SECONDA',
      sectionCode: 'A',
      disciplineRef: 'tecnologia',
    }),
    /authorized Technology 2C pilot/,
  )
  assert.throws(
    () => assertEco02PilotCurriculumIntakeScope({
      grade: 'SECONDA',
      sectionCode: 'C',
      disciplineRef: 'matematica',
    }),
    /accepts only Technology handoffs/,
  )
})

function context(scope: { sectionRef?: string; cohortRef?: string }): CurriculumContextForClassV1 {
  const ref = (entityType: string, entityId: string) => ({
    namespace: 'curmanlight.arena',
    entityType,
    entityId,
  })
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: 'ctx-2c',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'tecnologia',
    gradeRef: 'grade-2',
    ...scope,
    curriculumRef: ref('Curriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersion', 'technology-working'),
    curriculumState: 'PROVISIONAL_COMPLETE',
    approvalProcessRef: ref('CurriculumApprovalProcess', 'approval-2026'),
    applicabilityStatus: 'TRANSITIONAL',
    transitionRuleRef: ref('CurriculumTransitionRule', 'transition-2026'),
    completeForPlanning: true,
    requirements: [{
      requirementId: 'req-1',
      kind: 'SPECIFIC_LEARNING_OBJECTIVE',
      authorityLevel: 'TRANSITION_REQUIRED',
      curriculumNodeRef: ref('CurriculumNode', 'node-1'),
      description: 'Requirement.',
      coverageRequired: true,
      sourceRefs: [ref('Source', 'source-1')],
      transitionOriginRef: ref('NationalFramework', 'in2012'),
    }],
    transitionRemodulation: {
      state: 'HYPOTHESIS',
      rationale: 'Transizione.',
      sourceRefs: [ref('CurriculumTransitionRule', 'transition-2026')],
      affectedRequirementIds: ['req-1'],
      usableForPlanning: true,
      institutionallyApproved: false,
      proposalRef: ref('Proposal', 'proposal-1'),
    },
    sourceRefs: [ref('CurriculumVersion', 'technology-working')],
  }
}

test('preserves the incoming section/cohort scope dimensions', () => {
  assert.deepEqual(
    buildArenaCurriculumTargetScope({
      context: context({ sectionRef: '2C' }),
      localSectionRef: '2C',
    }),
    {
      schoolYearRef: '2026-2027',
      disciplineRef: 'tecnologia',
      gradeRef: 'grade-2',
      sectionRef: '2C',
    },
  )

  assert.deepEqual(
    buildArenaCurriculumTargetScope({
      context: context({ cohortRef: 'cohort-2026-grade-2' }),
      localSectionRef: '2C',
    }),
    {
      schoolYearRef: '2026-2027',
      disciplineRef: 'tecnologia',
      gradeRef: 'grade-2',
      cohortRef: 'cohort-2026-grade-2',
    },
  )
})
