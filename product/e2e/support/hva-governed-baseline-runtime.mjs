import baselineConfig from './hva-governed-baseline-config.cjs'
import {
  fingerprintHvaBaselineSnapshot,
  projectHvaBaselineSnapshot,
  validateHvaBaselineSnapshot,
} from './hva-governed-baseline-contract.mjs'
import { assertHvaRecordedLessonFixture } from './hva-recorded-lesson-fixture.mjs'

export async function readHvaGovernedBaselineRuntime() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('HVA governed baseline read requires Supabase URL and publishable key')
  const { authenticatedAal2Supabase } = await import('./direct-aal2-supabase.mjs')
  const { supabase } = await authenticatedAal2Supabase({ supabaseUrl, supabasePublishableKey, label: 'HVA governed baseline read-only scanner' })
  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`HVA governed baseline workspace lookup failed: ${contextError.message}`)
  const context = contexts?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) throw new Error('HVA governed baseline requires current workspace and academic year')

  const [disciplinesResult, sectionsResult, assignmentsResult, versionsResult, sessionsResult, calendarResult] = await Promise.all([
    supabase.from('teaching_disciplines').select('id,name,is_active').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('annual_plan_sections').select('id,grade,section_code').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('teaching_assignments').select('id,section_id,discipline_id,status,weekly_minutes,source_note').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('timetable_versions').select('id,status,effective_from,effective_to').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('teaching_sessions').select('id,section_id,local_date,projected_occurrence_logical_id,source_timetable_version_id,source_timetable_slot_id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('local_date', baselineConfig.HVA_LOCAL_DATE),
    supabase.from('calendar_events').select('id,title,event_kind,starts_on,ends_on,all_day,start_time,end_time,source_kind,source_ref').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('starts_on', baselineConfig.HVA_LOCAL_DATE),
  ])
  for (const [label, result] of [['disciplines', disciplinesResult], ['sections', sectionsResult], ['assignments', assignmentsResult], ['versions', versionsResult], ['sessions', sessionsResult], ['calendar', calendarResult]]) {
    if (result.error) throw new Error(`HVA governed baseline ${label} lookup failed: ${result.error.message}`)
  }
  const versionIds = (versionsResult.data ?? []).map((row) => row.id)
  let slots = []
  if (versionIds.length) {
    const result = await supabase.from('timetable_slots').select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id').in('timetable_version_id', versionIds)
    if (result.error) throw new Error(`HVA governed baseline slots lookup failed: ${result.error.message}`)
    slots = result.data ?? []
  }
  const snapshot = projectHvaBaselineSnapshot({
    disciplines: disciplinesResult.data ?? [], sections: sectionsResult.data ?? [], assignments: assignmentsResult.data ?? [],
    versions: versionsResult.data ?? [], slots, sessions: sessionsResult.data ?? [], calendarEvents: calendarResult.data ?? [],
  })
  const activeVersion = (versionsResult.data ?? []).find((version) => version.status === 'ACTIVE' && version.effective_from <= baselineConfig.HVA_LOCAL_DATE && (!version.effective_to || version.effective_to >= baselineConfig.HVA_LOCAL_DATE)) ?? null
  let persistentFixtureIntegrity = 'PASS'
  let persistentFixtureDiagnostics = []
  try { await assertHvaRecordedLessonFixture() } catch (error) {
    persistentFixtureIntegrity = 'FAIL_FIXTURE_DRIFT'
    persistentFixtureDiagnostics = [String(error instanceof Error ? error.message : error)]
  }
  return {
    snapshot,
    fingerprint: fingerprintHvaBaselineSnapshot(snapshot),
    runtimeIds: { workspaceId: context.workspace_id, academicYearId: context.academic_year_id, activeVersionId: activeVersion?.id ?? null },
    baselineErrors: validateHvaBaselineSnapshot(snapshot),
    persistentFixtureIntegrity,
    persistentFixtureDiagnostics,
  }
}
