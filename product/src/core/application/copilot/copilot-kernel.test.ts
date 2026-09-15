import assert from 'node:assert/strict'
import test from 'node:test'
import './knowledge-retrieval.test'
import './semantic-retrieval.test'
import { assembleNextLessonPreparationCopilotContext } from './copilot-context-assembler'
import {
  handleNextLessonPreparation,
  matchesNextLessonPreparationIntent,
} from './next-lesson-preparation-handler'
import {
  discoverCopilotSkills,
  modelVisibleCopilotSkills,
  resourceDescriptor,
  type CopilotResourceDescriptor,
} from './copilot-kernel'
import type { LessonPreparationManifestResult } from '@/core/presentation/lesson-preparation-manifest'
import type {
  NextLessonPreparation,
  TodayCopilotK2Context,
} from '@/core/presentation/next-lesson-preparation'

const scope = { workspaceId: 'workspace-1', academicYearId: 'ay-1', localDate: '2026-09-15' }

function available(kind: CopilotResourceDescriptor['kind']): CopilotResourceDescriptor {
  return resourceDescriptor({
    id: `resource:${kind}`,
    kind,
    state: 'AVAILABLE',
    authority: 'AUTHORITATIVE',
    scope,
  })
}

test('TODAY espone prima il quadro della giornata quando HomeDailyContext è disponibile', () => {
  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT'), available('PLANNER_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'PLANNER_READ'],
  })

  assert.equal(result[0]?.skill.id, 'TODAY_OVERVIEW')
  assert.equal(result[0]?.readiness, 'READY')

  const planner = result.find((candidate) => candidate.skill.id === 'PLANNER_PRIORITIZE')
  assert.equal(planner?.readiness, 'READY')
})

test('NEXT_LESSON_PREPARATION resta bloccata se manca il Lesson Brief', () => {
  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'LESSON_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'NEXT_LESSON_PREPARATION')
  assert.equal(candidate?.readiness, 'BLOCKED')
  assert.deepEqual(candidate?.missingResources, ['LESSON_BRIEF'])
})

test('una risorsa temporale ambigua blocca skill che non possono inferire la giornata', () => {
  const ambiguous = resourceDescriptor({
    id: 'resource:today',
    kind: 'HOME_DAILY_CONTEXT',
    state: 'AMBIGUOUS',
    authority: 'TO_VERIFY',
    scope,
  })

  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [ambiguous],
    availableCapabilities: ['TODAY_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'TODAY_OVERVIEW')
  assert.equal(candidate?.readiness, 'BLOCKED')
  assert.deepEqual(candidate?.ambiguousResources, ['HOME_DAILY_CONTEXT'])
})

test('progressive discovery non espone skill di superfici non pertinenti', () => {
  const result = discoverCopilotSkills({
    surface: 'TIMETABLE',
    resources: [available('HOME_DAILY_CONTEXT'), available('KNOWLEDGE_INDEX')],
    availableCapabilities: ['TODAY_READ', 'KNOWLEDGE_READ', 'KNOWLEDGE_SEARCH'],
  })

  assert.equal(result.some((candidate) => candidate.skill.id === 'TODAY_OVERVIEW'), false)
  assert.equal(result.some((candidate) => candidate.skill.id === 'KNOWLEDGE_EXPLAIN'), false)
})

test('modelVisibleCopilotSkills esclude skill bloccate da capability o contesto', () => {
  const result = modelVisibleCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT'), available('PLANNER_CONTEXT')],
    availableCapabilities: ['TODAY_READ'],
  })

  assert.equal(result.some((candidate) => candidate.skill.id === 'TODAY_OVERVIEW'), true)
  assert.equal(result.some((candidate) => candidate.skill.id === 'PLANNER_PRIORITIZE'), false)
  assert.equal(result.every((candidate) => candidate.readiness !== 'BLOCKED'), true)
})

test('skill con policy PARTIAL può restare visibile dichiarando il contesto mancante', () => {
  const result = modelVisibleCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'TEACHING_SESSION_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'PENDING_LESSON_REGISTRATION')
  assert.equal(candidate?.readiness, 'PARTIAL')
  assert.deepEqual(candidate?.missingResources, ['TEACHING_SESSION_HISTORY'])
})

