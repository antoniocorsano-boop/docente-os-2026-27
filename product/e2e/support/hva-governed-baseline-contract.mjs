import { createHash } from 'node:crypto'
import baselineConfig from './hva-governed-baseline-config.cjs'

export const HVA_CANONICAL_ASSIGNMENT_NOTE = 'HVA · Oggi · Cattedra canonica'
export const HVA_CANONICAL_DISCIPLINE = 'Tecnologia'
export const HVA_CANONICAL_CLASS = '2A'
export const HVA_CANONICAL_CALENDAR_TITLE = 'HVA · Impegno collegiale canonico'

const EXPECTED = {
  schemaVersion: 1,
  baseline: baselineConfig.HVA_BASELINE_ID,
  canonicalNow: baselineConfig.HVA_CANONICAL_NOW,
  timetable: {
    activeCount: 1,
    effectiveFrom: baselineConfig.HVA_EFFECTIVE_FROM,
    assignment: {
      count: 1,
      class: HVA_CANONICAL_CLASS,
      discipline: HVA_CANONICAL_DISCIPLINE,
      status: 'CONFIRMED',
      weeklyMinutes: 120,
      marker: HVA_CANONICAL_ASSIGNMENT_NOTE,
    },
    lessons: [
      { count: 1, weekday: 1, start: '07:00', end: '08:00', class: HVA_CANONICAL_CLASS, discipline: HVA_CANONICAL_DISCIPLINE, recorded: false },
      { count: 1, weekday: 1, start: '08:00', end: '09:00', class: HVA_CANONICAL_CLASS, discipline: HVA_CANONICAL_DISCIPLINE },
    ],
  },
  calendar: {
    count: 1,
    date: baselineConfig.HVA_LOCAL_DATE,
    start: '10:30',
    end: '11:00',
    kind: 'MEETING',
    marker: baselineConfig.HVA_CALENDAR_SOURCE_REF,
    title: HVA_CANONICAL_CALENDAR_TITLE,
  },
}

export const HVA_EXPECTED_BASELINE_SNAPSHOT = deepFreeze(structuredClone(EXPECTED))

export function projectHvaBaselineSnapshot(input) {
  const disciplines = input?.disciplines ?? []
  const sections = input?.sections ?? []
  const assignments = input?.assignments ?? []
  const versions = input?.versions ?? []
  const slots = input?.slots ?? []
  const sessions = input?.sessions ?? []
  const calendarEvents = input?.calendarEvents ?? []

  const activeVersions = validVersionsForDate(versions, baselineConfig.HVA_LOCAL_DATE)
    .filter((version) => version.status === 'ACTIVE')
    .sort(versionOrder)
  const activeVersion = activeVersions[0] ?? null

  const markedAssignments = assignments
    .filter((assignment) => assignment.source_note?.trim() === HVA_CANONICAL_ASSIGNMENT_NOTE)
    .sort(idOrder)
  const assignment = markedAssignments[0] ?? null
  const section = assignment ? sections.find((candidate) => candidate.id === assignment.section_id) ?? null : null
  const discipline = assignment ? disciplines.find((candidate) => candidate.id === assignment.discipline_id) ?? null : null

  const lessons = [
    projectLesson({ start: '07:00', end: '08:00', activeVersion, slots, sessions, sections, disciplines }),
    projectLesson({ start: '08:00', end: '09:00', activeVersion, slots, sessions, sections, disciplines, includeRecorded: false }),
  ]

  const canonicalEvents = calendarEvents.filter((event) =>
    event.starts_on === baselineConfig.HVA_LOCAL_DATE
    && event.ends_on === baselineConfig.HVA_LOCAL_DATE
    && event.all_day === false
    && clock(event.start_time) === '10:30'
    && clock(event.end_time) === '11:00'
    && event.event_kind === 'MEETING'
    && event.source_ref?.trim() === baselineConfig.HVA_CALENDAR_SOURCE_REF,
  ).sort(idOrder)
  const calendarEvent = canonicalEvents[0] ?? null

  return {
    schemaVersion: 1,
    baseline: baselineConfig.HVA_BASELINE_ID,
    canonicalNow: baselineConfig.HVA_CANONICAL_NOW,
    timetable: {
      activeCount: activeVersions.length,
      effectiveFrom: activeVersion?.effective_from ?? null,
      assignment: {
        count: markedAssignments.length,
        class: classLabel(section),
        discipline: discipline?.name?.trim() ?? null,
        status: assignment?.status ?? null,
        weeklyMinutes: assignment?.weekly_minutes ?? null,
        marker: assignment?.source_note?.trim() ?? null,
      },
      lessons,
    },
    calendar: {
      count: canonicalEvents.length,
      date: calendarEvent?.starts_on ?? null,
      start: clock(calendarEvent?.start_time),
      end: clock(calendarEvent?.end_time),
      kind: calendarEvent?.event_kind ?? null,
      marker: calendarEvent?.source_ref?.trim() ?? null,
      title: calendarEvent?.title?.trim() ?? null,
    },
  }
}

