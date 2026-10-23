export const HVA_TODAY_DISCIPLINE_NAME = 'Tecnologia'
export const HVA_TODAY_ASSIGNMENT_NOTE = 'HVA · Oggi · Cattedra canonica'
export const HVA_TODAY_LOCAL_DATE = '2026-10-19'
export const HVA_TODAY_WEEKDAY = 1
export const HVA_TODAY_MINUTE_OF_DAY = 8 * 60 + 30

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

  const { authenticatedAal2Supabase } = await import('./direct-aal2-supabase.mjs')
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

function clockMinute(value) {
  const [hour, minute] = String(value ?? '').slice(0, 5).split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return Number.NaN
  return hour * 60 + minute
}