test('LP-2 riconosce solo una richiesta esplicita di preparazione della prossima lezione', () => {
  assert.equal(matchesNextLessonPreparationIntent('Preparami i materiali per la prossima lezione'), true)
  assert.equal(matchesNextLessonPreparationIntent('Cosa serve per la lezione di domani?'), true)
  assert.equal(matchesNextLessonPreparationIntent('Qual è la prossima lezione?'), false)
  assert.equal(matchesNextLessonPreparationIntent('Crea un’attività nel planner'), false)
})

test('LP-2 ContextAssembler espone al kernel solo risorse autorevoli e resta NO_MODEL', () => {
  const today = todayContext()
  const manifest = readyManifest()
  const result = assembleNextLessonPreparationCopilotContext({
    runId: 'run-1',
    today,
    manifest,
  })

  assert.equal(result.run.surface, 'TODAY')
  assert.equal(result.identity.workspaceId, 'workspace-1')
  assert.equal(result.privacy.providerPolicy, 'NO_MODEL')
  assert.equal(result.resources.find((item) => item.kind === 'HOME_DAILY_CONTEXT')?.state, 'AVAILABLE')
  assert.equal(result.resources.find((item) => item.kind === 'LESSON_BRIEF')?.state, 'AVAILABLE')
  assert.equal(result.resources.find((item) => item.kind === 'ANNUAL_PLAN_CONTEXT')?.state, 'AVAILABLE')
  assert.equal(result.focus?.id, 'lesson-2c')
})

test('LP-2 handler restituisce una proposta supportata senza effetti persistenti quando il manifest è READY', () => {
  const today = todayContext()
  const manifest = readyManifest()
  const context = assembleNextLessonPreparationCopilotContext({ runId: 'run-2', today, manifest })
  const result = handleNextLessonPreparation({
    context,
    preparation: today.nextLessonPreparation,
    manifest,
  })

  assert.equal(result.status, 'SUPPORTED')
  assert.equal(result.readiness, 'READY')
  assert.equal(result.actionKind, 'PROPOSE')
  assert.equal(result.persistentEffect, 'NONE')
  assert.equal(result.confirmationRequiredForPersistence, true)
  assert.equal(result.ready.some((item) => item.includes('Scheda studente')), true)
  assert.equal(result.missing.length, 0)
})

test('LP-2 handler fallisce chiuso quando il Lesson Brief non è disponibile', () => {
  const today = todayContext({
    canonicalLesson: null,
    availableCapabilities: ['TODAY_READ'],
  })
  const blockedManifest: LessonPreparationManifestResult = {
    resolution: 'BLOCKED',
    manifest: null,
    reasons: ['LESSON_CONTEXT_UNRESOLVED'],
  }
  const context = assembleNextLessonPreparationCopilotContext({
    runId: 'run-3',
    today,
    manifest: blockedManifest,
  })
  const result = handleNextLessonPreparation({
    context,
    preparation: today.nextLessonPreparation,
    manifest: blockedManifest,
  })

  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.readiness, null)
  assert.equal(result.persistentEffect, 'NONE')
  assert.equal(result.missing.length > 0, true)
})

function todayContext(overrides: {
  canonicalLesson?: NextLessonPreparation['canonicalLesson']
  availableCapabilities?: string[]
} = {}): TodayCopilotK2Context {
  const preparation = nextPreparation(overrides.canonicalLesson === undefined
    ? canonicalLesson()
    : overrides.canonicalLesson)
  return {
    surface: 'TODAY',
    workspaceId: 'workspace-1',
    academicYearId: 'ay-1',
    object: { type: 'TEACHER_DAY', id: '2026-09-15', title: 'Giornata del 2026-09-15', state: 'IN_FORCE' },
    provenance: [
      { kind: 'TIMETABLE_IN_FORCE', ref: 'today:2026-09-15', label: 'Orario in vigore' },
      { kind: 'CANONICAL_PLAN', ref: 'plan:B03', label: 'Piano annuale' },
      { kind: 'KNOWLEDGE_ASSET', ref: 'knowledge:asset-1', label: 'Scheda studente' },
    ],
    availableCapabilities: overrides.availableCapabilities ?? ['TODAY_READ', 'LESSON_READ', 'KNOWLEDGE_READ', 'NEXT_LESSON_PREPARATION'],
    forbiddenCapabilities: ['LESSON_RECORD_EXECUTION', 'DRIVE_WRITE'],
    missingInformation: [],
    today: {
      localDate: '2026-09-15',
      authority: 'IN_FORCE',
      calendarState: 'SCHOOL_DAY',
      calendarLabel: null,
      timetableState: 'IN_FORCE',
      lessons: [],
      lessonCount: 1,
      pendingRegistrationCount: 0,
      primary: null,
    },
    planner: {
      localDate: '2026-09-15',
      activeCount: 0,
      openCount: 0,
      waitingCount: 0,
      overdueCount: 0,
      todayCount: 0,
      urgentCount: 0,
      highCount: 0,
      undatedCount: 0,
      tasks: [],
    },
    nextLessonPreparation: preparation,
  }
}

