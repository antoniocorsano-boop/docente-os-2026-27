import baselineConfig from '../../e2e/support/hva-governed-baseline-config.cjs'

const LEGACY_MARKER = 'HVA · Legacy recorded lesson · 2026-10-26 · B01'
const ASSIGNMENT_MARKER = 'HVA · Oggi · Cattedra canonica'
const CALENDAR_TITLE = 'HVA · Impegno collegiale canonico'
const FUTURE_START = '2026-10-27'
const FUTURE_END = '2026-11-08'

export async function createLiveProvisionAdapter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) throw new Error('HVA baseline provision requires Supabase URL and publishable key')
  const { authenticatedAal2Supabase } = await import('../../e2e/support/direct-aal2-supabase.mjs')
  const { supabase, userId } = await authenticatedAal2Supabase({ supabaseUrl: url, supabasePublishableKey: key, label: 'HVA-GOV-01 explicit baseline provisioner' })
  const { data: contexts, error } = await supabase.rpc('current_workspace_context')
  if (error) throw new Error(`workspace lookup failed: ${error.message}`)
  const context = contexts?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) throw new Error('current workspace and academic year required')
  let targetDraftId = null
  return {
    async readState() { const state = await readState(supabase, context); targetDraftId = state.versions.find((v) => v.status === 'DRAFT')?.id ?? null; return state },
    async updateDraftEffectiveFrom(versionId, effectiveFrom) { await updateDraft(supabase, context, versionId, effectiveFrom) },
    async restoreDraftEffectiveFrom(effectiveFrom) { await updateDraft(supabase, context, targetDraftId, effectiveFrom) },
    async insertLessonSlot({ versionId, assignment }) {
      const { data, error: e } = await supabase.from('timetable_slots').insert({ timetable_version_id: versionId, weekday: 1, start_time: '07:00', end_time: '08:00', slot_kind: 'LESSON', section_id: assignment.sectionId, discipline_id: assignment.disciplineId, teaching_assignment_id: assignment.id, activity_kind: null, ordinal: null, created_by: userId }).select('id').single()
      if (e || !data?.id) throw new Error(`07:00 lesson insert failed: ${e?.message ?? 'missing id'}`)
      return data.id
    },
    async insertCalendarEvent() {
      const { data, error: e } = await supabase.from('calendar_events').insert({ workspace_id: context.workspace_id, academic_year_id: context.academic_year_id, title: CALENDAR_TITLE, event_kind: 'MEETING', starts_on: baselineConfig.HVA_LOCAL_DATE, ends_on: baselineConfig.HVA_LOCAL_DATE, all_day: false, start_time: '10:30', end_time: '11:00', location: 'Aula docenti', note: 'Baseline tecnica HVA-GOV-01/v1', source_kind: 'MANUAL', source_ref: baselineConfig.HVA_CALENDAR_SOURCE_REF, source_knowledge_unit_id: null, created_by: userId }).select('id').single()
      if (e || !data?.id) throw new Error(`Calendar baseline insert failed: ${e?.message ?? 'missing id'}`)
      return data.id
    },
    async readPreparedState(draftId) { return readPrepared(supabase, context, draftId) },
    async activateDraft(draftId) { const { data, error: e } = await supabase.rpc('activate_timetable_version', { p_version_id: draftId }); if (e || !data?.[0]) throw new Error(`canonical timetable activation failed: ${e?.message ?? 'missing result'}`) },
    async readPostActivationState(plan) { return readPost(supabase, context, plan) },
    async deleteCalendarEvent(id) { await deleteExactlyOne(supabase.from('calendar_events').delete().eq('id', id).eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('source_ref', baselineConfig.HVA_CALENDAR_SOURCE_REF).select('id'), 'Calendar rollback') },
    async deleteLessonSlot(id) { await deleteExactlyOne(supabase.from('timetable_slots').delete().eq('id', id).eq('timetable_version_id', targetDraftId).select('id'), 'lesson-slot rollback') },
  }
}

async function updateDraft(supabase, context, id, effectiveFrom) {
  const { data, error } = await supabase.from('timetable_versions').update({ effective_from: effectiveFrom }).eq('id', id).eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('status', 'DRAFT').select('id')
  if (error || (data?.length ?? 0) !== 1) throw new Error(`DRAFT effective_from update failed: ${error?.message ?? 'unexpected row count'}`)
}

