import baselineConfig from './hva-governed-baseline-config.cjs'
import {
  HVA_CANONICAL_ASSIGNMENT_NOTE,
  HVA_CANONICAL_DISCIPLINE,
  validateHvaTodayFixtureInput,
} from './hva-governed-baseline-contract.mjs'

export const HVA_TODAY_DISCIPLINE_NAME = HVA_CANONICAL_DISCIPLINE
export const HVA_TODAY_ASSIGNMENT_NOTE = HVA_CANONICAL_ASSIGNMENT_NOTE
export const HVA_TODAY_LOCAL_DATE = baselineConfig.HVA_LOCAL_DATE
export const HVA_TODAY_WEEKDAY = baselineConfig.HVA_WEEKDAY
export const HVA_TODAY_MINUTE_OF_DAY = baselineConfig.HVA_MINUTE_OF_DAY

export function validateHvaTodayFixture(input) {
  return validateHvaTodayFixtureInput(input)
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