export function validateHvaBaselineSnapshot(snapshot) {
  const errors = []
  if (snapshot?.baseline !== baselineConfig.HVA_BASELINE_ID) errors.push(`baseline must be ${baselineConfig.HVA_BASELINE_ID}`)
  if (snapshot?.canonicalNow !== baselineConfig.HVA_CANONICAL_NOW) errors.push(`canonical clock must be ${baselineConfig.HVA_CANONICAL_NOW}`)
  const timetable = snapshot?.timetable ?? {}
  if (timetable.activeCount !== 1) errors.push(`expected exactly one ACTIVE timetable on ${baselineConfig.HVA_LOCAL_DATE}, found ${timetable.activeCount ?? 0}`)
  if (timetable.effectiveFrom !== baselineConfig.HVA_EFFECTIVE_FROM) errors.push(`ACTIVE timetable must start on ${baselineConfig.HVA_EFFECTIVE_FROM}`)
  const assignment = timetable.assignment ?? {}
  if (assignment.count !== 1) errors.push(`canonical assignment must be exactly one, found ${assignment.count ?? 0}`)
  if (assignment.class !== HVA_CANONICAL_CLASS) errors.push(`canonical assignment class must be ${HVA_CANONICAL_CLASS}`)
  if (assignment.discipline !== HVA_CANONICAL_DISCIPLINE) errors.push(`canonical assignment discipline must be ${HVA_CANONICAL_DISCIPLINE}`)
  if (assignment.status !== 'CONFIRMED') errors.push('canonical assignment must be CONFIRMED')
  if (assignment.weeklyMinutes !== 120) errors.push('canonical assignment weekly minutes must be 120')
  if (assignment.marker !== HVA_CANONICAL_ASSIGNMENT_NOTE) errors.push(`canonical assignment marker must be ${HVA_CANONICAL_ASSIGNMENT_NOTE}`)

  const lessons = timetable.lessons ?? []
  const prior = lessons.find((lesson) => lesson.start === '07:00' && lesson.end === '08:00')
  const current = lessons.find((lesson) => lesson.start === '08:00' && lesson.end === '09:00')
  validateLesson(errors, prior, '07:00', true)
  validateLesson(errors, current, '08:00', false)

  const calendar = snapshot?.calendar ?? {}
  if (calendar.count !== 1) errors.push(`Calendar must expose exactly one canonical event, found ${calendar.count ?? 0}`)
  if (calendar.count === 1) {
    if (calendar.date !== baselineConfig.HVA_LOCAL_DATE) errors.push(`Calendar event date must be ${baselineConfig.HVA_LOCAL_DATE}`)
    if (calendar.start !== '10:30' || calendar.end !== '11:00') errors.push('Calendar event time must be 10:30–11:00')
    if (calendar.kind !== 'MEETING') errors.push('Calendar event kind must be MEETING')
    if (calendar.marker !== baselineConfig.HVA_CALENDAR_SOURCE_REF) errors.push(`Calendar event marker must be ${baselineConfig.HVA_CALENDAR_SOURCE_REF}`)
    if (calendar.title !== HVA_CANONICAL_CALENDAR_TITLE) errors.push(`Calendar event title must be ${HVA_CANONICAL_CALENDAR_TITLE}`)
  }
  return errors
}

