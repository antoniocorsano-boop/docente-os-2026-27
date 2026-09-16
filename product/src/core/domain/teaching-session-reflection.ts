import { currentTeachingSessions, type TeachingSessionRecord, type TeachingSessionSnapshot } from './teaching-session'

export type TeachingSessionReflection = {
  activityDone: string
  observations: string
  difficulties: string
  ideas: string
  udaChangeProposal: string
  nextActivity: string
}

export type TeachingSessionContinuity = {
  nextActivity: string
  sourceSessionId: string
  sourceLocalDate: string
}

export type DriveDiaryProjection = {
  recordId: string
  localDate: string
  startTime: string | null
  classLabel: string
  disciplineLabel: string
  actualMinutes: number
  udaLabel: string | null
  udaPhase: string | null
  plannedActivity: string
  reflection: TeachingSessionReflection
  materialHref: string | null
  assessmentLabel: string | null
  curriculumLink: string | null
  status: 'COMPILATA'
}

const FIELD_LIMIT = 450
const EVIDENCE_CONTRACT_V1 = 'DOCENTE_OS_LESSON_REPORT_V1'
const EVIDENCE_CONTRACT_V2 = 'DOCENTE_OS_LESSON_REPORT_V2'

type TeachingSessionEvidenceContract = typeof EVIDENCE_CONTRACT_V1 | typeof EVIDENCE_CONTRACT_V2

export function normalizeTeachingSessionReflection(input: Partial<TeachingSessionReflection>): TeachingSessionReflection {
  return {
    activityDone: clean(input.activityDone),
    observations: clean(input.observations),
    difficulties: clean(input.difficulties),
    ideas: clean(input.ideas),
    udaChangeProposal: clean(input.udaChangeProposal),
    nextActivity: clean(input.nextActivity),
  }
}

export function buildDriveDiaryRecordId(input: { localDate: string; classLabel: string; plannedStartAt: string | null }) {
  const time = input.plannedStartAt?.match(/T(\d{2}):(\d{2})/)?.slice(1).join('') ?? '0000'
  return `${input.localDate}_${normalizeClassLabel(input.classLabel)}_${time}`
}

export function buildTeachingSessionEvidenceNote(input: {
  reflection: TeachingSessionReflection
  materialAssetId?: string | null
  driveRecordId?: string | null
}) {
  const payload = {
    contract: EVIDENCE_CONTRACT_V2,
    ...(input.materialAssetId ? { materialAssetId: input.materialAssetId } : {}),
    ...(input.driveRecordId ? { driveRecordId: input.driveRecordId } : {}),
    ...normalizeTeachingSessionReflection(input.reflection),
  }
  const note = `${EVIDENCE_CONTRACT_V2}\n${JSON.stringify(payload)}`
  if (note.length > 4000) throw new Error('Teaching session reflection exceeds evidence-note capacity')
  return note
}

export function parseTeachingSessionEvidenceNote(note: string | null) {
  const contract = evidenceContract(note)
  if (!note || !contract) return null

  try {
    const raw = JSON.parse(note.slice(contract.length + 1)) as Record<string, unknown>
    if (raw.contract !== contract) return null

    const materialAssetId = optionalString(raw.materialAssetId)
    const driveRecordId = optionalString(raw.driveRecordId)
    if (contract === EVIDENCE_CONTRACT_V1 && (!materialAssetId || !driveRecordId)) return null

    return {
      contract,
      materialAssetId,
      driveRecordId,
      reflection: normalizeTeachingSessionReflection({
        activityDone: asString(raw.activityDone),
        observations: asString(raw.observations),
        difficulties: asString(raw.difficulties),
        ideas: asString(raw.ideas),
        udaChangeProposal: asString(raw.udaChangeProposal),
        nextActivity: asString(raw.nextActivity),
      }),
    }
  } catch {
    return null
  }
}

export function selectLatestTeachingSessionContinuity(input: {
  snapshot: TeachingSessionSnapshot
  sectionId: string
  lessonStartAt: string
}): TeachingSessionContinuity | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.lessonStartAt)) return null

  const candidates = currentTeachingSessions(input.snapshot)
    .filter((session) => session.sectionId === input.sectionId)
    .filter((session) => sessionPrecedesLesson(session, input.lessonStartAt))
    .map((session) => ({ session, parsed: parseTeachingSessionEvidenceNote(session.evidenceNote) }))
    .filter((candidate) => (
      candidate.parsed?.contract === EVIDENCE_CONTRACT_V2
      && Boolean(candidate.parsed.reflection.nextActivity)
    ))
    .sort((left, right) => {
      const temporal = sessionRecencyKey(right.session).localeCompare(sessionRecencyKey(left.session))
      return temporal || right.session.recordedAt.localeCompare(left.session.recordedAt)
    })

  const selected = candidates[0]
  if (!selected?.parsed) return null

  return {
    nextActivity: selected.parsed.reflection.nextActivity,
    sourceSessionId: selected.session.id,
    sourceLocalDate: selected.session.localDate,
  }
}

export function buildDriveDiaryProjection(input: Omit<DriveDiaryProjection, 'recordId' | 'status'> & { plannedStartAt: string | null }) : DriveDiaryProjection {
  return {
    recordId: buildDriveDiaryRecordId({
      localDate: input.localDate,
      classLabel: input.classLabel,
      plannedStartAt: input.plannedStartAt,
    }),
    localDate: input.localDate,
    startTime: input.plannedStartAt?.match(/T(\d{2}:\d{2})/)?.[1] ?? null,
    classLabel: normalizeClassLabel(input.classLabel),
    disciplineLabel: input.disciplineLabel,
    actualMinutes: input.actualMinutes,
    udaLabel: input.udaLabel,
    udaPhase: input.udaPhase,
    plannedActivity: input.plannedActivity,
    reflection: normalizeTeachingSessionReflection(input.reflection),
    materialHref: input.materialHref,
    assessmentLabel: input.assessmentLabel,
    curriculumLink: input.curriculumLink,
    status: 'COMPILATA',
  }
}

function evidenceContract(note: string | null): TeachingSessionEvidenceContract | null {
  if (note?.startsWith(`${EVIDENCE_CONTRACT_V2}\n`)) return EVIDENCE_CONTRACT_V2
  if (note?.startsWith(`${EVIDENCE_CONTRACT_V1}\n`)) return EVIDENCE_CONTRACT_V1
  return null
}

function sessionPrecedesLesson(session: TeachingSessionRecord, lessonStartAt: string) {
  const lessonDate = lessonStartAt.slice(0, 10)
  if (session.localDate < lessonDate) return true
  if (session.localDate > lessonDate) return false

  const sessionBoundary = session.plannedEndAt ?? session.plannedStartAt
  return Boolean(sessionBoundary && sessionBoundary <= lessonStartAt)
}

function sessionRecencyKey(session: TeachingSessionRecord) {
  return session.plannedEndAt ?? session.plannedStartAt ?? `${session.localDate}T23:59:59`
}

function clean(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, FIELD_LIMIT)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeClassLabel(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}
