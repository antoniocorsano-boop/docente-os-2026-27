import { authenticatedAal2Supabase } from './direct-aal2-supabase.mjs'
import {
  HVA_TODAY_LOCAL_DATE,
  HVA_TODAY_WEEKDAY,
  assertHvaTodayRuntimeFixture,
} from './hva-today-fixture.mjs'

const SLOT_NOTE_PREFIX = 'HVA · Oggi · Task 9 coexistence'
const CALENDAR_SOURCE_PREFIX = 'hva:today-coexistence:'
const CANONICAL_NOW = '08:30:00'

export async function createHvaTodayCoexistenceFixture({ suffix }) {
  const fixtureSuffix = String(suffix ?? '').trim()
  if (!fixtureSuffix) throw new Error('HVA Today coexistence fixture requires a unique suffix')

  await assertHvaTodayRuntimeFixture()

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

  const { data: activeVersions, error: versionError } = await supabase
    .from('timetable_versions')
    .select('id,status,effective_from,effective_to')
    .eq('workspace_id', current.workspace_id)
    .eq('academic_year_id', current.academic_year_id)
    .eq('status', 'ACTIVE')
    .lte('effective_from', HVA_TODAY_LOCAL_DATE)
  if (versionError) throw new Error(`HVA Today coexistence timetable lookup failed: ${versionError.message}`)

  const eligibleVersions = (activeVersions ?? []).filter(
    (version) => !version.effective_to || version.effective_to >= HVA_TODAY_LOCAL_DATE,
  )
  if (eligibleVersions.length !== 1) {
    throw new Error(`HVA Today coexistence expected exactly one ACTIVE timetable, found ${eligibleVersions.length}`)
  }
  const activeVersion = eligibleVersions[0]

  const { data: currentSlots, error: slotError } = await supabase
    .from('timetable_slots')
    .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id,room,ordinal,activity_kind')
    .eq('timetable_version_id', activeVersion.id)
    .eq('weekday', HVA_TODAY_WEEKDAY)
    .eq('slot_kind', 'LESSON')
    .lte('start_time', CANONICAL_NOW)
    .gt('end_time', CANONICAL_NOW)
  if (slotError) throw new Error(`HVA Today coexistence slot lookup failed: ${slotError.message}`)
  if ((currentSlots?.length ?? 0) !== 1) {
    throw new Error(`HVA Today coexistence expected one canonical current slot, found ${currentSlots?.length ?? 0}`)
  }
  const canonicalSlot = currentSlots[0]

  const sourceRef = `${CALENDAR_SOURCE_PREFIX}${fixtureSuffix}`
  const slotNote = `${SLOT_NOTE_PREFIX} · ${fixtureSuffix}`
  const [staleSlotResult, staleEventResult] = await Promise.all([
    supabase
      .from('timetable_slots')
      .select('id')
      .eq('timetable_version_id', activeVersion.id)
      .like('note', `${SLOT_NOTE_PREFIX}%`),
    supabase
      .from('calendar_events')
      .select('id')
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id)
      .like('source_ref', `${CALENDAR_SOURCE_PREFIX}%`),
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

    return { restore, marker: fixtureSuffix }
  } catch (setupError) {
    try {
      await restore()
    } catch (cleanupError) {
      throw new AggregateError([setupError, cleanupError], 'HVA Today coexistence setup failed and rollback was incomplete')
    }
    throw setupError
  }
}

function clockText(value) {
  return String(value ?? '').slice(0, 5)
}
