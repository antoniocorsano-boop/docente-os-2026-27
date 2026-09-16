import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonPreparationManifestResult } from './lesson-preparation-manifest'
import { buildLessonPreparationRoleView } from './roleview-governance'

function supported(readiness: 'DRAFT' | 'REVIEW_REQUIRED' | 'READY'): LessonPreparationManifestResult {
  return {
    resolution: readiness === 'READY' ? 'SUPPORTED' : 'PARTIAL',
    reasons: readiness === 'DRAFT' ? ['Materiale necessario non disponibile: STUDENT_HANDOUT'] : [],
    manifest: {
      lessonRef: 'lesson-2c-1',
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      sectionId: 'section-2c',
      disciplineId: 'technology',
      temporalAuthority: 'IN_FORCE',
      blockId: 'B03',
      projectionId: 'projection-3',
      udaRef: 'UDA-02',
      packRef: 'PACK-02-03',
      objective: 'Misurare e rappresentare con precisione',
      sequence: [],
      sequenceRefs: [],
      materialSlots: [
        {
          role: 'TEACHER_BRIEF',
          required: true,
          status: 'READY',
          resourceRefs: ['teacher-brief-1'],
          titles: ['Guida docente'],
          reason: 'Disponibile',
          provenance: [{ kind: 'HUMAN_TASK_RESOURCE', ref: 'teacher-brief-1' }],
        },
        {
          role: 'STUDENT_HANDOUT',
          required: true,
          status: readiness === 'DRAFT' ? 'MISSING' : 'READY',
          resourceRefs: readiness === 'DRAFT' ? [] : ['student-handout-1'],
          titles: readiness === 'DRAFT' ? [] : ['Scheda studente'],
          reason: readiness === 'DRAFT' ? 'Materiale mancante' : 'Disponibile',
          provenance: [],
        },
        {
          role: 'VISUAL_AID',
          required: false,
          status: readiness === 'REVIEW_REQUIRED' ? 'PROPOSED' : 'READY',
          resourceRefs: ['visual-1'],
          titles: ['Schema visuale'],
          reason: readiness === 'REVIEW_REQUIRED' ? 'Richiede validazione' : 'Disponibile',
          provenance: [{ kind: 'LESSON_EXTENSION', ref: 'visual-1' }],
        },
      ],
      supportingMaterials: [],
      acceptedExtensionRefs: readiness === 'REVIEW_REQUIRED' ? [] : ['visual-1'],
      proposedExtensionRefs: readiness === 'REVIEW_REQUIRED' ? ['visual-1'] : [],
      ignoredAcceptedExtensionRefs: [],
      readiness,
      missingInformation: readiness === 'DRAFT'
        ? ['Materiale necessario non disponibile: STUDENT_HANDOUT']
        : [],
      provenance: [
        { kind: 'CANONICAL_PLAN', ref: 'plan:2:B03', label: 'Piano annuale classe seconda' },
        { kind: 'LESSON_PROJECTION', ref: 'projection-3', label: 'Proiezione lezione' },
      ],
      renderingCapabilities: ['HTML'],
    },
  }
}

test('RoleView READY espone gate PASS e KPI derivati dal manifest', () => {
  const snapshot = buildLessonPreparationRoleView(supported('READY'))

  assert.equal(snapshot.schemaVersion, 'roleview.v0')
  assert.equal(snapshot.product, 'DOCENTE_OS')
  assert.equal(snapshot.scope.id, 'lesson-2c-1')
  assert.equal(snapshot.status, 'READY')
  assert.equal(snapshot.gates[0]?.status, 'PASS')
  assert.equal(snapshot.blockers.length, 0)

  const readyRequired = snapshot.kpis.find((kpi) => kpi.id === 'ready_required_materials')
  const missingRequired = snapshot.kpis.find((kpi) => kpi.id === 'missing_required_materials')
  assert.equal(readyRequired?.value, 2)
  assert.equal(readyRequired?.target, 2)
  assert.equal(missingRequired?.value, 0)

  const materials = snapshot.maturity.find((item) => item.id === 'MATERIAL_READINESS')
  assert.equal(materials?.state, 'READY')
  assert.equal(materials?.score, undefined)
})

