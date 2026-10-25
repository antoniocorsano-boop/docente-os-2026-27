import { createRequire } from 'node:module'

import {
  fingerprintHvaBaselineSnapshot,
  projectHvaBaselineSnapshot,
  validateHvaBaselineSnapshot,
} from './hva-governed-baseline-contract.mjs'

const require = createRequire(import.meta.url)
const {
  HVA_CALENDAR_SOURCE_REF,
  HVA_LOCAL_DATE,
} = require('./hva-governed-baseline-config.cjs')

export async function readHvaGovernedBaselineRuntime() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('HVA governed baseline runtime requires Supabase URL and publishable key')
  }

  const { authenticatedAal2Supabase } = await import('./direct-aal2-supabase.mjs')
  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'HVA governed baseline runtime scanner',
  })

  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`HVA governed baseline workspace lookup failed: ${contextError.message}`)
  const context = contexts?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('HVA governed baseline runtime requires a current workspace and academic year')
  }

  const [
    sectionsResult,
    disciplinesResult,
    assignmentsResult,
    versionsResult,
    sessionsResult,
    calendarResult,
  ] = await Promise.all([
    supabase
      .from('annual_plan_sections')
      .select('id,grade,section_code')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id),
    supabase
      .from('teaching_disciplines')
      .select('id,name,is_active')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id),
    supabase
      .from('teaching_assignments')
      .select('id,section_id,discipline_id,status,weekly_minutes,source_note')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id),
    supabase
      .from('timetable_versions')
      .select('id,status,effective_from,effective_to')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id),
    supabase
      .from('teaching_sessions')
      .select('id,section_id,local_date,projected_occurrence_logical_id,source_timetable_version_id,source_timetable_slot_id')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id)
      .eq('local_date', HVA_LOCAL_DATE),
    supabase
      .from('calendar_events')
      .select('id,starts_on,start_time,end_time,event_kind,source_ref')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id)
      .eq('source_ref', HVA_CALENDAR_SOURCE_REF),
  ])

  assertQuery(sectionsResult, 'section')
  assertQuery(disciplinesResult, 'discipline')
  assertQuery(assignmentsResult, 'assignment')
  assertQuery(versionsResult, 'timetable version')
  assertQuery(sessionsResult, 'TeachingSession')
  assertQuery(calendarResult, 'Calendar event')

  const versions = versionsResult.data ?? []
  const versionIds = versions.map((version) => version.id).filter(Boolean)
  let slots = []
  if (versionIds.length) {
    const slotResult = await supabase
      .from('timetable_slots')
      .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id')
      .in('timetable_version_id', versionIds)
    assertQuery(slotResult, 'timetable slot')
    slots = slotResult.data ?? []
  }

  const snapshot = projectHvaBaselineSnapshot({
    sections: sectionsResult.data ?? [],
    disciplines: disciplinesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    versions,
    slots,
    sessions: sessionsResult.data ?? [],
    calendarEvents: calendarResult.data ?? [],
  })
  const baselineErrors = validateHvaBaselineSnapshot(snapshot)
  const fingerprint = fingerprintHvaBaselineSnapshot(snapshot)
  const activeVersionIds = snapshot.diagnostics?.activeVersionIds ?? []

  const persistentFixtureIntegrity = await readPersistentFixtureIntegrity()

  return {
    snapshot,
    fingerprint,
    runtimeIds: {
      workspaceId: context.workspace_id,
      academicYearId: context.academic_year_id,
      activeTimetableVersionId: activeVersionIds.length === 1 ? activeVersionIds[0] : null,
      activeTimetableVersionIds: [...activeVersionIds],
      assignmentIds: [...(snapshot.diagnostics?.assignmentIds ?? [])],
      mondayLessonIds: [...(snapshot.diagnostics?.mondayLessonIds ?? [])],
      calendarEventIds: [...(snapshot.diagnostics?.calendarEventIds ?? [])],
      baselineErrorCount: baselineErrors.length,
    },
    persistentFixtureIntegrity,
  }
}

async function readPersistentFixtureIntegrity() {
  try {
    const { assertHvaRecordedLessonFixture } = await import('./hva-recorded-lesson-fixture.mjs')
    const fixture = await assertHvaRecordedLessonFixture()
    return {
      status: 'PASS',
      errors: [],
      sessionId: fixture.sessionId,
      sourceTimetableVersionId: fixture.sourceTimetableVersionId,
      sourceTimetableSlotId: fixture.sourceTimetableSlotId,
      localDate: fixture.localDate,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes('HVA recorded lesson fixture provenance failed')
      || message.includes('HVA recorded lesson fixture is missing')
    ) {
      return {
        status: 'FAIL',
        errors: [message],
      }
    }
    throw error
  }
}

function assertQuery(result, label) {
  if (result.error) {
    throw new Error(`HVA governed baseline ${label} lookup failed: ${result.error.message}`)
  }
}
