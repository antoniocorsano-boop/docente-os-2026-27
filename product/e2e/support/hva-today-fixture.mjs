import { authenticatedAal2Supabase } from './direct-aal2-supabase.mjs'

export const HVA_TODAY_DISCIPLINE_NAME = 'Tecnologia'
export const HVA_TODAY_ASSIGNMENT_NOTE = 'HVA · Oggi · Cattedra canonica'
export const HVA_TODAY_LOCAL_DATE = '2026-10-19'
export const HVA_TODAY_WEEKDAY = 1
export const HVA_TODAY_MINUTE_OF_DAY = 8 * 60 + 30
export const HVA_TODAY_COEXISTENCE_SLOT_NOTE_PREFIX = 'HVA · Oggi · Task 9 coexistence'
export const HVA_TODAY_COEXISTENCE_CALENDAR_SOURCE_PREFIX = 'hva:today-coexistence:'

export function validateHvaTodayFixture(input) {
  const errors = []
  const disciplines = input.disciplines ?? []
  const assignments = input.assignments ?? []
  const versions = input.versions ?? []
  const slots = input.slots ?? []

  const canonicalDisciplines = disciplines.filter((discipline) =>
    discipline.name?.trim() === HVA_TODAY_DISCIPLINE_NAME,
  )
  if (canonicalDisciplines.length !== 1) {
    errors.push(`expected exactly one ${HVA_TODAY_DISCIPLINE_NAME} discipline, found ${canonicalDisciplines.length}`)
    return errors
  }

  const discipline = canonicalDisciplines[0]
  if (discipline.is_active !== true) {
    errors.push(`${HVA_TODAY_DISCIPLINE_NAME} discipline must be active`)
  }

  const activeVersions = versions.filter((version) =>
    version.status === 'ACTIVE'
    && version.effective_from <= HVA_TODAY_LOCAL_DATE
    && (!version.effective_to || version.effective_to >= HVA_TODAY_LOCAL_DATE),
  )
  if (activeVersions.length !== 1) {
    errors.push(`expected exactly one ACTIVE timetable on ${HVA_TODAY_LOCAL_DATE}, found ${activeVersions.length}`)
    return errors
  }

  const activeVersion = activeVersions[0]
  const currentSlots = slots.filter((slot) =>
    slot.timetable_version_id === activeVersion.id
    && slot.weekday === HVA_TODAY_WEEKDAY
    && slot.slot_kind === 'LESSON'
    && clockMinute(slot.start_time) <= HVA_TODAY_MINUTE_OF_DAY
    && clockMinute(slot.end_time) > HVA_TODAY_MINUTE_OF_DAY,
  )
  if (currentSlots.length !== 1) {
    errors.push(`expected exactly one Monday lesson at 08:30, found ${currentSlots.length}`)
    return errors
  }

  const slot = currentSlots[0]
  if (slot.discipline_id !== discipline.id) {
    errors.push('current Monday lesson must use the canonical Tecnologia discipline')
  }
  if (!slot.teaching_assignment_id) {
    errors.push('current Monday lesson must reference a teaching assignment')
    return errors
  }

  const assignment = assignments.find((candidate) => candidate.id === slot.teaching_assignment_id)
  if (!assignment) {
    errors.push('current Monday lesson teaching assignment is missing from the HVA context')
    return errors
  }
  if (assignment.discipline_id !== discipline.id) {
    errors.push('current Monday lesson assignment must belong to the canonical Tecnologia discipline')
  }
  if (assignment.status !== 'CONFIRMED') {
    errors.push('current Monday lesson assignment must be CONFIRMED')
  }
  if (assignment.source_note?.trim() !== HVA_TODAY_ASSIGNMENT_NOTE) {
    errors.push(`current Monday lesson assignment must use the dedicated Oggi marker: ${HVA_TODAY_ASSIGNMENT_NOTE}`)
  }

  return errors
}