function nextPreparation(canonical: NextLessonPreparation['canonicalLesson']): NextLessonPreparation {
  return {
    lesson: {
      logicalId: 'lesson-2c',
      startAt: '2026-09-15T15:00:00',
      endAt: '2026-09-15T16:00:00',
      title: '2C · Tecnologia',
      sectionId: 'section-2c',
      disciplineId: 'technology',
      authority: 'IN_FORCE',
    },
    canonicalLesson: canonical,
    knowledgeResources: [{
      assetId: 'asset-1',
      title: 'Scheda sulle misure',
      categoryLabel: 'Materiale',
      relevanceLabel: 'Fase corrente',
    }],
    missingInformation: [],
    provenance: [
      { kind: 'TIMETABLE_IN_FORCE', ref: 'timetable:slot-1', label: '2C · Tecnologia' },
      { kind: 'CANONICAL_PLAN', ref: 'plan:B03', label: 'Piano annuale' },
    ],
  }
}

function canonicalLesson(): NonNullable<NextLessonPreparation['canonicalLesson']> {
  return {
    sectionLabel: '2ª C',
    blockId: 'B03',
    title: 'Misurare con precisione',
    objective: 'Misurare e rappresentare un oggetto.',
    durationMinutes: 60,
    udaTitle: 'Misurare e rappresentare',
    progressStatus: 'PIANIFICATO',
    preparationPreview: ['Righelli'],
    remainingPreparationCount: 0,
    readyTitles: ['Scheda studente'],
    readyCount: 1,
    statusLabel: 'ENRICHED',
  }
}

function readyManifest(): LessonPreparationManifestResult {
  return {
    resolution: 'SUPPORTED',
    reasons: [],
    manifest: {
      lessonRef: 'lesson-2c',
      workspaceId: 'workspace-1',
      academicYearId: 'ay-1',
      sectionId: 'section-2c',
      disciplineId: 'technology',
      temporalAuthority: 'IN_FORCE',
      blockId: 'B03',
      projectionId: 'projection-3',
      udaRef: '2-03',
      packRef: 'CAN-PACK-2C',
      objective: 'Misurare e rappresentare un oggetto.',
      sequence: [{
        id: 'S01',
        origin: 'CANONICAL',
        extensionId: null,
        kind: null,
        minutes: 60,
        title: 'Misura',
        instruction: 'Misura e rappresenta.',
        cue: null,
        sourceKind: null,
        sourceLabel: null,
        sourceRef: null,
      }],
      sequenceRefs: ['S01'],
      materialSlots: [{
        role: 'STUDENT_HANDOUT',
        required: true,
        status: 'READY',
        resourceRefs: ['projection:projection-3:resource:sheet'],
        titles: ['Scheda studente'],
        reason: 'Risorsa necessaria già disponibile.',
        provenance: [{ kind: 'CANONICAL_LESSON_RESOURCE', ref: 'projection:projection-3:resource:sheet', label: 'Scheda studente' }],
      }],
      supportingMaterials: [],
      acceptedExtensionRefs: [],
      proposedExtensionRefs: [],
      ignoredAcceptedExtensionRefs: [],
      readiness: 'READY',
      missingInformation: [],
      provenance: [{ kind: 'CANONICAL_PLAN', ref: 'plan:B03', label: 'Piano annuale' }],
      renderingCapabilities: [],
    },
  }
}
