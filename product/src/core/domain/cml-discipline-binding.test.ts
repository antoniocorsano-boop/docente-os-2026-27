import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertEco02PilotCurriculumIntakeScope,
  assertUploadedArenaAuthorityContextAllowed,
  bindArenaDisciplineRefToDocenteOs,
  buildArenaCurriculumTargetScope,
  ECO02_PILOT_UPLOAD_MAX_BYTES,
  isEco02PilotClass,
  type Eco02PilotIdentity,
} from './cml-discipline-binding'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'

const AUTHORIZED_PILOT: Eco02PilotIdentity = {
  workspaceId: 'workspace-pilot',
  academicYearId: 'year-2026-2027',
  sectionId: 'section-2c-pilot',
  grade: 'SECONDA',
  sectionCode: 'C',
}

const pilotInput = {
  ...AUTHORIZED_PILOT,
  disciplineRef: 'tecnologia',
}

test('binds Arena Tecnologia to the canonical Docente OS technology key', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('Tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('technology'), 'technology')
})

test('preserves unknown non-empty discipline refs until a canonical alias is defined', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('matematica'), 'matematica')
  assert.throws(() => bindArenaDisciplineRefToDocenteOs('   '), /disciplineRef is required/)
})

test('binds ECO-02 intake to the exact configured pilot identity', () => {
  assert.equal(isEco02PilotClass(AUTHORIZED_PILOT, AUTHORIZED_PILOT), true)
  assert.equal(isEco02PilotClass({ ...AUTHORIZED_PILOT, workspaceId: 'other-workspace' }, AUTHORIZED_PILOT), false)
  assert.equal(isEco02PilotClass({ ...AUTHORIZED_PILOT, academicYearId: 'other-year' }, AUTHORIZED_PILOT), false)
  assert.equal(isEco02PilotClass({ ...AUTHORIZED_PILOT, sectionId: 'other-2c' }, AUTHORIZED_PILOT), false)
  assert.equal(isEco02PilotClass(AUTHORIZED_PILOT, null), false)

  assert.doesNotThrow(() => assertEco02PilotCurriculumIntakeScope(pilotInput, AUTHORIZED_PILOT))
  assert.throws(
    () => assertEco02PilotCurriculumIntakeScope(
      { ...pilotInput, workspaceId: 'other-workspace' },
      AUTHORIZED_PILOT,
    ),
    /explicitly authorized Technology 2C pilot identity/,
  )
  assert.throws(
    () => assertEco02PilotCurriculumIntakeScope(
      { ...pilotInput, disciplineRef: 'matematica' },
      AUTHORIZED_PILOT,
    ),
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

test('rejects every institutional approval-bearing claim from local uploaded JSON', () => {
  const provisional = context({ sectionRef: '2C' })
  assert.doesNotThrow(() => assertUploadedArenaAuthorityContextAllowed(provisional))

  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed({
      ...provisional,
      curriculumState: 'APPROVED',
      approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-1' },
    }),
    /cannot establish institutional approval authority/,
  )

  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed({
      ...provisional,
      transitionRemodulation: {
        ...provisional.transitionRemodulation,
        state: 'APPROVED',
        institutionallyApproved: true,
        approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-2' },
      },
    }),
    /cannot establish institutional approval authority/,
  )

  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed({
      ...provisional,
      transitionRemodulation: {
        ...provisional.transitionRemodulation,
        institutionallyApproved: true,
      },
    }),
    /cannot establish institutional approval authority/,
  )
})

test('keeps the pilot upload ceiling below the default Server Action request limit', () => {
  assert.equal(ECO02_PILOT_UPLOAD_MAX_BYTES, 500_000)
  assert.ok(ECO02_PILOT_UPLOAD_MAX_BYTES < 1_000_000)
})
