import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  HVA_BASELINE_ID,
  HVA_CALENDAR_SOURCE_REF,
  HVA_CANONICAL_NOW,
  HVA_EFFECTIVE_FROM,
  HVA_LOCAL_DATE,
  HVA_MINUTE_OF_DAY,
  HVA_WEEKDAY,
} = require('./hva-governed-baseline-config.cjs')

const HVA_CLASS_LABEL = '2A'
const HVA_DISCIPLINE_NAME = 'Tecnologia'
const HVA_ASSIGNMENT_MARKER = 'HVA · Oggi · Cattedra canonica'
const HVA_WEEKLY_MINUTES = 120
const HVA_PRIOR_START = '07:00'
const HVA_PRIOR_END = '08:00'
const HVA_CURRENT_START = '08:00'
const HVA_CURRENT_END = '09:00'
const HVA_CALENDAR_START = '10:30'
const HVA_CALENDAR_END = '11:00'
const HVA_CALENDAR_KIND = 'MEETING'

export const HVA_EXPECTED_BASELINE_SNAPSHOT = deepFreeze({
  baseline: HVA_BASELINE_ID,
  canonicalNow: HVA_CANONICAL_NOW,
  timetable: {
    effectiveFrom: HVA_EFFECTIVE_FROM,
    date: HVA_LOCAL_DATE,
    assignment: {
      class: HVA_CLASS_LABEL,
      discipline: HVA_DISCIPLINE_NAME,
      status: 'CONFIRMED',
      weeklyMinutes: HVA_WEEKLY_MINUTES,
      marker: HVA_ASSIGNMENT_MARKER,
    },
    lessons: [
      { start: HVA_PRIOR_START, end: HVA_PRIOR_END, recorded: false },
      { start: HVA_CURRENT_START, end: HVA_CURRENT_END },
    ],
  },
  calendar: {
    date: HVA_LOCAL_DATE,
    start: HVA_CALENDAR_START,
    end: HVA_CALENDAR_END,
    kind: HVA_CALENDAR_KIND,
    marker: HVA_CALENDAR_SOURCE_REF,
  },
})

