import { createClient } from '@supabase/supabase-js'
import { E2E_EMAIL, E2E_PASSWORD, requireE2ECredentials } from './e2e-auth.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for lesson-register timing fixture setup')
}

const CANDIDATE_SLOTS = [
  ['08:00:00', '09:00:00'],
  ['09:00:00', '10:00:00'],
  ['10:00:00', '11:00:00'],
  ['11:00:00', '12:00:00'],
  ['12:00:00', '13:00:00'],
  ['13:00:00', '14:00:00'],
]

export async function createDraftLessonTimingFixture({ sectionId, targetDate }) {
  const { supabase, userId } = await authenticatedClient()

  const { data: section, error: sectionError } = await supabase
    .from('annual_plan_sections')
    .select('id, workspace_id, academic_year_id')
    .eq('id', sectionId)
    .single()
  if (sectionError || !section) {
    throw new Error(`Lesson-register fixture section lookup failed: ${sectionError?.message ?? sectionId}`)
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('teaching_assignments')
    .select('id, discipline_id')
    .eq('section_id', sectionId)
    .limit(1)
    .maybeSingle()
  if (assignmentError || !assignment) {
    throw new Error(`Lesson-register fixture requires an existing teaching assignment: ${assignmentError?.message ?? sectionId}`)
  }

  const { data: version, error: versionError } = await supabase
    .from('timetable_versions')
    .select('id')
    .eq('workspace_id', section.workspace_id)
    .eq('academic_year_id', section.academic_year_id)
    .eq('status', 'DRAFT')
    .single()
  if (versionError || !version) {
    throw new Error(`Lesson-register fixture requires the workspace DRAFT timetable: ${versionError?.message ?? sectionId}`)
  }

  const weekday = weekdayFromIsoDate(targetDate)
  const { data: existing, error: slotsError } = await supabase
    .from('timetable_slots')
    .select('start_time, end_time')
    .eq('timetable_version_id', version.id)
    .eq('weekday', weekday)
  if (slotsError) throw new Error(`Lesson-register fixture slot lookup failed: ${slotsError.message}`)

  const candidate = CANDIDATE_SLOTS.find(([start, end]) =>
    !(existing ?? []).some((slot) => start < slot.end_time && end > slot.start_time),
  )
  if (!candidate) throw new Error(`Lesson-register fixture found no free school-hour slot for weekday ${weekday}`)

  const [startTime, endTime] = candidate
  const { data: slot, error: insertError } = await supabase
    .from('timetable_slots')
    .insert({
      timetable_version_id: version.id,
      weekday,
      start_time: startTime,
      end_time: endTime,
      slot_kind: 'LESSON',
      section_id: section.id,
      discipline_id: assignment.discipline_id,
      teaching_assignment_id: assignment.id,
      note: 'HVA temporaneo · registro lezione',
      created_by: userId,
    })
    .select('id')
    .single()
  if (insertError || !slot) {
    throw new Error(`Lesson-register fixture slot insert failed: ${insertError?.message ?? 'missing slot'}`)
  }

  return {
    slotId: slot.id,
    startLabel: startTime.slice(0, 5),
    endLabel: endTime.slice(0, 5),
  }
}

export async function deleteDraftLessonTimingFixture(slotId) {
  if (!slotId) return
  const { supabase } = await authenticatedClient()
  const { error } = await supabase.from('timetable_slots').delete().eq('id', slotId)
  if (error) throw new Error(`Lesson-register fixture slot cleanup failed: ${error.message}`)
}

async function authenticatedClient() {
  requireE2ECredentials()
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
  })
  if (error || !data.user) {
    throw new Error(`Lesson-register fixture identity failed: ${error?.message ?? 'missing user'}`)
  }
  return { supabase, userId: data.user.id }
}

function weekdayFromIsoDate(value) {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay()
  if (day < 1 || day > 6) throw new Error(`Lesson-register fixture requires a school day, got ${value}`)
  return day
}
