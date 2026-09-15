import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from './human-task-content'
import {
  buildInternalLessonMaterialRenderBundle,
  INTERNAL_LESSON_RENDERING_CAPABILITIES,
} from './lesson-material-renderer'
import type {
  LessonPreparationManifest,
  LessonPreparationManifestResult,
} from './lesson-preparation-manifest'

function projection(overrides: Partial<HumanTaskLessonProjection> = {}): HumanTaskLessonProjection {
  return {
    projectionId: 'projection-3',
    grade: 'Seconda',
    blockId: 'B03',
    udaCode: '2-03',
    udaTitle: 'Misurare e rappresentare',
    packCode: 'CAN-PACK-2C',
    period: 'Ottobre',
    title: 'Misurare con precisione',
    durationMinutes: 60,
    why: 'Usare misure controllabili per descrivere un oggetto.',
    objective: 'Misurare e rappresentare un oggetto con procedure controllabili.',
    outcomes: ['Misurare in modo controllabile.'],
    preparation: ['Righello', 'Oggetto semplice da misurare'],
    steps: [
      { id: 'S01', minutes: 10, title: 'Avvio', instruction: 'Richiama unità e strumenti.' },
      { id: 'S02', minutes: 40, title: 'Misura', instruction: 'Misura e rappresenta un oggetto.', resourceIds: ['STUDENT-MEASURE'] },
      { id: 'S03', minutes: 10, title: 'Controllo', instruction: 'Confronta i risultati.' },
    ],
    resources: [{
      id: 'STUDENT-MEASURE',
      kind: 'STUDENT_SHEET',
      title: 'Scheda studente – Misurare e rappresentare',
      instruction: 'Lavora sul quaderno o sulla scheda seguendo le consegne.',
      prompts: ['Misura tre dimensioni.', 'Disegna uno schizzo quotato.'],
      surfaces: ['PREPARE'],
    }],
    evidence: 'Scheda di misura compilata.',
    observation: ['Usa correttamente il righello.'],
    assessmentNote: 'Controllo formativo.',
    continuation: 'Riprendere gli errori di misura nella lezione successiva.',
    sourceAlignment: { level: 'DIRECT' },
    sources: [
      { code: 'CAN-PLAN-2', label: 'Piano annuale seconda', role: 'PLAN', url: 'https://example.invalid/plan' },
      { code: 'CAN-UDA-2-03', label: 'Misurare e rappresentare', role: 'UDA', url: 'https://example.invalid/uda' },
      { code: 'CAN-PACK-2C', label: 'Pacchetto misure', role: 'PACK', url: 'https://example.invalid/pack' },
    ],
    ...overrides,
  }
}

function manifest(overrides: Partial<LessonPreparationManifest> = {}): LessonPreparationManifest {
  return {
    lessonRef: 'lesson-2c-b03',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-2c',
    disciplineId: 'technology',
    temporalAuthority: 'IN_FORCE',
    blockId: 'B03',
    projectionId: 'projection-3',
    udaRef: '2-03',
    packRef: 'CAN-PACK-2C',
    objective: 'Misurare e rappresentare un oggetto con procedure controllabili.',
    sequence: [
      {
        id: 'S01',
        origin: 'CANONICAL',
        extensionId: null,
        kind: null,
        minutes: 10,
        title: 'Avvio',
        instruction: 'Richiama unità e strumenti.',
        cue: null,
        sourceKind: null,
        sourceLabel: null,
        sourceRef: null,
      },
      {
        id: 'S02',
        origin: 'CANONICAL',
        extensionId: null,
        kind: null,
        minutes: 40,
        title: 'Misura',
        instruction: 'Misura e rappresenta un oggetto.',
        cue: null,
        sourceKind: null,
        sourceLabel: null,
        sourceRef: null,
      },
    ],
    sequenceRefs: ['S01', 'S02'],
    materialSlots: [
      {
        role: 'STUDENT_HANDOUT',
        required: true,
        status: 'READY',
        resourceRefs: ['projection:projection-3:resource:STUDENT-MEASURE'],
        titles: ['Scheda studente – Misurare e rappresentare'],
        reason: 'Risorsa canonica disponibile.',
        provenance: [{ kind: 'CANONICAL_LESSON_RESOURCE', ref: 'projection:projection-3:resource:STUDENT-MEASURE' }],
      },
      {
        role: 'TEACHER_BRIEF',
        required: false,
        status: 'READY',
        resourceRefs: ['lesson-extension:teacher-brief'],
        titles: ['Guida docente rapida'],
        reason: 'Risorsa accettata.',
        provenance: [{ kind: 'ACCEPTED_LESSON_RESOURCE', ref: 'lesson-extension:teacher-brief' }],
      },
    ],
    supportingMaterials: [],
    acceptedExtensionRefs: ['teacher-brief'],
    proposedExtensionRefs: [],
    ignoredAcceptedExtensionRefs: [],
    readiness: 'READY',
    missingInformation: [],
    provenance: [
      { kind: 'CANONICAL_PLAN', ref: 'plan:2:B03', label: 'Piano annuale seconda' },
      { kind: 'LESSON_PACK', ref: 'CAN-PACK-2C', label: 'Pacchetto misure' },
    ],
    renderingCapabilities: [...INTERNAL_LESSON_RENDERING_CAPABILITIES],
    ...overrides,
  }
}

function result(value = manifest()): LessonPreparationManifestResult {
  return { resolution: value.readiness === 'READY' ? 'SUPPORTED' : 'PARTIAL', manifest: value, reasons: value.missingInformation }
}