export function projectHvaBaselineSnapshot(input = {}) {
  const sections = input.sections ?? []
  const disciplines = input.disciplines ?? []
  const assignments = input.assignments ?? []
  const versions = input.versions ?? []
  const slots = input.slots ?? []
  const sessions = input.sessions ?? []
  const calendarEvents = input.calendarEvents ?? []

  const activeVersions = versions
    .filter((version) => isVersionInForce(version, HVA_LOCAL_DATE))
    .sort(byId)
  const activeVersionIds = activeVersions.map((version) => version.id)
  const activeVersionIdSet = new Set(activeVersionIds)

  const mondayLessons = slots
    .filter((slot) =>
      activeVersionIdSet.has(slot.timetable_version_id)
      && slot.weekday === HVA_WEEKDAY
      && slot.slot_kind === 'LESSON',
    )
    .sort(byLessonThenId)

  const priorLessons = mondayLessons.filter((slot) =>
    clock(slot.start_time) === HVA_PRIOR_START && clock(slot.end_time) === HVA_PRIOR_END,
  )
  const currentLessons = mondayLessons.filter((slot) =>
    clock(slot.start_time) === HVA_CURRENT_START && clock(slot.end_time) === HVA_CURRENT_END,
  )

  const governedLessonIds = new Set([...priorLessons, ...currentLessons].map((slot) => slot.id))
  const linkedAssignmentIds = uniqueSorted(
    [...priorLessons, ...currentLessons]
      .map((slot) => slot.teaching_assignment_id)
      .filter(Boolean),
  )
  const linkedAssignments = assignments
    .filter((assignment) => linkedAssignmentIds.includes(assignment.id))
    .sort(byId)
  const assignment = linkedAssignments[0] ?? null
  const section = assignment
    ? sections.find((candidate) => candidate.id === assignment.section_id) ?? null
    : null
  const discipline = assignment
    ? disciplines.find((candidate) => candidate.id === assignment.discipline_id) ?? null
    : null

  const recordedPriorSessionIds = sessions
    .filter((session) => priorLessons.some((slot) => sessionRecordsSlot(session, slot)))
    .map((session) => session.id)
    .filter(Boolean)
    .sort()

  const calendarCandidates = calendarEvents
    .filter((event) => event.source_ref?.trim() === HVA_CALENDAR_SOURCE_REF)
    .sort(byId)
  const calendarEvent = calendarCandidates[0] ?? null

  const invalidLessonBindingIds = [...priorLessons, ...currentLessons]
    .filter((slot) =>
      !assignment
      || slot.teaching_assignment_id !== assignment.id
      || slot.section_id !== assignment.section_id
      || slot.discipline_id !== assignment.discipline_id,
    )
    .map((slot) => slot.id)
    .filter(Boolean)
    .sort()

  const semanticLessons = mondayLessons.map((slot) => {
    const lesson = {
      start: clock(slot.start_time),
      end: clock(slot.end_time),
    }
    if (clockMinute(slot.end_time) <= HVA_MINUTE_OF_DAY) {
      lesson.recorded = sessions.some((session) => sessionRecordsSlot(session, slot))
    }
    return lesson
  })

  return {
    baseline: HVA_BASELINE_ID,
    canonicalNow: HVA_CANONICAL_NOW,
    timetable: {
      effectiveFrom: activeVersions.length === 1 ? activeVersions[0].effective_from ?? null : null,
      date: HVA_LOCAL_DATE,
      assignment: assignment ? {
        class: classLabel(section),
        discipline: discipline?.name?.trim() ?? null,
        status: assignment.status ?? null,
        weeklyMinutes: assignment.weekly_minutes ?? null,
        marker: assignment.source_note?.trim() ?? null,
      } : null,
      lessons: semanticLessons,
    },
    calendar: calendarEvent ? {
      date: calendarEvent.starts_on ?? null,
      start: clock(calendarEvent.start_time),
      end: clock(calendarEvent.end_time),
      kind: calendarEvent.event_kind ?? null,
      marker: calendarEvent.source_ref?.trim() ?? null,
    } : null,
    diagnostics: {
      activeVersionIds,
      assignmentIds: linkedAssignments.map((candidate) => candidate.id),
      mondayLessonIds: mondayLessons.map((slot) => slot.id).filter(Boolean),
      priorLessonIds: priorLessons.map((slot) => slot.id).filter(Boolean),
      currentLessonIds: currentLessons.map((slot) => slot.id).filter(Boolean),
      calendarEventIds: calendarCandidates.map((event) => event.id).filter(Boolean),
      recordedPriorSessionIds,
      invalidLessonBindingIds,
      canonicalDisciplineActive: discipline?.is_active === true,
      governedLessonIds: [...governedLessonIds].filter(Boolean).sort(),
    },
  }
}

