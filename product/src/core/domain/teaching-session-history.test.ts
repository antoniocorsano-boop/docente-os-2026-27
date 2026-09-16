import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTeachingSessionEvidenceNote,
  parseTeachingSessionEvidenceNote,
  selectLatestTeachingSessionContinuity,
} from './teaching-session-reflection'
import {
  allocatedMinutesByBlock,
  currentTeachingSessions,
  type TeachingSessionRecord,
  type TeachingSessionSnapshot,
} from './teaching-session'

function session(id: string, supersedesSessionId: string | null, actualMinutes: number) {
  return {
    id,
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId: 'section',
    disciplineId: null,
    localDate: '2026-09-07',
    plannedStartAt: null,
    plannedEndAt: null,
    plannedMinutes: null,
    actualMinutes,
    evidenceNote: null,
    source: {
      sourceKind: 'MANUAL' as const,
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: null,
      provenance: [],
    },
    supersedesSessionId,
    recordedBy: 'user',
    recordedAt: '2026-09-07T12:00:00Z',
  }
}

function continuitySession(input: {
  id: string
  localDate: string
  evidenceNote: string | null
  sectionId?: string
  startAt?: string | null
  endAt?: string | null
  supersedesSessionId?: string | null
  recordedAt?: string
}): TeachingSessionRecord {
  return {
    id: input.id,
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId: input.sectionId ?? 'section-2c',
    disciplineId: 'technology',
    localDate: input.localDate,
    plannedStartAt: input.startAt === undefined ? `${input.localDate}T08:00:00` : input.startAt,
    plannedEndAt: input.endAt === undefined ? `${input.localDate}T09:00:00` : input.endAt,
    plannedMinutes: 60,
    actualMinutes: 60,
    evidenceNote: input.evidenceNote,
    source: {
      sourceKind: 'MANUAL',
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: null,
      provenance: [],
    },
    supersedesSessionId: input.supersedesSessionId ?? null,
    recordedBy: 'user',
    recordedAt: input.recordedAt ?? `${input.localDate}T12:00:00Z`,
  }
}

function v2Note(nextActivity: string) {
  return buildTeachingSessionEvidenceNote({
    reflection: {
      activityDone: 'Attività svolta',
      observations: '',
      difficulties: '',
      ideas: '',
      udaChangeProposal: '',
      nextActivity,
    },
  })
}

function v1Note(nextActivity: string) {
  const contract = 'DOCENTE_OS_LESSON_REPORT_V1'
  return `${contract}\n${JSON.stringify({
    contract,
    materialAssetId: 'asset-legacy',
    driveRecordId: 'drive-legacy',
    activityDone: 'Attività storica',
    observations: '',
    difficulties: '',
    ideas: '',
    udaChangeProposal: '',
    nextActivity,
  })}`
}

test('superseded sessions remain in history but stop contributing to current minute totals', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [session('old', null, 60), session('new', 'old', 50)],
    allocations: [
      { id: 'a-old', sessionId: 'old', blockId: 'B01', minutes: 60, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen', createdAt: '2026-09-07T12:00:00Z' },
      { id: 'a-new', sessionId: 'new', blockId: 'B01', minutes: 50, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen', createdAt: '2026-09-07T12:10:00Z' },
    ],
  }

  assert.deepEqual(currentTeachingSessions(snapshot).map((item) => item.id), ['new'])
  assert.equal(allocatedMinutesByBlock(snapshot, 'gen').get('B01'), 50)
})

test('allocations from another canonical generation never leak into current totals', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [session('s1', null, 60)],
    allocations: [
      { id: 'a1', sessionId: 's1', blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen-current', createdAt: '2026-09-07T12:00:00Z' },
      { id: 'a2', sessionId: 's1', blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-old', canonicalGenerationId: 'gen-old', createdAt: '2026-09-07T12:00:00Z' },
    ],
  }

  assert.equal(allocatedMinutesByBlock(snapshot, 'gen-current').get('B01'), 30)
})

test('lesson report V2 preserves next activity without material or Drive identifiers', () => {
  const note = buildTeachingSessionEvidenceNote({
    reflection: {
      activityDone: 'Prospettiva centrale',
      observations: 'Impostazione compresa dalla maggior parte della classe.',
      difficulties: '',
      ideas: '',
      udaChangeProposal: '',
      nextActivity: 'Riprendere la prospettiva centrale e completare l’esercizio 2.',
    },
  })

  assert.match(note, /^DOCENTE_OS_LESSON_REPORT_V2\n/)
  const parsed = parseTeachingSessionEvidenceNote(note)
  assert.equal(parsed?.contract, 'DOCENTE_OS_LESSON_REPORT_V2')
  assert.equal(parsed?.materialAssetId, null)
  assert.equal(parsed?.driveRecordId, null)
  assert.equal(parsed?.reflection.nextActivity, 'Riprendere la prospettiva centrale e completare l’esercizio 2.')
  assert.equal(parsed?.reflection.activityDone, 'Prospettiva centrale')
})

