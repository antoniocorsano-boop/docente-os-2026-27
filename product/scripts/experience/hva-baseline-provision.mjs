import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import baselineConfig from '../../e2e/support/hva-governed-baseline-config.cjs'

const ASSIGNMENT_MARKER = 'HVA · Oggi · Cattedra canonica'

export function stateFingerprint(state) {
  return sha(canonical(normalizeState(state)))
}

export function createProvisionPlanFromState(state) {
  const errors = validatePreconditions(state)
  if (errors.length) throw new Error(`HVA baseline dry-run precondition failed:\n- ${errors.join('\n- ')}`)
  const active = state.versions.find((v) => v.status === 'ACTIVE')
  const draft = state.versions.find((v) => v.status === 'DRAFT')
  const assignment = state.assignments.find((a) => a.sourceNote === ASSIGNMENT_MARKER)
  const legacy = state.legacySessions[0]
  const body = {
    schemaVersion: 1,
    baselineId: baselineConfig.HVA_BASELINE_ID,
    preconditionFingerprint: stateFingerprint(state),
    workspaceId: state.workspaceId,
    academicYearId: state.academicYearId,
    oldActive: { id: active.id, effectiveFrom: active.effectiveFrom },
    targetDraft: { id: draft.id, previousEffectiveFrom: draft.effectiveFrom, nextEffectiveFrom: baselineConfig.HVA_EFFECTIVE_FROM },
    canonicalAssignment: { id: assignment.id, sectionId: assignment.sectionId, disciplineId: assignment.disciplineId },
    legacyB01: { sessionId: legacy.id, sourceVersionId: legacy.sourceVersionId, sourceSlotId: legacy.sourceSlotId },
    operations: [
      { kind: 'UPDATE_DRAFT_EFFECTIVE_FROM', versionId: draft.id, value: baselineConfig.HVA_EFFECTIVE_FROM },
      { kind: 'INSERT_LESSON_SLOT', versionId: draft.id, weekday: 1, start: '07:00', end: '08:00', assignmentId: assignment.id },
      { kind: 'INSERT_CALENDAR_EVENT', date: baselineConfig.HVA_LOCAL_DATE, start: '10:30', end: '11:00', marker: baselineConfig.HVA_CALENDAR_SOURCE_REF },
      { kind: 'ACTIVATE_DRAFT', versionId: draft.id },
    ],
  }
  return { ...body, planHash: sha(canonical(body)) }
}

export function validatePreconditions(state) {
  const errors = []
  const active = state.versions.filter((v) => v.status === 'ACTIVE')
  const drafts = state.versions.filter((v) => v.status === 'DRAFT')
  const assignments = state.assignments.filter((a) => a.sourceNote === ASSIGNMENT_MARKER)
  if (active.length !== 1) errors.push(`expected exactly one ACTIVE version, found ${active.length}`)
  if (drafts.length !== 1) errors.push(`expected exactly one DRAFT version, found ${drafts.length}`)
  if (assignments.length !== 1) errors.push(`expected exactly one canonical assignment, found ${assignments.length}`)
  const assignment = assignments[0]
  if (assignment) {
    if (assignment.classLabel !== '2A' || assignment.disciplineName !== 'Tecnologia') errors.push('canonical assignment must be 2A / Tecnologia')
    if (assignment.status !== 'CONFIRMED' || assignment.weeklyMinutes !== 120) errors.push('canonical assignment must be CONFIRMED with weekly_minutes=120')
  }
  if (drafts.length === 1 && assignment) {
    const lessons = state.slots.filter((s) => s.versionId === drafts[0].id && s.weekday === 1 && s.slotKind === 'LESSON')
    if (lessons.some((s) => s.start === '07:00' && s.end === '08:00')) errors.push('DRAFT Monday 07:00–08:00 slot is not free')
    const current = lessons.filter((s) => s.start === '08:00' && s.end === '09:00' && s.assignmentId === assignment.id)
    if (current.length !== 1) errors.push(`DRAFT must contain exactly one canonical 08:00–09:00 lesson, found ${current.length}`)
  }
  if (state.future.teachingSessions || state.future.calendarEvents || state.future.calendarDays) errors.push('27-Oct→8-Nov future interval is not empty')
  if (state.baselineCalendarCount !== 0) errors.push('canonical baseline Calendar marker already exists')
  if (state.legacySessions.length !== 1) errors.push(`expected exactly one legacy B01 session, found ${state.legacySessions.length}`)
  if (active.length === 1 && state.legacySessions.length === 1 && state.legacySessions[0].sourceVersionId !== active[0].id) errors.push('legacy B01 must still reference the current pre-provision ACTIVE')
  return errors
}