export function validateHvaBaselineSnapshot(snapshot) {
  const errors = []
  const diagnostics = snapshot?.diagnostics ?? {}
  const timetable = snapshot?.timetable ?? {}
  const assignment = timetable.assignment ?? null
  const calendar = snapshot?.calendar ?? null

  if (snapshot?.baseline !== HVA_BASELINE_ID) {
    errors.push(`baseline must be ${HVA_BASELINE_ID}`)
  }
  if (snapshot?.canonicalNow !== HVA_CANONICAL_NOW) {
    errors.push(`canonical clock must be ${HVA_CANONICAL_NOW}`)
  }

  const activeCount = diagnostics.activeVersionIds?.length ?? 0
  if (activeCount !== 1) {
    errors.push(`expected exactly one ACTIVE timetable on ${HVA_LOCAL_DATE}, found ${activeCount}`)
  }
  if (timetable.effectiveFrom !== HVA_EFFECTIVE_FROM) {
    errors.push(`ACTIVE timetable effective_from must be ${HVA_EFFECTIVE_FROM}`)
  }
  if (timetable.date !== HVA_LOCAL_DATE) {
    errors.push(`timetable date must be ${HVA_LOCAL_DATE}`)
  }

  const assignmentCount = diagnostics.assignmentIds?.length ?? 0
  if (assignmentCount !== 1) {
    errors.push(`expected exactly one canonical assignment across governed lessons, found ${assignmentCount}`)
  }
  if (assignment?.class !== HVA_CLASS_LABEL) {
    errors.push(`canonical assignment class must be ${HVA_CLASS_LABEL}`)
  }
  if (assignment?.discipline !== HVA_DISCIPLINE_NAME) {
    errors.push(`canonical assignment discipline must be ${HVA_DISCIPLINE_NAME}`)
  }
  if (diagnostics.canonicalDisciplineActive !== true) {
    errors.push(`${HVA_DISCIPLINE_NAME} discipline must be active`)
  }
  if (assignment?.status !== 'CONFIRMED') {
    errors.push('canonical assignment must be CONFIRMED')
  }
  if (assignment?.weeklyMinutes !== HVA_WEEKLY_MINUTES) {
    errors.push(`canonical assignment weekly_minutes must be ${HVA_WEEKLY_MINUTES}`)
  }
  if (assignment?.marker !== HVA_ASSIGNMENT_MARKER) {
    errors.push(`canonical assignment marker must be ${HVA_ASSIGNMENT_MARKER}`)
  }

  const mondayCount = diagnostics.mondayLessonIds?.length ?? 0
  if (mondayCount !== 2) {
    errors.push(`governed Monday timetable must expose exactly two lessons, found ${mondayCount}`)
  }
  const priorCount = diagnostics.priorLessonIds?.length ?? 0
  if (priorCount !== 1) {
    errors.push(`expected exactly one ${HVA_PRIOR_START}–${HVA_PRIOR_END} canonical lesson, found ${priorCount}`)
  }
  const currentCount = diagnostics.currentLessonIds?.length ?? 0
  if (currentCount !== 1) {
    errors.push(`expected exactly one ${HVA_CURRENT_START}–${HVA_CURRENT_END} current canonical lesson, found ${currentCount}`)
  }
  const invalidBindingCount = diagnostics.invalidLessonBindingIds?.length ?? 0
  if (invalidBindingCount > 0) {
    errors.push(`canonical lessons must share the 2A/Tecnologia assignment; invalid bindings: ${invalidBindingCount}`)
  }
  const recordedPriorCount = diagnostics.recordedPriorSessionIds?.length ?? 0
  if (recordedPriorCount > 0) {
    errors.push(`${HVA_PRIOR_START}–${HVA_PRIOR_END} canonical lesson must remain unregistered; recorded sessions found ${recordedPriorCount}`)
  }

  const calendarCount = diagnostics.calendarEventIds?.length ?? 0
  if (calendarCount !== 1) {
    errors.push(`expected exactly one canonical Calendar event, found ${calendarCount}`)
  }
  if (calendar) {
    if (calendar.date !== HVA_LOCAL_DATE) errors.push(`canonical Calendar date must be ${HVA_LOCAL_DATE}`)
    if (calendar.start !== HVA_CALENDAR_START || calendar.end !== HVA_CALENDAR_END) {
      errors.push(`canonical Calendar time must be ${HVA_CALENDAR_START}–${HVA_CALENDAR_END}`)
    }
    if (calendar.kind !== HVA_CALENDAR_KIND) errors.push(`canonical Calendar kind must be ${HVA_CALENDAR_KIND}`)
    if (calendar.marker !== HVA_CALENDAR_SOURCE_REF) errors.push(`canonical Calendar marker must be ${HVA_CALENDAR_SOURCE_REF}`)
  }

  return errors
}

export function fingerprintHvaBaselineSnapshot(snapshot) {
  const semantic = stripDiagnostics(snapshot)
  return createHash('sha256').update(stableJson(semantic)).digest('hex')
}