test('RoleView REVIEW_REQUIRED non promuove la preparazione a READY', () => {
  const snapshot = buildLessonPreparationRoleView(supported('REVIEW_REQUIRED'), 'REVIEWER')

  assert.equal(snapshot.status, 'ATTENTION')
  assert.equal(snapshot.gates[0]?.status, 'WARN')
  assert.equal(snapshot.role, 'REVIEWER')
  assert.match(snapshot.focus, /Gate/)
  assert.equal(snapshot.nextActions[0]?.id, 'REVIEW_LESSON_PREPARATION')
  assert.equal(snapshot.nextActions[0]?.href, undefined)

  const reviewKpi = snapshot.kpis.find((kpi) => kpi.id === 'materials_requiring_review')
  assert.equal(reviewKpi?.value, 1)

  const validation = snapshot.maturity.find((item) => item.id === 'HUMAN_VALIDATION')
  assert.equal(validation?.state, 'IN_PROGRESS')
})

test('LP-6: il docente passa dalla proposta da validare al writer canonico e poi a READY', () => {
  const review = buildLessonPreparationRoleView(supported('REVIEW_REQUIRED'), 'TEACHER')

  assert.equal(review.status, 'ATTENTION')
  assert.equal(review.nextActions[0]?.id, 'REVIEW_LESSON_PREPARATION')
  assert.equal(review.nextActions[0]?.label, 'Controlla proposte')
  assert.equal(
    review.nextActions[0]?.href,
    '/classi/section-2c/lezioni/B03?mode=prepare#lesson-design-tools-title',
  )

  const ready = buildLessonPreparationRoleView(supported('READY'), 'TEACHER')
  assert.equal(ready.status, 'READY')
  assert.equal(ready.gates[0]?.status, 'PASS')
  assert.equal(ready.nextActions[0]?.id, 'OPEN_LESSON')
  assert.equal(ready.nextActions[0]?.href, undefined)
})

test('RoleView DRAFT rende visibili i materiali mancanti senza inventare percentuali', () => {
  const snapshot = buildLessonPreparationRoleView(supported('DRAFT'))

  assert.equal(snapshot.status, 'ATTENTION')
  assert.equal(snapshot.gates[0]?.status, 'WARN')
  assert.ok(snapshot.blockers.some((blocker) => blocker.label.includes('STUDENT_HANDOUT')))

  const missingRequired = snapshot.kpis.find((kpi) => kpi.id === 'missing_required_materials')
  assert.equal(missingRequired?.value, 1)
  assert.equal(missingRequired?.unit, 'count')
  assert.equal(snapshot.maturity.every((item) => item.score === undefined), true)
})

test('RoleView BLOCKED resta fail-closed e conserva le cause sorgente', () => {
  const result: LessonPreparationManifestResult = {
    resolution: 'BLOCKED',
    manifest: null,
    reasons: ['SECTION_BINDING_MISMATCH', 'PROJECTION_ID_MISMATCH'],
  }

  const snapshot = buildLessonPreparationRoleView(result, 'DEVELOPER')

  assert.equal(snapshot.status, 'BLOCKED')
  assert.equal(snapshot.scope.id, 'unresolved')
  assert.equal(snapshot.gates[0]?.status, 'BLOCKED')
  assert.equal(snapshot.blockers.length, 2)
  assert.deepEqual(snapshot.blockers.map((item) => item.code), [
    'SECTION_BINDING_MISMATCH',
    'PROJECTION_ID_MISMATCH',
  ])
  assert.equal(snapshot.evidence.length, 0)
  assert.equal(snapshot.provenance.length, 0)
  assert.equal(snapshot.nextActions[0]?.id, 'RESOLVE_LESSON_PREPARATION_BINDING')
})
