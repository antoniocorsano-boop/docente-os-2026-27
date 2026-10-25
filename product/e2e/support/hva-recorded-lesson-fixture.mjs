import { authenticatedAal2Supabase } from './direct-aal2-supabase.mjs'

export const HVA_RECORDED_LESSON_DATE = '2026-10-26'
export const HVA_RECORDED_LESSON_BLOCK = 'B01'
export const HVA_RECORDED_LESSON_MARKER = 'HVA · Legacy recorded lesson · 2026-10-26 · B01'

export function validateHvaRecordedLessonFixtureState(input = {}) {
  const sessions = (input.sessions ?? []).filter((session) =>
    session.local_date === HVA_RECORDED_LESSON_DATE
    && session.evidence_note === HVA_RECORDED_LESSON_MARKER,
  )
  const allocations = input.allocations ?? []
  const sections = input.sections ?? []
  const versions = input.versions ?? []
  const slots = input.slots ?? []
  const errors = []

  if (sessions.length !== 1) {
    errors.push(`HVA recorded lesson fixture requires exactly one fixture record, found ${sessions.length}`)
    return errors
  }

  const session = sessions[0]
  if (!session.source_timetable_version_id || !session.source_timetable_slot_id || !session.projected_occurrence_logical_id) {
    errors.push('HVA recorded lesson fixture must remain occurrence-bound')
    return errors
  }

  const fixtureAllocations = allocations.filter((allocation) =>
    allocation.session_id === session.id && allocation.block_id === HVA_RECORDED_LESSON_BLOCK,
  )
  if (fixtureAllocations.length !== 1) {
    errors.push(`HVA recorded lesson fixture requires exactly one ${HVA_RECORDED_LESSON_BLOCK} allocation`)
  } else if (fixtureAllocations[0].minutes !== 60) {
    errors.push(`HVA recorded lesson fixture ${HVA_RECORDED_LESSON_BLOCK} allocation must be 60 minutes`)
  }

  const section = sections.find((candidate) => candidate.id === session.section_id) ?? null
  if (!section?.section_code) {
    errors.push('HVA recorded lesson fixture section is unavailable')
  }

  const sourceVersion = versions.find((version) => version.id === session.source_timetable_version_id) ?? null
  if (!sourceVersion) {
    errors.push('HVA recorded lesson fixture source timetable version is missing')
  } else {
    const coversRecordedDate = sourceVersion.effective_from <= HVA_RECORDED_LESSON_DATE
      && (!sourceVersion.effective_to || sourceVersion.effective_to >= HVA_RECORDED_LESSON_DATE)
    if (!coversRecordedDate) {
      errors.push(`HVA recorded lesson fixture source timetable version must cover ${HVA_RECORDED_LESSON_DATE}`)
    }
    if (!['ACTIVE', 'ARCHIVED'].includes(sourceVersion.status)) {
      errors.push('HVA recorded lesson fixture source timetable version must be ACTIVE or ARCHIVED')
    }
  }

  const sourceSlot = slots.find((slot) => slot.id === session.source_timetable_slot_id) ?? null
  if (!sourceSlot) {
    errors.push('HVA recorded lesson fixture source timetable slot is missing')
  } else {
    if (sourceSlot.timetable_version_id !== session.source_timetable_version_id) {
      errors.push('HVA recorded lesson fixture source timetable slot must belong to the recorded source version')
    }
    if (
      sourceSlot.weekday !== 1
      || sourceSlot.slot_kind !== 'LESSON'
      || sourceSlot.start_time?.slice(0, 5) !== '08:00'
      || sourceSlot.end_time?.slice(0, 5) !== '09:00'
    ) {
      errors.push('HVA recorded lesson fixture source timetable slot must be the canonical Monday 08:00–09:00 lesson')
    }
    if (sourceSlot.section_id && sourceSlot.section_id !== session.section_id) {
      errors.push('HVA recorded lesson fixture source timetable slot must belong to the recorded section')
    }
  }

  return errors
}