function extension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  return {
    id: 'student-extension',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-2c',
    canonicalPlanAssetId: 'plan-asset-2',
    canonicalGenerationId: 'generation-2',
    blockId: 'B03',
    projectionId: 'projection-3',
    kind: 'STUDENT_RESOURCE',
    status: 'ACCEPTED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: 'Scheda di confronto misure',
    body: 'Confronta le misure raccolte e annota le differenze.',
    cue: null,
    minutes: null,
    sourceKind: 'TEACHER',
    sourceRef: 'teacher:sheet-1',
    sourceLabel: 'Scheda docente',
    payload: {},
    acceptedBy: 'teacher-1',
    acceptedAt: '2026-09-15T15:00:00Z',
    createdBy: 'teacher-1',
    createdAt: '2026-09-15T14:00:00Z',
    updatedAt: '2026-09-15T15:00:00Z',
    ...overrides,
  }
}

test('LP-3: READY produce guida docente, sequenza LIM, scheda stampa e schema visuale senza provider esterni', () => {
  const rendered = buildInternalLessonMaterialRenderBundle({
    manifestResult: result(),
    projection: projection(),
  })

  assert.equal(rendered.status, 'READY')
  assert.ok(rendered.bundle)
  assert.deepEqual(rendered.bundle.capabilities, INTERNAL_LESSON_RENDERING_CAPABILITIES)
  assert.equal(rendered.bundle.persistentEffect, 'NONE')
  assert.deepEqual(rendered.bundle.teacherBrief.preparation, ['Righello', 'Oggetto semplice da misurare'])
  assert.deepEqual(rendered.bundle.limView.screens.map((screen) => screen.kind), ['OPENING', 'STEP', 'STEP', 'CLOSING'])
  assert.equal(rendered.bundle.limView.screens.at(-1)?.body[0], 'Riprendere gli errori di misura nella lezione successiva.')
  assert.deepEqual(rendered.bundle.studentHandouts[0]?.prompts, ['Misura tre dimensioni.', 'Disegna uno schizzo quotato.'])
  assert.deepEqual(rendered.bundle.visualAid.items.map((item) => item.label), ['Avvio', 'Misura'])
  assert.deepEqual(rendered.bundle.provenance, manifest().provenance)
})

test('LP-3: una risorsa studente accettata viene resa solo se è già referenziata dal manifest e nello stesso scope', () => {
  const accepted = extension()
  const scopedManifest = manifest({
    acceptedExtensionRefs: ['student-extension'],
    materialSlots: [{
      role: 'STUDENT_HANDOUT',
      required: true,
      status: 'READY',
      resourceRefs: ['lesson-extension:student-extension'],
      titles: ['Scheda di confronto misure'],
      reason: 'Risorsa accettata.',
      provenance: [{ kind: 'ACCEPTED_LESSON_RESOURCE', ref: 'lesson-extension:student-extension' }],
    }],
  })

  const rendered = buildInternalLessonMaterialRenderBundle({
    manifestResult: result(scopedManifest),
    projection: projection({ resources: [] }),
    extensions: [
      accepted,
      extension({ id: 'wrong-workspace', workspaceId: 'workspace-other' }),
      extension({ id: 'proposed', status: 'PROPOSED', acceptedBy: null, acceptedAt: null }),
    ],
  })

  assert.equal(rendered.status, 'READY')
  assert.ok(rendered.bundle)
  assert.deepEqual(rendered.bundle.studentHandouts.map((item) => item.ref), ['lesson-extension:student-extension'])
  assert.equal(rendered.bundle.studentHandouts[0]?.instruction, 'Confronta le misure raccolte e annota le differenze.')
})

test('LP-3: una proposta non accettata resta fuori dalla resa e mantiene lo stato PARTIAL', () => {
  const partialManifest = manifest({
    readiness: 'REVIEW_REQUIRED',
    acceptedExtensionRefs: [],
    proposedExtensionRefs: ['proposed'],
    materialSlots: [{
      role: 'STUDENT_HANDOUT',
      required: true,
      status: 'PROPOSED',
      resourceRefs: ['lesson-extension:proposed'],
      titles: ['Scheda proposta'],
      reason: 'Richiede accettazione.',
      provenance: [{ kind: 'PROPOSED_LESSON_RESOURCE', ref: 'lesson-extension:proposed' }],
    }],
  })

  const rendered = buildInternalLessonMaterialRenderBundle({
    manifestResult: result(partialManifest),
    projection: projection({ resources: [] }),
    extensions: [extension({ id: 'proposed', status: 'PROPOSED', acceptedBy: null, acceptedAt: null })],
  })

  assert.equal(rendered.status, 'PARTIAL')
  assert.ok(rendered.bundle)
  assert.deepEqual(rendered.bundle.studentHandouts, [])
  assert.match(rendered.reasons.join(' '), /Da rivedere prima dell'uso/)
})

test('LP-3: un manifest bloccato non produce artefatti di resa', () => {
  const rendered = buildInternalLessonMaterialRenderBundle({
    manifestResult: { resolution: 'BLOCKED', manifest: null, reasons: ['LESSON_CONTEXT_UNRESOLVED'] },
    projection: null,
  })

  assert.equal(rendered.status, 'BLOCKED')
  assert.equal(rendered.bundle, null)
  assert.deepEqual(rendered.reasons, ['LESSON_CONTEXT_UNRESOLVED'])
})

test('LP-3: una proiezione diversa dal manifest fallisce chiusa', () => {
  const rendered = buildInternalLessonMaterialRenderBundle({
    manifestResult: result(),
    projection: projection({ projectionId: 'projection-other' }),
  })

  assert.equal(rendered.status, 'BLOCKED')
  assert.equal(rendered.bundle, null)
  assert.deepEqual(rendered.reasons, ['RENDER_PROJECTION_ID_MISMATCH'])
})
