import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertEco02PilotCurriculumIntakeScope,
  assertUploadedArenaAuthorityContextAllowed,
  bindArenaDisciplineRefToDocenteOs,
  buildArenaCurriculumTargetScope,
  ECO02_PILOT_UPLOAD_MAX_BYTES,
  hasUploadedArenaAuthorityClaim,
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

test('binds Arena section code separately from the already explicit grade dimension', () => {
  assert.deepEqual(
    buildArenaCurriculumTargetScope({
      context: context({ sectionRef: 'C' }),
      localSectionRef: 'C',
    }),
    {
      schoolYearRef: '2026-2027',
      disciplineRef: 'tecnologia',
      gradeRef: 'grade-2',
      sectionRef: 'C',
    },
  )

  assert.deepEqual(
    buildArenaCurriculumTargetScope({
      context: context({ cohortRef: 'cohort-2026-grade-2' }),
      localSectionRef: 'C',
    }),
    {
      schoolYearRef: '2026-2027',
      disciplineRef: 'tecnologia',
      gradeRef: 'grade-2',
      cohortRef: 'cohort-2026-grade-2',
    },
  )
})

test('classifies and rejects every institutional approval-bearing claim from local uploaded JSON', () => {
  const provisional = context({ sectionRef: 'C' })
  assert.equal(hasUploadedArenaAuthorityClaim(provisional), false)
  assert.doesNotThrow(() => assertUploadedArenaAuthorityContextAllowed(provisional))

  const topLevelApproved = {
    ...provisional,
    curriculumState: 'APPROVED' as const,
    approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-1' },
  }
  assert.equal(hasUploadedArenaAuthorityClaim(topLevelApproved), true)
  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed(topLevelApproved),
    /cannot establish institutional approval authority/,
  )

  const nestedApproved = {
    ...provisional,
    transitionRemodulation: {
      ...provisional.transitionRemodulation,
      state: 'APPROVED' as const,
      institutionallyApproved: true,
      approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-2' },
    },
  }
  assert.equal(hasUploadedArenaAuthorityClaim(nestedApproved), true)
  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed(nestedApproved),
    /cannot establish institutional approval authority/,
  )

  const institutionalFlagOnly = {
    ...provisional,
    transitionRemodulation: {
      ...provisional.transitionRemodulation,
      institutionallyApproved: true,
    },
  }
  assert.equal(hasUploadedArenaAuthorityClaim(institutionalFlagOnly), true)
  assert.throws(
    () => assertUploadedArenaAuthorityContextAllowed(institutionalFlagOnly),
    /cannot establish institutional approval authority/,
  )

  const nestedDecisionRefOnly = {
    ...provisional,
    transitionRemodulation: {
      ...provisional.transitionRemodulation,
      approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-3' },
    },
  }
  assert.equal(hasUploadedArenaAuthorityClaim(nestedDecisionRefOnly), true)

  const topLevelDecisionRefOnly = {
    ...provisional,
    approvalDecisionRef: { namespace: 'curmanlight.arena', entityType: 'Decision', entityId: 'decision-4' },
  }
  assert.equal(hasUploadedArenaAuthorityClaim(topLevelDecisionRefOnly), true)
})

test('keeps the pilot upload ceiling below the default Server Action request limit', () => {
  assert.equal(ECO02_PILOT_UPLOAD_MAX_BYTES, 500_000)
  assert.ok(ECO02_PILOT_UPLOAD_MAX_BYTES < 1_000_000)
})