export async function assertHvaTodayRuntimeFixture() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('HVA Today preflight requires Supabase URL and publishable key')
  }

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'HVA Today read-only preflight',
  })
  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`HVA Today workspace lookup failed: ${contextError.message}`)
  const current = contexts?.[0]
  if (!current?.workspace_id || !current?.academic_year_id) {
    throw new Error('HVA Today preflight requires a current workspace and academic year')
  }

  const [disciplineResult, assignmentResult, versionResult] = await Promise.all([
    supabase
      .from('teaching_disciplines')
      .select('id,name,is_active')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
    supabase
      .from('teaching_assignments')
      .select('id,discipline_id,status,source_note')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
    supabase
      .from('timetable_versions')
      .select('id,status,effective_from,effective_to')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
  ])
  if (disciplineResult.error) throw new Error(`HVA Today discipline lookup failed: ${disciplineResult.error.message}`)
  if (assignmentResult.error) throw new Error(`HVA Today assignment lookup failed: ${assignmentResult.error.message}`)
  if (versionResult.error) throw new Error(`HVA Today timetable version lookup failed: ${versionResult.error.message}`)

  const versionIds = (versionResult.data ?? []).map((version) => version.id)
  let slots = []
  if (versionIds.length) {
    const slotResult = await supabase
      .from('timetable_slots')
      .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,discipline_id,teaching_assignment_id')
      .in('timetable_version_id', versionIds)
    if (slotResult.error) throw new Error(`HVA Today timetable slot lookup failed: ${slotResult.error.message}`)
    slots = slotResult.data ?? []
  }

  const errors = validateHvaTodayFixture({
    disciplines: disciplineResult.data ?? [],
    assignments: assignmentResult.data ?? [],
    versions: versionResult.data ?? [],
    slots,
  })
  if (errors.length) {
    throw new Error(`HVA Today fixture preflight failed:\n- ${errors.join('\n- ')}`)
  }

  process.stdout.write(`HVA Today preflight PASS: ${HVA_TODAY_LOCAL_DATE} 08:30 · ${HVA_TODAY_DISCIPLINE_NAME}\n`)
}