export function fingerprintHvaBaselineSnapshot(snapshot) {
  return createHash('sha256').update(canonicalJson(snapshot)).digest('hex')
}

export function validateHvaTodayFixtureInput(input) {
  const errors = []
  const disciplines = input?.disciplines ?? []
  const assignments = input?.assignments ?? []
  const versions = input?.versions ?? []
  const slots = input?.slots ?? []
  const canonicalDisciplines = disciplines.filter((discipline) => discipline.name?.trim() === HVA_CANONICAL_DISCIPLINE)
  if (canonicalDisciplines.length !== 1) {
    errors.push(`expected exactly one ${HVA_CANONICAL_DISCIPLINE} discipline, found ${canonicalDisciplines.length}`)
    return errors
  }
  const discipline = canonicalDisciplines[0]
  if (discipline.is_active !== true) errors.push(`${HVA_CANONICAL_DISCIPLINE} discipline must be active`)
  const activeVersions = validVersionsForDate(versions, baselineConfig.HVA_LOCAL_DATE).filter((version) => version.status === 'ACTIVE')
  if (activeVersions.length !== 1) {
    errors.push(`expected exactly one ACTIVE timetable on ${baselineConfig.HVA_LOCAL_DATE}, found ${activeVersions.length}`)
    return errors
  }
  const activeVersion = activeVersions[0]
  const currentSlots = slots.filter((slot) => slot.timetable_version_id === activeVersion.id && slot.weekday === baselineConfig.HVA_WEEKDAY && slot.slot_kind === 'LESSON' && clockMinute(slot.start_time) <= baselineConfig.HVA_MINUTE_OF_DAY && clockMinute(slot.end_time) > baselineConfig.HVA_MINUTE_OF_DAY)
  if (currentSlots.length !== 1) {
    errors.push(`expected exactly one Monday lesson at 08:30, found ${currentSlots.length}`)
    return errors
  }
  const slot = currentSlots[0]
  if (slot.discipline_id !== discipline.id) errors.push('current Monday lesson must use the canonical Tecnologia discipline')
  if (!slot.teaching_assignment_id) { errors.push('current Monday lesson must reference a teaching assignment'); return errors }
  const assignment = assignments.find((candidate) => candidate.id === slot.teaching_assignment_id)
  if (!assignment) { errors.push('current Monday lesson teaching assignment is missing from the HVA context'); return errors }
  if (assignment.discipline_id !== discipline.id) errors.push('current Monday lesson assignment must belong to the canonical Tecnologia discipline')
  if (assignment.status !== 'CONFIRMED') errors.push('current Monday lesson assignment must be CONFIRMED')
  if (assignment.source_note?.trim() !== HVA_CANONICAL_ASSIGNMENT_NOTE) errors.push(`current Monday lesson assignment must use the dedicated Oggi marker: ${HVA_CANONICAL_ASSIGNMENT_NOTE}`)
  return errors
}

