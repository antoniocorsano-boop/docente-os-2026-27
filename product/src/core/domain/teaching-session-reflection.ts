export type TeachingSessionReflection = {
  activityDone: string
  observations: string
  difficulties: string
  ideas: string
  udaChangeProposal: string
  nextActivity: string
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
const EVIDENCE_CONTRACT = 'DOCENTE_OS_LESSON_REPORT_V1'

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
  materialAssetId: string
  driveRecordId: string
}) {
  const payload = {
    contract: EVIDENCE_CONTRACT,
    materialAssetId: input.materialAssetId,
    driveRecordId: input.driveRecordId,
    ...normalizeTeachingSessionReflection(input.reflection),
  }
  const note = `${EVIDENCE_CONTRACT}\n${JSON.stringify(payload)}`
  if (note.length > 4000) throw new Error('Teaching session reflection exceeds evidence-note capacity')
  return note
}

export function parseTeachingSessionEvidenceNote(note: string | null) {
  if (!note?.startsWith(`${EVIDENCE_CONTRACT}\n`)) return null
  try {
    const raw = JSON.parse(note.slice(EVIDENCE_CONTRACT.length + 1)) as Record<string, unknown>
    if (raw.contract !== EVIDENCE_CONTRACT) return null
    const materialAssetId = typeof raw.materialAssetId === 'string' ? raw.materialAssetId : null
    const driveRecordId = typeof raw.driveRecordId === 'string' ? raw.driveRecordId : null
    if (!materialAssetId || !driveRecordId) return null
    return {
      contract: EVIDENCE_CONTRACT,
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

function clean(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, FIELD_LIMIT)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeClassLabel(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}