export function validateHvaCurrentLessonInput(input = {}) {
  const disciplines = input.disciplines ?? []
  const assignments = input.assignments ?? []
  const versions = input.versions ?? []
  const slots = input.slots ?? []
  const errors = []

  const canonicalDisciplines = disciplines.filter((discipline) =>
    discipline.name?.trim() === HVA_DISCIPLINE_NAME,
  )
  if (canonicalDisciplines.length !== 1) {
    errors.push(`expected exactly one ${HVA_DISCIPLINE_NAME} discipline, found ${canonicalDisciplines.length}`)
    return errors
  }
  const discipline = canonicalDisciplines[0]
  if (discipline.is_active !== true) errors.push(`${HVA_DISCIPLINE_NAME} discipline must be active`)

  const activeVersions = versions.filter((version) => isVersionInForce(version, HVA_LOCAL_DATE))
  if (activeVersions.length !== 1) {
    errors.push(`expected exactly one ACTIVE timetable on ${HVA_LOCAL_DATE}, found ${activeVersions.length}`)
    return errors
  }

  const currentSlots = slots.filter((slot) =>
    slot.timetable_version_id === activeVersions[0].id
    && slot.weekday === HVA_WEEKDAY
    && slot.slot_kind === 'LESSON'
    && clockMinute(slot.start_time) <= HVA_MINUTE_OF_DAY
    && clockMinute(slot.end_time) > HVA_MINUTE_OF_DAY,
  )
  if (currentSlots.length !== 1) {
    errors.push(`expected exactly one Monday lesson at 08:30, found ${currentSlots.length}`)
    return errors
  }

  const slot = currentSlots[0]
  if (slot.discipline_id !== discipline.id) {
    errors.push(`current Monday lesson must use the canonical ${HVA_DISCIPLINE_NAME} discipline`)
  }
  const assignment = assignments.find((candidate) => candidate.id === slot.teaching_assignment_id)
  if (!assignment) {
    errors.push('current Monday lesson teaching assignment is missing from the HVA context')
    return errors
  }
  if (assignment.discipline_id !== discipline.id) {
    errors.push(`current Monday lesson assignment must belong to the canonical ${HVA_DISCIPLINE_NAME} discipline`)
  }
  if (assignment.status !== 'CONFIRMED') errors.push('current Monday lesson assignment must be CONFIRMED')
  if (assignment.source_note?.trim() !== HVA_ASSIGNMENT_MARKER) {
    errors.push(`current Monday lesson assignment must use the dedicated Oggi marker: ${HVA_ASSIGNMENT_MARKER}`)
  }
  return errors
}

export function validateHvaLessonCoexistenceInput(input = {}) {
  const slots = input.slots ?? []
  const sessions = input.sessions ?? []
  const errors = []
  const mondayLessons = slots
    .filter((slot) => slot.weekday === HVA_WEEKDAY && slot.slot_kind === 'LESSON')
    .sort(byLessonThenId)

  const current = mondayLessons.filter((slot) =>
    clockMinute(slot.start_time) <= HVA_MINUTE_OF_DAY
    && clockMinute(slot.end_time) > HVA_MINUTE_OF_DAY,
  )
  if (current.length !== 1) {
    errors.push(`expected exactly one canonical current lesson at 08:30, found ${current.length}`)
    return errors
  }

  const priorUnregistered = mondayLessons.filter((slot) =>
    clockMinute(slot.end_time) <= HVA_MINUTE_OF_DAY
    && !sessions.some((session) => sessionRecordsSlot(session, slot)),
  )
  if (!priorUnregistered.length) {
    errors.push('governed ACTIVE timetable does not expose a prior unregistered lesson before the canonical 08:30 lesson')
  }
  return errors
}

function isVersionInForce(version, localDate) {
  return version.status === 'ACTIVE'
    && version.effective_from <= localDate
    && (!version.effective_to || version.effective_to >= localDate)
}

function sessionRecordsSlot(session, slot) {
  if (session.local_date !== HVA_LOCAL_DATE) return false
  if (slot.section_id && session.section_id !== slot.section_id) return false
  const occurrenceId = `tt:${slot.timetable_version_id}:${slot.id}:${HVA_LOCAL_DATE}`
  return session.source_timetable_slot_id === slot.id
    || session.projected_occurrence_logical_id === occurrenceId
}

function classLabel(section) {
  if (!section) return null
  const grade = { PRIMA: '1', SECONDA: '2', TERZA: '3' }[section.grade] ?? String(section.grade ?? '').trim()
  const code = String(section.section_code ?? '').trim().toUpperCase()
  return grade && code ? `${grade}${code}` : null
}

function stripDiagnostics(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot
  const { diagnostics: _diagnostics, ...semantic } = snapshot
  return semantic
}

function stableJson(value) {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]),
  )
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const nested of Object.values(value)) deepFreeze(nested)
  return value
}

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

function byId(first, second) {
  return String(first.id ?? '').localeCompare(String(second.id ?? ''))
}

function byLessonThenId(first, second) {
  return clockMinute(first.start_time) - clockMinute(second.start_time)
    || clockMinute(first.end_time) - clockMinute(second.end_time)
    || byId(first, second)
}

function clock(value) {
  const normalized = String(value ?? '').slice(0, 5)
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : null
}

function clockMinute(value) {
  const [hour, minute] = String(value ?? '').slice(0, 5).split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return Number.NaN
  return hour * 60 + minute
}
