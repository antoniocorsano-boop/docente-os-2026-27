import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveUniqueDraftSlot } from '@/core/application/lesson-register-timing'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import {
  completionProposal,
  validateTeachingSessionAllocations,
  type TeachingSessionDraft,
} from './teaching-session'
import {
  buildDriveDiaryProjection,
  buildDriveDiaryRecordId,
  buildTeachingSessionEvidenceNote,
  parseTeachingSessionEvidenceNote,
} from './teaching-session-reflection'

const occurrence: ProjectedOccurrence = {
  logicalId: 'tt:version-1:slot-1:2026-09-07',
  localDate: '2026-09-07',
  startAt: '2026-09-07T08:00:00',
  endAt: '2026-09-07T09:00:00',
  kind: 'LESSON',
  title: '1ª A · Tecnologia',
  sectionId: 'section-1a',
  disciplineId: 'technology',
  timetableVersionId: 'version-1',
  timetableSlotId: 'slot-1',
  calendarEventId: null,
  calendarState: 'SCHOOL_DAY',
  exceptionState: 'NONE',
  provenance: ['timetable_version:version-1', 'timetable_slot:slot-1', 'calendar_day:2026-09-07'],
}

function session(actualMinutes = 55): TeachingSessionDraft {
  return {
    ...teachingSessionCandidateFromOccurrence(occurrence),
    actualMinutes,
    evidenceNote: null,
  }
}

const context = {
  sectionId: 'section-1a',
  canonicalPlanAssetId: 'plan-asset',
  canonicalGenerationId: 'plan-generation',
}

test('a projected lesson becomes only a candidate and preserves source snapshot', () => {
  const candidate = teachingSessionCandidateFromOccurrence(occurrence)
  assert.equal(candidate.sectionId, 'section-1a')
  assert.equal(candidate.plannedMinutes, 60)
  assert.equal(candidate.source.sourceKind, 'PROJECTED_OCCURRENCE')
  assert.equal(candidate.source.projectedOccurrenceLogicalId, occurrence.logicalId)
  assert.deepEqual(candidate.source.provenance, occurrence.provenance)
  assert.notEqual(candidate.source.provenance, occurrence.provenance)
})

test('calendar events and non-teaching timetable occurrences cannot become automatic teaching candidates', () => {
  assert.throws(() => teachingSessionCandidateFromOccurrence({ ...occurrence, kind: 'CALENDAR_EVENT', sectionId: null }))
  assert.throws(() => teachingSessionCandidateFromOccurrence({ ...occurrence, kind: 'DISPOSITION' }))
})

