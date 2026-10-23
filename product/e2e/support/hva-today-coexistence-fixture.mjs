import {
  HVA_TODAY_LOCAL_DATE,
  HVA_TODAY_WEEKDAY,
  assertHvaTodayRuntimeFixture,
} from './hva-today-fixture.mjs'

const CALENDAR_SOURCE_PREFIX = 'hva:today-coexistence:'
const CANONICAL_NOW = '08:30:00'

export function validateHvaTodayCoexistence(input) {
  const slots = input.slots ?? []
  const sessions = input.sessions ?? []
  const errors = []

  const mondayLessons = slots
    .filter((slot) => slot.weekday === HVA_TODAY_WEEKDAY && slot.slot_kind === 'LESSON')
    .sort((first, second) => clockMinute(first.start_time) - clockMinute(second.start_time) || String(first.id).localeCompare(String(second.id)))

  const current = mondayLessons.filter((slot) =>
    clockMinute(slot.start_time) <= clockMinute(CANONICAL_NOW)
    && clockMinute(slot.end_time) > clockMinute(CANONICAL_NOW),
  )
  if (current.length !== 1) {
    errors.push(`expected exactly one canonical current lesson at 08:30, found ${current.length}`)
    return errors
  }

  const priorUnregistered = mondayLessons.filter((slot) =>
    clockMinute(slot.end_time) <= clockMinute(CANONICAL_NOW)
    && !isRecorded(slot, sessions),
  )
  if (!priorUnregistered.length) {
    errors.push('governed ACTIVE timetable does not expose a prior unregistered lesson before the canonical 08:30 lesson')
  }

  return errors
}

export async function createHvaTodayCoexistenceFixture({ suffix }) {
  const fixtureSuffix = String(suffix ?? '').trim()
  if (!fixtureSuffix) throw new Error('HVA Today coexistence fixture requires a unique suffix')

  await assertHvaTodayRuntimeFixture()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('HVA Today coexistence fixture requires Supabase URL and publishable key')
  }

  const { authenticatedAal2Supabase } = await import('./direct-aal2-supabase.mjs')
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
    throw new Error(`HVA-JOURNEY-UNVERIFIED: expected exactly one governed ACTIVE timetable on ${HVA_TODAY_LOCAL_DATE}, found ${eligibleVersions.length}`)
  }
  const activeVersion = eligibleVersions[0]

  const { data: slots, error: slotError } = await supabase
    .from('timetable_slots')
    .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id')
    .eq('timetable_version_id', activeVersion.id)
    .eq('weekday', HVA_TODAY_WEEKDAY)
    .eq('slot_kind', 'LESSON')
  if (slotError) throw new Error(`HVA Today coexistence slot lookup failed: ${slotError.message}`)

  const { data: sessions, error: sessionError } = await supabase
    .from('teaching_sessions')
    .select('section_id,local_date,projected_occurrence_logical_id,source_timetable_slot_id')
    .eq('workspace_id', current.workspace_id)
    .eq('academic_year_id', current.academic_year_id)
    .eq('local_date', HVA_TODAY_LOCAL_DATE)
  if (sessionError) throw new Error(`HVA Today coexistence session lookup failed: ${sessionError.message}`)

  const coexistenceErrors = validateHvaTodayCoexistence({
    slots: slots ?? [],
    sessions: sessions ?? [],
  })
  if (coexistenceErrors.length) {
    throw new Error(
      `HVA-JOURNEY-UNVERIFIED: authenticated browser evidence requires a naturally governed pending lesson plus the canonical current/upcoming lesson; ACTIVE timetable left unchanged.\n- ${coexistenceErrors.join('\n- ')}`,
    )
  }

  const sourceRef = `${CALENDAR_SOURCE_PREFIX}${fixtureSuffix}`
  const { data: staleEvents, error: staleEventError } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('workspace_id', current.workspace_id)
    .eq('academic_year_id', current.academic_year_id)
    .like('source_ref', `${CALENDAR_SOURCE_PREFIX}%`)
  if (staleEventError) throw new Error(`HVA Today coexistence stale-event check failed: ${staleEventError.message}`)
  if ((staleEvents?.length ?? 0) > 0) {
    throw new Error('HVA Today coexistence found stale fixture-owned Calendar records; refusing to continue')
  }

  let calendarEventId = null
  const restore = async () => {
    if (!calendarEventId) return
    const { data, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', calendarEventId)
      .eq('workspace_id', current.workspace_id)
      .eq('academic_year_id', current.academic_year_id)
      .eq('source_ref', sourceRef)
      .select('id')
    if (error) throw new Error(`HVA Today coexistence Calendar cleanup failed: ${error.message}`)
    if ((data?.length ?? 0) !== 1) {
      throw new Error('HVA Today coexistence Calendar cleanup did not delete exactly one fixture-owned row')
    }
    calendarEventId = null
  }

  try {
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
      throw new Error(`HVA Today coexistence Calendar insert failed: ${calendarError?.message ?? 'missing inserted event'}`)
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

function isRecorded(slot, sessions) {
  const occurrenceLogicalId = `tt:${slot.timetable_version_id}:${slot.id}:${HVA_TODAY_LOCAL_DATE}`
  return sessions.some((session) => {
    if (session.local_date !== HVA_TODAY_LOCAL_DATE) return false
    if (slot.section_id && session.section_id !== slot.section_id) return false
    return session.source_timetable_slot_id === slot.id
      || session.projected_occurrence_logical_id === occurrenceLogicalId
  })
}

function clockMinute(value) {
  const [hour, minute] = String(value ?? '').slice(0, 5).split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return Number.NaN
  return hour * 60 + minute
}