export async function ensureHvaRecordedLessonFixture() {
  const client = await fixtureClient('HVA recorded lesson provisioning')
  const existing = await readFixture(client.supabase, client.context)
  if (existing) return existing

  const [versionsResult, sectionsResult, bindingsResult] = await Promise.all([
    client.supabase
      .from('timetable_versions')
      .select('id,status,effective_from,effective_to')
      .eq('workspace_id', client.context.workspace_id)
      .eq('academic_year_id', client.context.academic_year_id),
    client.supabase
      .from('annual_plan_sections')
      .select('id,grade,section_code')
      .eq('workspace_id', client.context.workspace_id)
      .eq('academic_year_id', client.context.academic_year_id),
    client.supabase
      .from('canonical_plan_runtime_bindings')
      .select('canonical_plan_code,asset_id,generation_id')
      .eq('workspace_id', client.context.workspace_id)
      .eq('academic_year_id', client.context.academic_year_id)
      .eq('canonical_plan_code', 'CAN-PLAN-2'),
  ])
  if (versionsResult.error) throw new Error(`HVA recorded fixture timetable lookup failed: ${versionsResult.error.message}`)
  if (sectionsResult.error) throw new Error(`HVA recorded fixture section lookup failed: ${sectionsResult.error.message}`)
  if (bindingsResult.error) throw new Error(`HVA recorded fixture plan binding lookup failed: ${bindingsResult.error.message}`)

  const versions = (versionsResult.data ?? []).filter((version) =>
    version.status !== 'DRAFT'
    && version.effective_from <= HVA_RECORDED_LESSON_DATE
    && (!version.effective_to || version.effective_to >= HVA_RECORDED_LESSON_DATE),
  ).sort((a, b) => b.effective_from.localeCompare(a.effective_from) || a.id.localeCompare(b.id))
  const version = versions[0] ?? null
  if (!version) throw new Error(`HVA recorded fixture has no timetable in force on ${HVA_RECORDED_LESSON_DATE}`)

  const { data: slotRows, error: slotsError } = await client.supabase
    .from('timetable_slots')
    .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id')
    .eq('timetable_version_id', version.id)
    .eq('weekday', 1)
    .eq('slot_kind', 'LESSON')
  if (slotsError) throw new Error(`HVA recorded fixture slot lookup failed: ${slotsError.message}`)

  const slots = (slotRows ?? []).filter((slot) =>
    slot.start_time?.slice(0, 5) === '08:00'
    && slot.end_time?.slice(0, 5) === '09:00',
  )
  if (slots.length !== 1) {
    throw new Error(`HVA recorded fixture requires exactly one Monday 08:00–09:00 lesson, found ${slots.length}`)
  }
  const slot = slots[0]
  if (!slot.section_id || !slot.discipline_id) {
    throw new Error('HVA recorded fixture lesson must expose canonical section and discipline ids')
  }

  const section = (sectionsResult.data ?? []).find((candidate) => candidate.id === slot.section_id)
  if (!section || section.grade !== 'SECONDA') {
    throw new Error('HVA recorded fixture Monday lesson must belong to a second-grade section')
  }

  const bindings = bindingsResult.data ?? []
  if (bindings.length !== 1) {
    throw new Error(`HVA recorded fixture requires exactly one CAN-PLAN-2 binding, found ${bindings.length}`)
  }
  const binding = bindings[0]
  const occurrenceLogicalId = `tt:${version.id}:${slot.id}:${HVA_RECORDED_LESSON_DATE}`

  const { data: sessionId, error: recordError } = await client.supabase.rpc('record_teaching_session', {
    target_workspace_id: client.context.workspace_id,
    target_academic_year_id: client.context.academic_year_id,
    target_section_id: slot.section_id,
    target_discipline_id: slot.discipline_id,
    target_local_date: HVA_RECORDED_LESSON_DATE,
    target_planned_start_time: '08:00',
    target_planned_end_time: '09:00',
    target_planned_minutes: 60,
    target_actual_minutes: 60,
    target_evidence_note: HVA_RECORDED_LESSON_MARKER,
    target_source_kind: 'PROJECTED_OCCURRENCE',
    target_projected_occurrence_logical_id: occurrenceLogicalId,
    target_source_timetable_version_id: version.id,
    target_source_timetable_slot_id: slot.id,
    target_source_calendar_state: 'UNDETERMINED',
    target_source_provenance: [
      `timetable_version:${version.id}`,
      `timetable_slot:${slot.id}`,
      `calendar_state:undetermined:${HVA_RECORDED_LESSON_DATE}`,
      'hva_fixture:legacy-recorded-b01',
    ],
    target_supersedes_session_id: null,
    target_allocations: [{
      block_id: HVA_RECORDED_LESSON_BLOCK,
      minutes: 60,
      canonical_plan_asset_id: binding.asset_id,
      canonical_generation_id: binding.generation_id,
    }],
  })
  if (recordError) throw new Error(`HVA recorded fixture provisioning failed: ${recordError.message}`)
  if (!sessionId) throw new Error('HVA recorded fixture provisioning returned no session id')

  const created = await readFixture(client.supabase, client.context)
  if (!created || created.sessionId !== sessionId) {
    throw new Error('HVA recorded fixture receipt cannot be read back deterministically')
  }
  process.stdout.write(`HVA recorded lesson fixture ready: ${created.localDate} · ${created.classLabel} · ${HVA_RECORDED_LESSON_BLOCK}\n`)
  return created
}