test('allocated minutes may be split across blocks but cannot exceed actual session minutes', () => {
  const valid = validateTeachingSessionAllocations({
    session: session(55),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B02', minutes: 25, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(valid.valid, true)
  assert.equal(valid.allocatedMinutes, 55)
  assert.equal(valid.unallocatedMinutes, 0)

  const invalid = validateTeachingSessionAllocations({
    session: session(55),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B02', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(invalid.valid, false)
  assert.ok(invalid.codes.includes('ALLOCATION_EXCEEDS_SESSION'))
})

test('duplicate allocation to the same canonical block is rejected to prevent double counting', () => {
  const result = validateTeachingSessionAllocations({
    session: session(60),
    context,
    allocations: [
      { blockId: 'B01', minutes: 20, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B01', minutes: 20, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('DUPLICATE_BLOCK_ALLOCATION'))
})

test('allocation must remain pinned to the reviewed canonical plan generation', () => {
  const result = validateTeachingSessionAllocations({
    session: session(),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'another-plan', canonicalGenerationId: 'another-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('CANONICAL_CONTEXT_MISMATCH'))
})

test('only B01-B33 are accepted as canonical block identities', () => {
  const result = validateTeachingSessionAllocations({
    session: session(),
    context,
    allocations: [
      { blockId: 'B34', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('INVALID_BLOCK_ID'))
})

test('quantitative threshold may suggest completion but can never auto-complete a block', () => {
  assert.deepEqual(completionProposal({ allocatedMinutes: 120, plannedBlockMinutes: 120 }), {
    quantitativeThresholdReached: true,
    maySuggestCompletion: true,
    mayAutoComplete: false,
    requiresHumanDecision: true,
  })

  assert.equal(completionProposal({ allocatedMinutes: 90, plannedBlockMinutes: 120 }).maySuggestCompletion, false)
})

test('Drive diary identity is deterministic and matches the established register convention', () => {
  assert.equal(buildDriveDiaryRecordId({
    localDate: '2026-09-11',
    classLabel: '2A',
    plannedStartAt: '2026-09-11T08:00:00',
  }), '2026-09-11_2A_0800')
})

test('post-lesson reflection round-trips inside immutable teaching evidence', () => {
  const reflection = {
    activityDone: 'Misurazione e rappresentazione di un oggetto tecnico.',
    observations: 'La classe ha individuato correttamente le misure principali.',
    difficulties: 'Alcuni passaggi grafici richiedono ripresa.',
    ideas: 'Usare un secondo oggetto per il confronto.',
    udaChangeProposal: 'Proporre più tempo alla fase grafica.',
    nextActivity: 'Riprendere la rappresentazione e confrontare due soluzioni.',
  }
  const note = buildTeachingSessionEvidenceNote({
    reflection,
    materialAssetId: 'asset-canva-2a',
    driveRecordId: '2026-09-11_2A_0800',
  })
  const parsed = parseTeachingSessionEvidenceNote(note)

  assert.equal(parsed?.materialAssetId, 'asset-canva-2a')
  assert.equal(parsed?.driveRecordId, '2026-09-11_2A_0800')
  assert.deepEqual(parsed?.reflection, reflection)
})

test('Drive projection marks the diary complete without turning an UDA proposal into an automatic mutation', () => {
  const reflection = {
    activityDone: 'Attività svolta',
    observations: 'Osservazione di classe',
    difficulties: '',
    ideas: 'Idea emersa',
    udaChangeProposal: 'Proposta da valutare',
    nextActivity: 'Prossimo passo',
  }
  const projection = buildDriveDiaryProjection({
    localDate: '2026-09-11',
    plannedStartAt: '2026-09-11T08:00:00',
    startTime: null,
    classLabel: '2A',
    disciplineLabel: 'Tecnologia',
    actualMinutes: 60,
    udaLabel: 'UDA di avvio',
    udaPhase: 'Ingresso diagnostico',
    plannedActivity: 'Attività prevista',
    reflection,
    materialHref: null,
    assessmentLabel: 'Diagnostica, senza voto',
    curriculumLink: null,
  })

  assert.equal(projection.recordId, '2026-09-11_2A_0800')
  assert.equal(projection.status, 'COMPILATA')
  assert.equal(projection.reflection.udaChangeProposal, 'Proposta da valutare')
  assert.equal('studentName' in projection, false)
})

test('a unique draft timetable slot may supply documentary time without becoming canonical', () => {
  const versions = [{ id: 'draft-1', status: 'DRAFT' as const, effectiveFrom: '2026-09-11', effectiveTo: null }]
  const slots = [{
    id: 'slot-2a',
    timetableVersionId: 'draft-1',
    weekday: 5,
    startTime: '08:00',
    endTime: '09:00',
    kind: 'LESSON' as const,
    sectionId: 'section-2a',
    sectionLabel: '2ª A',
    disciplineId: 'technology',
    disciplineLabel: 'Tecnologia',
    manualClassLabel: null,
    room: null,
  }]

  const result = resolveUniqueDraftSlot({
    localDate: '2026-09-11',
    sectionId: 'section-2a',
    versions,
    slots,
  })

  assert.equal(result?.version.status, 'DRAFT')
  assert.equal(result?.slot.startTime, '08:00')
})

test('draft timetable fallback refuses to guess when more than one class period matches', () => {
  const versions = [{ id: 'draft-1', status: 'DRAFT' as const, effectiveFrom: '2026-09-11', effectiveTo: null }]
  const baseSlot = {
    timetableVersionId: 'draft-1',
    weekday: 5,
    kind: 'LESSON' as const,
    sectionId: 'section-2a',
    sectionLabel: '2ª A',
    disciplineId: 'technology',
    disciplineLabel: 'Tecnologia',
    manualClassLabel: null,
    room: null,
  }
  const slots = [
    { ...baseSlot, id: 'slot-a', startTime: '08:00', endTime: '09:00' },
    { ...baseSlot, id: 'slot-b', startTime: '12:00', endTime: '13:00' },
  ]

  const result = resolveUniqueDraftSlot({
    localDate: '2026-09-11',
    sectionId: 'section-2a',
    versions,
    slots,
  })

  assert.equal(result, null)
})