export async function createHvaTodayCoexistenceFixture({ suffix }) {
  const fixtureSuffix = String(suffix ?? '').trim()
  if (!fixtureSuffix) throw new Error('HVA Today coexistence fixture requires a unique suffix')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('HVA Today coexistence fixture requires Supabase URL and publishable key')
  }

  const { supabase, userId } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'HVA Today coexistence fixture',
  })
  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`HVA Today coexistence workspace lookup failed: ${contextError.message}`)
  const current = contexts?.[0]
  if (!current?.workspace_id || !current?.academic_year_id) {
    throw new Error('HVA Today coexistence fixture requires a current workspace and academic year')
  }

  const [disciplineResult, assignmentResult, versionResult] = await Promise.all([
    supabase
      .from('teaching_disciplines')
      .select('id,name,is_active')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
    supabase
      .from('teaching_assignments')
      .select('id,discipline_id,status,source_note')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
    supabase
      .from('timetable_versions')
      .select('id,status,effective_from,effective_to')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id),
  ])
  if (disciplineResult.error) throw new Error(`HVA Today coexistence discipline lookup failed: ${disciplineResult.error.message}`)
  if (assignmentResult.error) throw new Error(`HVA Today coexistence assignment lookup failed: ${assignmentResult.error.message}`)
  if (versionResult.error) throw new Error(`HVA Today coexistence timetable lookup failed: ${versionResult.error.message}`)

  const activeVersions = (versionResult.data ?? []).filter((version) =>
    version.status === 'ACTIVE'
    && version.effective_from <= HVA_TODAY_LOCAL_DATE
    && (!version.effective_to || version.effective_to >= HVA_TODAY_LOCAL_DATE),
  )
  if (activeVersions.length !== 1) {
    throw new Error(`HVA Today coexistence expected exactly one ACTIVE timetable, found ${activeVersions.length}`)
  }
  const activeVersion = activeVersions[0]

  const slotResult = await supabase
    .from('timetable_slots')
    .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id,room,note,ordinal,activity_kind,manual_class_label,presence_kind')
    .eq('timetable_version_id', activeVersion.id)
  if (slotResult.error) throw new Error(`HVA Today coexistence slot lookup failed: ${slotResult.error.message}`)

  const slots = slotResult.data ?? []
  const validationErrors = validateHvaTodayFixture({
    disciplines: disciplineResult.data ?? [],
    assignments: assignmentResult.data ?? [],
    versions: versionResult.data ?? [],
    slots,
  })
  if (validationErrors.length) {
    throw new Error(`HVA Today coexistence baseline invalid:\n- ${validationErrors.join('\n- ')}`)
  }

  const currentSlots = slots.filter((slot) =>
    slot.weekday === HVA_TODAY_WEEKDAY
    && slot.slot_kind === 'LESSON'
    && clockMinute(slot.start_time) <= HVA_TODAY_MINUTE_OF_DAY
    && clockMinute(slot.end_time) > HVA_TODAY_MINUTE_OF_DAY,
  )
  if (currentSlots.length !== 1) {
    throw new Error(`HVA Today coexistence expected one canonical current slot, found ${currentSlots.length}`)
  }
  const canonicalSlot = currentSlots[0]

  const sourceRef = `${HVA_TODAY_COEXISTENCE_CALENDAR_SOURCE_PREFIX}${fixtureSuffix}`
  const slotNote = `${HVA_TODAY_COEXISTENCE_SLOT_NOTE_PREFIX} · ${fixtureSuffix}`
  const [staleSlotResult, staleEventResult] = await Promise.all([
    supabase
      .from('timetable_slots')
      .select('id')
      .eq('timetable_version_id', activeVersion.id)
      .like('note', `${HVA_TODAY_COEXISTENCE_SLOT_NOTE_PREFIX}%`),
    supabase
      .from('calendar_events')
      .select('id')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id)
      .like('source_ref', `${HVA_TODAY_COEXISTENCE_CALENDAR_SOURCE_PREFIX}%`),
  ])
  if (staleSlotResult.error) throw new Error(`HVA Today coexistence stale-slot check failed: ${staleSlotResult.error.message}`)
  if (staleEventResult.error) throw new Error(`HVA Today coexistence stale-event check failed: ${staleEventResult.error.message}`)
  if ((staleSlotResult.data?.length ?? 0) || (staleEventResult.data?.length ?? 0)) {
    throw new Error('HVA Today coexistence found stale fixture records; refusing to mutate the canonical HVA baseline')
  }

  const originalStartTime = canonicalSlot.start_time
  const originalEndTime = canonicalSlot.end_time
  let canonicalShifted = false
  let pendingSlotId = null
  let calendarEventId = null

  const restore = async () => {
    const cleanupErrors = []

    if (calendarEventId) {
      const { data, error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', calendarEventId)
        .eq('workspace_id', current.workspace_id)
        .eq('academic_year_id', current.academic_year_id)
        .select('id')
      if (error) cleanupErrors.push(`calendar event cleanup failed: ${error.message}`)
      else if ((data?.length ?? 0) !== 1) cleanupErrors.push('calendar event cleanup did not delete exactly one fixture row')
      else calendarEventId = null
    }

    if (pendingSlotId) {
      const { data, error } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('id', pendingSlotId)
        .eq('timetable_version_id', activeVersion.id)
        .select('id')
      if (error) cleanupErrors.push(`pending slot cleanup failed: ${error.message}`)
      else if ((data?.length ?? 0) !== 1) cleanupErrors.push('pending slot cleanup did not delete exactly one fixture row')
      else pendingSlotId = null
    }

    if (canonicalShifted) {
      const { data, error } = await supabase
        .from('timetable_slots')
        .update({ start_time: originalStartTime, end_time: originalEndTime })
        .eq('id', canonicalSlot.id)
        .eq('timetable_version_id', activeVersion.id)
        .select('id,start_time,end_time')
        .single()
      if (error) cleanupErrors.push(`canonical slot restore failed: ${error.message}`)
      else if (!data || clockText(data.start_time) !== clockText(originalStartTime) || clockText(data.end_time) !== clockText(originalEndTime)) {
        cleanupErrors.push('canonical slot restore verification failed')
      } else {
        canonicalShifted = false
      }
    }

    if (cleanupErrors.length) {
      throw new Error(`HVA Today coexistence cleanup failed:\n- ${cleanupErrors.join('\n- ')}`)
    }
  }

  try {
    const { data: shiftedSlot, error: shiftError } = await supabase
      .from('timetable_slots')
      .update({ start_time: '09:00:00', end_time: '10:00:00' })
      .eq('id', canonicalSlot.id)
      .eq('timetable_version_id', activeVersion.id)
      .select('id,start_time,end_time')
      .single()
    if (shiftError || !shiftedSlot) {
      throw new Error(`HVA Today coexistence canonical slot shift failed: ${shiftError?.message ?? 'missing updated slot'}`)
    }
    if (clockText(shiftedSlot.start_time) !== '09:00' || clockText(shiftedSlot.end_time) !== '10:00') {
      throw new Error('HVA Today coexistence canonical slot shift verification failed')
    }
    canonicalShifted = true

    const { data: pendingSlot, error: pendingError } = await supabase
      .from('timetable_slots')
      .insert({
        timetable_version_id: activeVersion.id,
        weekday: HVA_TODAY_WEEKDAY,
        start_time: '07:00:00',
        end_time: '08:00:00',
        slot_kind: 'LESSON',
        section_id: canonicalSlot.section_id,
        discipline_id: canonicalSlot.discipline_id,
        teaching_assignment_id: canonicalSlot.teaching_assignment_id,
        room: canonicalSlot.room,
        note: slotNote,
        ordinal: canonicalSlot.ordinal,
        activity_kind: canonicalSlot.activity_kind,
        created_by: userId,
      })
      .select('id')
      .single()
    if (pendingError || !pendingSlot?.id) {
      throw new Error(`HVA Today coexistence pending slot insert failed: ${pendingError?.message ?? 'missing inserted slot'}`)
    }
    pendingSlotId = pendingSlot.id

    const { data: calendarEvent, error: calendarError } = await supabase
      .from('calendar_events')
      .insert({
        workspace_id: current.workspace_id,
        academic_year_id: current.academic_year_id,
        title: 'HVA · Impegno collegiale',
        event_kind: 'MEETING',
        starts_on: HVA_TODAY_LOCAL_DATE,
        ends_on: HVA_TODAY_LOCAL_DATE,
        all_day: false,
        start_time: '10:30:00',
        end_time: '11:00:00',
        location: 'Aula docenti',
        note: `Fixture HVA Task 9 · ${fixtureSuffix}`,
        source_kind: 'MANUAL',
        source_ref: sourceRef,
        source_knowledge_unit_id: null,
        created_by: userId,
      })
      .select('id')
      .single()
    if (calendarError || !calendarEvent?.id) {
      throw new Error(`HVA Today coexistence calendar insert failed: ${calendarError?.message ?? 'missing inserted event'}`)
    }
    calendarEventId = calendarEvent.id

    return {
      restore,
      marker: fixtureSuffix,
    }
  } catch (setupError) {
    try {
      await restore()
    } catch (cleanupError) {
      throw new AggregateError([setupError, cleanupError], 'HVA Today coexistence setup failed and rollback was incomplete')
    }
    throw setupError
  }
}

function clockMinute(value) {
  const [hour, minute] = String(value ?? '').slice(0, 5).split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return Number.NaN
  return hour * 60 + minute
}

function clockText(value) {
  return String(value ?? '').slice(0, 5)
}