export async function executeProvisionPlan(plan, { adapter, confirm }) {
  if (confirm !== baselineConfig.HVA_BASELINE_ID) throw new Error(`explicit confirmation ${baselineConfig.HVA_BASELINE_ID} required`)
  assertPlanHash(plan)
  const fresh = await adapter.readState()
  if (stateFingerprint(fresh) !== plan.preconditionFingerprint) throw new Error('stale provision plan: live precondition fingerprint changed')
  const drift = validatePreconditions(fresh)
  if (drift.length) throw new Error(`live preconditions drifted: ${drift.join('; ')}`)

  const rollback = { previousDraftEffectiveFrom: plan.targetDraft.previousEffectiveFrom, insertedSlotId: null, calendarEventId: null, draftUpdated: false }
  let activated = false
  try {
    await adapter.updateDraftEffectiveFrom(plan.targetDraft.id, baselineConfig.HVA_EFFECTIVE_FROM)
    rollback.draftUpdated = true
    rollback.insertedSlotId = await adapter.insertLessonSlot({ versionId: plan.targetDraft.id, assignment: plan.canonicalAssignment })
    rollback.calendarEventId = await adapter.insertCalendarEvent()
    const preparedErrors = validatePreparedState(await adapter.readPreparedState(plan.targetDraft.id), plan)
    if (preparedErrors.length) throw new Error(`prepared DRAFT invalid: ${preparedErrors.join('; ')}`)
    await adapter.activateDraft(plan.targetDraft.id)
    activated = true
    const result = await adapter.readPostActivationState(plan)
    const resultErrors = validatePostActivationState(result, plan)
    if (resultErrors.length) throw new Error(`post-activation verification failed: ${resultErrors.join('; ')}`)
    return { status: 'PASS', baselineId: baselineConfig.HVA_BASELINE_ID, planHash: plan.planHash, result }
  } catch (error) {
    if (!activated) await rollbackPreparedStage(adapter, rollback)
    throw error
  }
}

export function validatePreparedState(state, plan) {
  const errors = []
  if (state.draft?.id !== plan.targetDraft.id || state.draft?.status !== 'DRAFT') errors.push('target version is not the expected DRAFT')
  if (state.draft?.effectiveFrom !== baselineConfig.HVA_EFFECTIVE_FROM) errors.push('DRAFT effective_from is not 2026-10-27')
  if (state.canonical07Count !== 1) errors.push(`prepared DRAFT canonical 07:00 count is ${state.canonical07Count}`)
  if (state.canonical08Count !== 1) errors.push(`prepared DRAFT canonical 08:00 count is ${state.canonical08Count}`)
  if (state.baselineCalendarCount !== 1) errors.push(`baseline Calendar count is ${state.baselineCalendarCount}`)
  return errors
}

export function validatePostActivationState(state, plan) {
  const errors = []
  if (state.oldActive?.id !== plan.oldActive.id || state.oldActive?.status !== 'ARCHIVED' || state.oldActive?.effectiveTo !== '2026-10-26') errors.push('previous ACTIVE must be ARCHIVED through 2026-10-26')
  if (state.newActive?.id !== plan.targetDraft.id || state.newActive?.status !== 'ACTIVE' || state.newActive?.effectiveFrom !== baselineConfig.HVA_EFFECTIVE_FROM) errors.push('target DRAFT did not become ACTIVE from 2026-10-27')
  if (state.legacyB01?.sessionId !== plan.legacyB01.sessionId || state.legacyB01?.sourceVersionId !== plan.legacyB01.sourceVersionId || state.legacyB01?.sourceSlotId !== plan.legacyB01.sourceSlotId) errors.push('legacy B01 provenance changed')
  if (state.legacyB01?.supersededByCount !== 0) errors.push('HVA-GOV-01 must not supersede legacy B01')
  if (state.baselineCalendarCount !== 1) errors.push('canonical Calendar event missing after activation')
  return errors
}

export function assertPlanHash(plan) {
  const { planHash, ...body } = plan
  if (!planHash || planHash !== sha(canonical(body))) throw new Error('provision plan hash mismatch')
}

async function rollbackPreparedStage(adapter, rollback) {
  const errors = []
  if (rollback.calendarEventId) try { await adapter.deleteCalendarEvent(rollback.calendarEventId) } catch (e) { errors.push(e) }
  if (rollback.insertedSlotId) try { await adapter.deleteLessonSlot(rollback.insertedSlotId) } catch (e) { errors.push(e) }
  if (rollback.draftUpdated) try { await adapter.restoreDraftEffectiveFrom(rollback.previousDraftEffectiveFrom) } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'HVA baseline rollback incomplete')
}

function normalizeState(state) {
  return { workspaceId: state.workspaceId, academicYearId: state.academicYearId, versions: [...state.versions].sort(byId), slots: [...state.slots].sort(byId), assignments: [...state.assignments].sort(byId), future: state.future, baselineCalendarCount: state.baselineCalendarCount, legacySessions: [...state.legacySessions].sort(byId) }
}
function byId(a, b) { return String(a.id ?? '').localeCompare(String(b.id ?? '')) }
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`; return JSON.stringify(value) }
function sha(value) { return createHash('sha256').update(value).digest('hex') }

async function main() {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const dryRun = argv.includes('--dry-run')
  if (apply === dryRun) throw new Error('choose exactly one of --dry-run or --apply')
  const { createLiveProvisionAdapter } = await import('./hva-baseline-provision-live.mjs')
  const adapter = await createLiveProvisionAdapter()
  const dir = path.join(process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience', 'baseline')
  await fs.mkdir(dir, { recursive: true })
  if (dryRun) {
    const plan = createProvisionPlanFromState(await adapter.readState())
    await fs.writeFile(path.join(dir, 'provision-plan.json'), `${JSON.stringify(plan, null, 2)}\n`)
    process.stdout.write(`HVA baseline dry-run PASS · ${plan.planHash}\n`)
    return
  }
  const value = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null }
  const planFile = value('--plan-file')
  if (!planFile) throw new Error('--plan-file required for apply')
  const result = await executeProvisionPlan(JSON.parse(await fs.readFile(planFile, 'utf8')), { adapter, confirm: value('--confirm') })
  await fs.writeFile(path.join(dir, 'provision-result.json'), `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write('HVA baseline apply PASS\n')
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1 })