test('historical lesson report V1 remains readable with its material and Drive identifiers', () => {
  const contract = 'DOCENTE_OS_LESSON_REPORT_V1'
  const note = `${contract}\n${JSON.stringify({
    contract,
    materialAssetId: 'asset-legacy',
    driveRecordId: 'drive-legacy',
    activityDone: 'Osservazione di un oggetto tecnico',
    observations: 'Consegna completata.',
    difficulties: '',
    ideas: '',
    udaChangeProposal: '',
    nextActivity: 'Confrontare materiali e funzioni.',
  })}`

  const parsed = parseTeachingSessionEvidenceNote(note)
  assert.equal(parsed?.contract, contract)
  assert.equal(parsed?.materialAssetId, 'asset-legacy')
  assert.equal(parsed?.driveRecordId, 'drive-legacy')
  assert.equal(parsed?.reflection.nextActivity, 'Confrontare materiali e funzioni.')
})

test('MDS-2B selects the latest current V2 next activity from the same class only', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [
      continuitySession({ id: 'older', localDate: '2026-09-10', evidenceNote: v2Note('Attività più vecchia') }),
      continuitySession({ id: 'replaced', localDate: '2026-09-12', evidenceNote: v2Note('Non deve sopravvivere') }),
      continuitySession({ id: 'current', localDate: '2026-09-12', evidenceNote: v2Note('Riprendere il disegno quotato.'), supersedesSessionId: 'replaced', recordedAt: '2026-09-12T12:10:00Z' }),
      continuitySession({ id: 'other-class', localDate: '2026-09-14', sectionId: 'section-1a', evidenceNote: v2Note('Non deve filtrare tra classi') }),
      continuitySession({ id: 'legacy-newer', localDate: '2026-09-14', evidenceNote: v1Note('Non promuovere V1 a continuità') }),
      continuitySession({ id: 'invalid-newer', localDate: '2026-09-15', evidenceNote: 'DOCENTE_OS_LESSON_REPORT_V2\n{invalid-json' }),
    ],
    allocations: [],
  }

  assert.deepEqual(selectLatestTeachingSessionContinuity({
    snapshot,
    sectionId: 'section-2c',
    lessonStartAt: '2026-09-16T10:00:00',
  }), {
    nextActivity: 'Riprendere il disegno quotato.',
    sourceSessionId: 'current',
    sourceLocalDate: '2026-09-12',
  })
})

test('MDS-2B respects the same-day lesson boundary and never reads a later session', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [
      continuitySession({
        id: 'before',
        localDate: '2026-09-16',
        startAt: '2026-09-16T08:00:00',
        endAt: '2026-09-16T09:00:00',
        evidenceNote: v2Note('Consolidare la vista precedente.'),
      }),
      continuitySession({
        id: 'after',
        localDate: '2026-09-16',
        startAt: '2026-09-16T11:00:00',
        endAt: '2026-09-16T12:00:00',
        evidenceNote: v2Note('Informazione futura non valida.'),
      }),
      continuitySession({
        id: 'ambiguous-time',
        localDate: '2026-09-16',
        startAt: null,
        endAt: null,
        evidenceNote: v2Note('Senza collocazione temporale non va dedotta.'),
      }),
    ],
    allocations: [],
  }

  assert.equal(selectLatestTeachingSessionContinuity({
    snapshot,
    sectionId: 'section-2c',
    lessonStartAt: '2026-09-16T10:00:00',
  })?.sourceSessionId, 'before')
})

test('MDS-2B remains absent when no valid V2 next activity exists', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [
      continuitySession({ id: 'legacy', localDate: '2026-09-15', evidenceNote: v1Note('Solo storico') }),
      continuitySession({ id: 'empty', localDate: '2026-09-14', evidenceNote: v2Note('') }),
    ],
    allocations: [],
  }

  assert.equal(selectLatestTeachingSessionContinuity({
    snapshot,
    sectionId: 'section-2c',
    lessonStartAt: '2026-09-16T10:00:00',
  }), null)
})