async function readState(supabase, context) {
  const queries = await Promise.all([
    supabase.from('timetable_versions').select('id,status,effective_from,effective_to').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).in('status', ['ACTIVE','DRAFT']),
    supabase.from('teaching_assignments').select('id,section_id,discipline_id,status,weekly_minutes,source_note').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('source_note', ASSIGNMENT_MARKER),
    supabase.from('annual_plan_sections').select('id,grade,section_code').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('teaching_disciplines').select('id,name').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id),
    supabase.from('teaching_sessions').select('id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).gte('local_date', FUTURE_START).lte('local_date', FUTURE_END),
    supabase.from('calendar_events').select('id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).gte('starts_on', FUTURE_START).lte('starts_on', FUTURE_END),
    supabase.from('calendar_days').select('id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).gte('local_date', FUTURE_START).lte('local_date', FUTURE_END),
    supabase.from('calendar_events').select('id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('source_ref', baselineConfig.HVA_CALENDAR_SOURCE_REF),
    supabase.from('teaching_sessions').select('id,source_timetable_version_id,source_timetable_slot_id').eq('workspace_id', context.workspace_id).eq('academic_year_id', context.academic_year_id).eq('evidence_note', LEGACY_MARKER),
  ])
  for (const r of queries) if (r.error) throw new Error(r.error.message)
  const [versions, assignments, sections, disciplines, sessions, calendar, days, baselineEvents, legacy] = queries
  const versionIds = (versions.data ?? []).map((v) => v.id)
  const slotResult = versionIds.length ? await supabase.from('timetable_slots').select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,teaching_assignment_id').in('timetable_version_id', versionIds) : { data: [], error: null }
  if (slotResult.error) throw new Error(slotResult.error.message)
  const sectionMap = new Map((sections.data ?? []).map((s) => [s.id, s]))
  const disciplineMap = new Map((disciplines.data ?? []).map((d) => [d.id, d]))
  return {
    workspaceId: context.workspace_id, academicYearId: context.academic_year_id,
    versions: (versions.data ?? []).map((v) => ({ id: v.id, status: v.status, effectiveFrom: v.effective_from, effectiveTo: v.effective_to })),
    slots: (slotResult.data ?? []).map((s) => ({ id: s.id, versionId: s.timetable_version_id, weekday: s.weekday, start: String(s.start_time).slice(0,5), end: String(s.end_time).slice(0,5), slotKind: s.slot_kind, assignmentId: s.teaching_assignment_id })),
    assignments: (assignments.data ?? []).map((a) => ({ id: a.id, sectionId: a.section_id, disciplineId: a.discipline_id, status: a.status, weeklyMinutes: a.weekly_minutes, sourceNote: a.source_note, classLabel: classLabel(sectionMap.get(a.section_id)), disciplineName: disciplineMap.get(a.discipline_id)?.name ?? null })),
    future: { teachingSessions: (sessions.data ?? []).length, calendarEvents: (calendar.data ?? []).length, calendarDays: (days.data ?? []).length },
    baselineCalendarCount: (baselineEvents.data ?? []).length,
    legacySessions: (legacy.data ?? []).map((s) => ({ id: s.id, sourceVersionId: s.source_timetable_version_id, sourceSlotId: s.source_timetable_slot_id })),
  }
}

async function readPrepared(supabase, context, draftId) {
  const [draft, slots, calendar] = await Promise.all([
    supabase.from('timetable_versions').select('id,status,effective_from').eq('id', draftId).maybeSingle(),
    supabase.from('timetable_slots').select('start_time,end_time,teaching_assignment_id').eq('timetable_version_id', draftId).eq('weekday',1).eq('slot_kind','LESSON'),
    supabase.from('calendar_events').select('id').eq('workspace_id',context.workspace_id).eq('academic_year_id',context.academic_year_id).eq('source_ref',baselineConfig.HVA_CALENDAR_SOURCE_REF),
  ])
  for (const r of [draft, slots, calendar]) if (r.error) throw new Error(r.error.message)
  const aid = (await readState(supabase, context)).assignments[0]?.id
  const count = (start, end) => (slots.data ?? []).filter((s) => String(s.start_time).slice(0,5) === start && String(s.end_time).slice(0,5) === end && s.teaching_assignment_id === aid).length
  return { draft: draft.data ? { id: draft.data.id, status: draft.data.status, effectiveFrom: draft.data.effective_from } : null, canonical07Count: count('07:00','08:00'), canonical08Count: count('08:00','09:00'), baselineCalendarCount: (calendar.data ?? []).length }
}

async function readPost(supabase, context, plan) {
  const [oldV,newV,legacy,events,superseding] = await Promise.all([
    supabase.from('timetable_versions').select('id,status,effective_to').eq('id',plan.oldActive.id).maybeSingle(),
    supabase.from('timetable_versions').select('id,status,effective_from').eq('id',plan.targetDraft.id).maybeSingle(),
    supabase.from('teaching_sessions').select('id,source_timetable_version_id,source_timetable_slot_id').eq('id',plan.legacyB01.sessionId).maybeSingle(),
    supabase.from('calendar_events').select('id').eq('workspace_id',context.workspace_id).eq('academic_year_id',context.academic_year_id).eq('source_ref',baselineConfig.HVA_CALENDAR_SOURCE_REF),
    supabase.from('teaching_sessions').select('id').eq('supersedes_session_id',plan.legacyB01.sessionId),
  ])
  for (const r of [oldV,newV,legacy,events,superseding]) if (r.error) throw new Error(r.error.message)
  return { oldActive: oldV.data ? { id: oldV.data.id, status: oldV.data.status, effectiveTo: oldV.data.effective_to } : null, newActive: newV.data ? { id: newV.data.id, status: newV.data.status, effectiveFrom: newV.data.effective_from } : null, legacyB01: legacy.data ? { sessionId: legacy.data.id, sourceVersionId: legacy.data.source_timetable_version_id, sourceSlotId: legacy.data.source_timetable_slot_id, supersededByCount: (superseding.data ?? []).length } : null, baselineCalendarCount: (events.data ?? []).length }
}

async function deleteExactlyOne(query, label) { const { data, error } = await query; if (error || (data?.length ?? 0) !== 1) throw new Error(`${label} failed: ${error?.message ?? 'unexpected row count'}`) }
function classLabel(section) { if (!section) return null; const n = section.grade === 'SECONDA' ? '2' : section.grade === 'PRIMA' ? '1' : section.grade === 'TERZA' ? '3' : section.grade; return `${n}${section.section_code}` }