export async function assertHvaRecordedLessonFixture() {
  const client = await fixtureClient('HVA recorded lesson assertion')
  const fixture = await readFixture(client.supabase, client.context)
  if (!fixture) {
    throw new Error('HVA recorded lesson fixture is missing; governed HVA does not provision or repair it')
  }
  process.stdout.write(`HVA recorded lesson fixture PASS: ${fixture.localDate} · ${fixture.classLabel} · ${HVA_RECORDED_LESSON_BLOCK}\n`)
  return fixture
}

export async function readHvaRecordedLessonFixture() {
  const client = await fixtureClient('HVA recorded lesson read')
  const fixture = await readFixture(client.supabase, client.context)
  if (!fixture) {
    throw new Error('HVA recorded lesson fixture is missing')
  }
  return fixture
}

async function readFixture(supabase, context) {
  const { data: sessions, error: sessionsError } = await supabase
    .from('teaching_sessions')
    .select('id,section_id,local_date,projected_occurrence_logical_id,source_timetable_version_id,source_timetable_slot_id,evidence_note')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('evidence_note', HVA_RECORDED_LESSON_MARKER)
  if (sessionsError) throw new Error(`HVA recorded fixture session lookup failed: ${sessionsError.message}`)
  if ((sessions ?? []).length === 0) return null

  const session = sessions?.[0] ?? null
  const sourceVersionId = session?.source_timetable_version_id ?? null
  const sourceSlotId = session?.source_timetable_slot_id ?? null

  const [allocationsResult, sectionsResult, versionsResult, slotsResult] = await Promise.all([
    supabase
      .from('teaching_session_allocations')
      .select('id,session_id,block_id,minutes')
      .in('session_id', (sessions ?? []).map((candidate) => candidate.id)),
    supabase
      .from('annual_plan_sections')
      .select('id,grade,section_code')
      .in('id', [...new Set((sessions ?? []).map((candidate) => candidate.section_id).filter(Boolean))]),
    sourceVersionId
      ? supabase
          .from('timetable_versions')
          .select('id,status,effective_from,effective_to')
          .eq('id', sourceVersionId)
      : Promise.resolve({ data: [], error: null }),
    sourceSlotId
      ? supabase
          .from('timetable_slots')
          .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id')
          .eq('id', sourceSlotId)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (allocationsResult.error) throw new Error(`HVA recorded fixture allocation lookup failed: ${allocationsResult.error.message}`)
  if (sectionsResult.error) throw new Error(`HVA recorded fixture section read failed: ${sectionsResult.error.message}`)
  if (versionsResult.error) throw new Error(`HVA recorded fixture source timetable version read failed: ${versionsResult.error.message}`)
  if (slotsResult.error) throw new Error(`HVA recorded fixture source timetable slot read failed: ${slotsResult.error.message}`)

  const state = {
    sessions: sessions ?? [],
    allocations: allocationsResult.data ?? [],
    sections: sectionsResult.data ?? [],
    versions: versionsResult.data ?? [],
    slots: slotsResult.data ?? [],
  }
  const errors = validateHvaRecordedLessonFixtureState(state)
  if (errors.length) {
    throw new Error(`HVA recorded lesson fixture provenance failed:\n- ${errors.join('\n- ')}`)
  }

  const section = state.sections.find((candidate) => candidate.id === session.section_id)
  return {
    sessionId: session.id,
    sectionId: session.section_id,
    classLabel: section.grade === 'SECONDA' ? `2ª ${section.section_code}` : section.section_code,
    localDate: session.local_date,
    occurrenceLogicalId: session.projected_occurrence_logical_id,
    sourceTimetableVersionId: session.source_timetable_version_id,
    sourceTimetableSlotId: session.source_timetable_slot_id,
  }
}

async function fixtureClient(label) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(`${label} requires Supabase URL and publishable key`)
  }

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label,
  })
  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`${label} workspace lookup failed: ${contextError.message}`)
  const context = contexts?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error(`${label} requires a current workspace and academic year`)
  }
  return { supabase, context }
}