export function validateHvaTodayCoexistenceInput(input) {
  const slots = input?.slots ?? []
  const sessions = input?.sessions ?? []
  const errors = []
  const mondayLessons = slots.filter((slot) => slot.weekday === baselineConfig.HVA_WEEKDAY && slot.slot_kind === 'LESSON').sort((a, b) => clockMinute(a.start_time) - clockMinute(b.start_time) || String(a.id).localeCompare(String(b.id)))
  const current = mondayLessons.filter((slot) => clockMinute(slot.start_time) <= baselineConfig.HVA_MINUTE_OF_DAY && clockMinute(slot.end_time) > baselineConfig.HVA_MINUTE_OF_DAY)
  if (current.length !== 1) { errors.push(`expected exactly one canonical current lesson at 08:30, found ${current.length}`); return errors }
  const priorUnregistered = mondayLessons.filter((slot) => clockMinute(slot.end_time) <= baselineConfig.HVA_MINUTE_OF_DAY && !isRecorded(slot, sessions))
  if (!priorUnregistered.length) errors.push('governed ACTIVE timetable does not expose a prior unregistered lesson before the canonical 08:30 lesson')
  return errors
}

function projectLesson({ start, end, activeVersion, slots, sessions, sections, disciplines, includeRecorded = true }) {
  const matching = activeVersion ? slots.filter((slot) => slot.timetable_version_id === activeVersion.id && slot.weekday === baselineConfig.HVA_WEEKDAY && slot.slot_kind === 'LESSON' && clock(slot.start_time) === start && clock(slot.end_time) === end).sort(idOrder) : []
  const slot = matching[0] ?? null
  const section = slot ? sections.find((candidate) => candidate.id === slot.section_id) ?? null : null
  const discipline = slot ? disciplines.find((candidate) => candidate.id === slot.discipline_id) ?? null : null
  const result = { count: matching.length, weekday: baselineConfig.HVA_WEEKDAY, start, end, class: classLabel(section), discipline: discipline?.name?.trim() ?? null }
  if (includeRecorded) result.recorded = slot ? isRecorded(slot, sessions) : false
  return result
}

function validateLesson(errors, lesson, start, requireUnregistered) {
  if (!lesson || lesson.count !== 1) {
    errors.push(`${start} lesson must have exactly one governed occurrence, found ${lesson?.count ?? 0}`)
    return
  }
  if (lesson.class !== HVA_CANONICAL_CLASS) errors.push(`${start} lesson class must be ${HVA_CANONICAL_CLASS}`)
  if (lesson.discipline !== HVA_CANONICAL_DISCIPLINE) errors.push(`${start} lesson discipline must be ${HVA_CANONICAL_DISCIPLINE}`)
  if (requireUnregistered && lesson.recorded !== false) errors.push(`${start} lesson must remain unregistered`)
}

function validVersionsForDate(versions, localDate) {
  return versions.filter((version) => version.effective_from <= localDate && (!version.effective_to || version.effective_to >= localDate))
}
function classLabel(section) {
  if (!section) return null
  const grade = section.grade === 'SECONDA' ? '2' : section.grade === 'PRIMA' ? '1' : section.grade === 'TERZA' ? '3' : String(section.grade ?? '')
  return `${grade}${String(section.section_code ?? '').trim().toUpperCase()}`
}
function isRecorded(slot, sessions) {
  const occurrenceLogicalId = `tt:${slot.timetable_version_id}:${slot.id}:${baselineConfig.HVA_LOCAL_DATE}`
  return sessions.some((session) => session.local_date === baselineConfig.HVA_LOCAL_DATE && (!slot.section_id || session.section_id === slot.section_id) && (session.source_timetable_slot_id === slot.id || session.projected_occurrence_logical_id === occurrenceLogicalId))
}
function clock(value) { return value ? String(value).slice(0, 5) : null }
function clockMinute(value) { const [hour, minute] = clock(value)?.split(':').map(Number) ?? []; return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : Number.NaN }
function idOrder(a, b) { return String(a?.id ?? '').localeCompare(String(b?.id ?? '')) }
function versionOrder(a, b) { return String(b?.effective_from ?? '').localeCompare(String(a?.effective_from ?? '')) || idOrder(a, b) }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const item of Object.values(value)) deepFreeze(item)
  return value
}
