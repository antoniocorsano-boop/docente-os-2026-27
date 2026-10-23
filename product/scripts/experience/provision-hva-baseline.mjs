import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  HVA_EXPECTED_BASELINE_SNAPSHOT,
  fingerprintHvaBaselineSnapshot,
} from '../../e2e/support/hva-governed-baseline-contract.mjs'

const require = createRequire(import.meta.url)
const {
  HVA_BASELINE_ID,
  HVA_CALENDAR_SOURCE_REF,
  HVA_EFFECTIVE_FROM,
  HVA_LOCAL_DATE,
  HVA_WEEKDAY,
} = require('../../e2e/support/hva-governed-baseline-config.cjs')

const DEFAULT_PLAN_PATH = 'test-results/experience/baseline/provision-plan.json'
const EXPECTED_POST_FINGERPRINT = fingerprintHvaBaselineSnapshot(HVA_EXPECTED_BASELINE_SNAPSHOT)
const HISTORIC_FIXTURE_DATE = '2026-10-26'
const FUTURE_GUARD_END = '2026-11-08'
const ASSIGNMENT_MARKER = 'HVA · Oggi · Cattedra canonica'
const CALENDAR_TITLE = 'HVA · Impegno collegiale canonico'
const TARGET_LABEL = 'HVA-GOV-01 / Baseline v1'

export function parseProvisionArgs(argv = []) {
  let mode = 'dry-run'
  let planPath = DEFAULT_PLAN_PATH
  let planWasExplicit = false
  let confirm = null

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      mode = 'dry-run'
      continue
    }
    if (arg === '--apply') {
      mode = 'apply'
      continue
    }
    if (arg === '--plan' || arg === '--plan-file') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a path`)
      planPath = value
      planWasExplicit = true
      index += 1
      continue
    }
    if (arg === '--confirm') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error('--confirm requires a baseline id')
      confirm = value
      index += 1
      continue
    }
    throw new Error(`Unknown HVA baseline provisioning argument: ${arg}`)
  }

  if (mode === 'apply') {
    if (!planWasExplicit) throw new Error('--apply requires --plan-file <path> (or --plan <path>)')
    if (confirm !== HVA_BASELINE_ID) {
      throw new Error(`--apply requires --confirm ${HVA_BASELINE_ID}`)
    }
    return { mode, planPath, confirm }
  }

  return { mode, planPath, confirm: null }
}

export function buildHvaBaselineProvisionPlan(runtime, { plannedAt = new Date().toISOString() } = {}) {
  assertRuntime(runtime)
  if (runtime.persistentFixtureIntegrity?.status !== 'PASS') {
    throw new Error('HVA baseline provisioning requires historical fixture provenance to PASS before planning')
  }
  if (runtime.persistentFixtureIntegrity?.localDate && runtime.persistentFixtureIntegrity.localDate !== HISTORIC_FIXTURE_DATE) {
    throw new Error(`HVA historical fixture must remain bound to ${HISTORIC_FIXTURE_DATE}`)
  }

  if (runtime.provisioning) assertLivePlanningPreconditions(runtime)

  const operations = []
  const assignment = runtime.snapshot?.timetable?.assignment ?? null
  const assignmentIsCanonical = isCanonicalAssignment(assignment)
  if (!assignmentIsCanonical) {
    if (runtime.provisioning) {
      throw new Error('Live HVA provisioning requires the canonical 2A/Tecnologia/120/CONFIRMED assignment before apply')
    }
    operations.push({
      kind: 'ENSURE_ASSIGNMENT',
      class: '2A',
      discipline: 'Tecnologia',
      status: 'CONFIRMED',
      weeklyMinutes: 120,
      marker: ASSIGNMENT_MARKER,
    })
  }

  const draftVersionId = runtime.provisioning?.draftVersions?.[0]?.id ?? null
  operations.push({
    kind: 'PREPARE_TIMETABLE_DRAFT',
    draftVersionId,
    effectiveFrom: HVA_EFFECTIVE_FROM,
    label: TARGET_LABEL,
    marker: HVA_BASELINE_ID,
  })
  operations.push(canonicalLessonOperation('07:00', '08:00', 1))
  operations.push(canonicalLessonOperation('08:00', '09:00', 2))
  operations.push({
    kind: 'ACTIVATE_TIMETABLE',
    draftVersionId,
    effectiveFrom: HVA_EFFECTIVE_FROM,
    expectedArchivedVersionId: runtime.runtimeIds?.activeTimetableVersionId ?? null,
  })
  operations.push({
    kind: 'UPSERT_CALENDAR_EVENT',
    title: CALENDAR_TITLE,
    date: HVA_LOCAL_DATE,
    start: '10:30',
    end: '11:00',
    eventKind: 'MEETING',
    sourceRef: HVA_CALENDAR_SOURCE_REF,
  })

  const observed = buildObservedReceipt(runtime)
  const planBody = {
    schemaVersion: 1,
    baselineId: HVA_BASELINE_ID,
    plannedAt,
    preconditionFingerprint: fingerprintProvisioningLease(runtime),
    expectedPostFingerprint: EXPECTED_POST_FINGERPRINT,
    observed,
    operations,
  }

  return {
    ...planBody,
    planSha256: sha256(stableJson(planBody)),
  }
}

export async function applyHvaBaselineProvisionPlan({ plan, readRuntime, adapter }) {
  if (!plan || plan.baselineId !== HVA_BASELINE_ID) {
    throw new Error(`HVA provisioning plan must target ${HVA_BASELINE_ID}`)
  }
  if (typeof readRuntime !== 'function') throw new Error('HVA provisioning apply requires readRuntime')
  if (!adapter || typeof adapter !== 'object') throw new Error('HVA provisioning apply requires a mutation adapter')
  verifyPlanHash(plan)

  const liveRuntime = await readRuntime()
  if (
    liveRuntime?.fingerprint === plan.expectedPostFingerprint
    && liveRuntime?.persistentFixtureIntegrity?.status === 'PASS'
  ) {
    return { status: 'NOOP', plan, postRuntime: liveRuntime }
  }

  const liveLease = fingerprintProvisioningLease(liveRuntime)
  if (liveLease !== plan.preconditionFingerprint) {
    throw new Error(
      `HVA semantic lease preconditionFingerprint mismatch: planned ${plan.preconditionFingerprint}, live ${liveLease}`,
    )
  }

  const context = {
    assignmentId: plan.observed?.canonicalAssignmentId ?? null,
    sectionId: plan.observed?.canonicalSectionId ?? null,
    disciplineId: plan.observed?.canonicalDisciplineId ?? null,
    timetableVersionId: plan.observed?.draftVersionIds?.[0] ?? null,
  }
  let activated = false

  try {
    for (const operation of plan.operations ?? []) {
      if (operation.kind === 'ENSURE_ASSIGNMENT') {
        const result = await requireMethod(adapter, 'ensureCanonicalAssignment')(operation, context)
        context.assignmentId = result?.assignmentId ?? context.assignmentId
        continue
      }
      if (operation.kind === 'PREPARE_TIMETABLE_DRAFT') {
        const result = await requireMethod(adapter, 'prepareCanonicalDraftTimetable')(operation, context)
        context.timetableVersionId = result?.timetableVersionId ?? context.timetableVersionId
        continue
      }
      if (operation.kind === 'CREATE_MONDAY_SLOT') {
        await requireMethod(adapter, 'createCanonicalMondaySlot')(operation, context)
        continue
      }
      if (operation.kind === 'ACTIVATE_TIMETABLE') {
        await requireMethod(adapter, 'activateCanonicalTimetable')(operation, context)
        activated = true
        continue
      }
      if (operation.kind === 'UPSERT_CALENDAR_EVENT') {
        await requireMethod(adapter, 'upsertCanonicalCalendarEvent')(operation, context)
        continue
      }
      throw new Error(`Unsupported HVA provisioning operation: ${operation.kind}`)
    }
  } catch (error) {
    if (!activated && typeof adapter.rollbackPreActivation === 'function') {
      try {
        await adapter.rollbackPreActivation({ plan, context, cause: error })
      } catch (rollbackError) {
        throw new Error(
          `HVA provisioning failed before activation and rollback also failed: ${message(error)}; rollback: ${message(rollbackError)}`,
        )
      }
    }
    throw error
  }

  const postRuntime = await readRuntime()
  if (postRuntime?.fingerprint !== plan.expectedPostFingerprint) {
    throw new Error(
      `HVA provisioning postcondition fingerprint mismatch: expected ${plan.expectedPostFingerprint}, got ${postRuntime?.fingerprint ?? 'null'}`,
    )
  }
  if (postRuntime?.persistentFixtureIntegrity?.status !== 'PASS') {
    throw new Error(
      `HVA historical fixture provenance failed after activation: ${(postRuntime?.persistentFixtureIntegrity?.errors ?? []).join('; ')}`,
    )
  }
  if (
    postRuntime?.persistentFixtureIntegrity?.localDate
    && postRuntime.persistentFixtureIntegrity.localDate !== HISTORIC_FIXTURE_DATE
  ) {
    throw new Error(`HVA historical fixture provenance moved away from ${HISTORIC_FIXTURE_DATE}`)
  }

  return { status: 'APPLIED', plan, postRuntime }
}

export async function runHvaBaselineProvisioning({
  argv = process.argv.slice(2),
  readRuntime = readHvaBaselineProvisioningRuntime,
  writePlan = writeProvisionPlan,
  readPlan = readProvisionPlan,
  createMutationAdapter = createLiveMutationAdapter,
  now = () => new Date().toISOString(),
} = {}) {
  const args = parseProvisionArgs(argv)

  if (args.mode === 'dry-run') {
    const runtime = await readRuntime()
    const plan = buildHvaBaselineProvisionPlan(runtime, { plannedAt: now() })
    await writePlan(args.planPath, plan)
    return { status: 'DRY_RUN', plan, planPath: args.planPath }
  }

  const plan = await readPlan(args.planPath)
  verifyPlanHash(plan)
  if (plan.baselineId !== args.confirm) {
    throw new Error(`HVA provisioning plan baseline ${plan.baselineId ?? 'null'} does not match confirmation ${args.confirm}`)
  }
  const adapter = await createMutationAdapter({ plan })
  return applyHvaBaselineProvisionPlan({ plan, readRuntime, adapter })
}

export async function readHvaBaselineProvisioningRuntime() {
  const { readHvaGovernedBaselineRuntime } = await import('../../e2e/support/hva-governed-baseline-runtime.mjs')
  const semanticRuntime = await readHvaGovernedBaselineRuntime()
  const { supabase } = await governedAal2Client('HVA governed baseline provision dry-run')
  const context = await currentContext(supabase)

  if (
    semanticRuntime.runtimeIds?.workspaceId !== context.workspace_id
    || semanticRuntime.runtimeIds?.academicYearId !== context.academic_year_id
  ) {
    throw new Error('HVA provisioning runtime context changed between semantic and provisioning reads')
  }

  const [versionsResult, sectionsResult, disciplinesResult, assignmentsResult, futureSessionsResult] = await Promise.all([
    supabase
      .from('timetable_versions')
      .select('id,status,effective_from,effective_to,label,source_kind,source_ref')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id),
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
      .from('teaching_sessions')
      .select('id,local_date,source_timetable_version_id,source_timetable_slot_id,projected_occurrence_logical_id')
      .eq('workspace_id', context.workspace_id)
      .eq('academic_year_id', context.academic_year_id)
      .gte('local_date', HVA_EFFECTIVE_FROM)
      .lte('local_date', FUTURE_GUARD_END),
  ])

  assertQuery(versionsResult, 'timetable versions')
  assertQuery(sectionsResult, 'sections')
  assertQuery(disciplinesResult, 'disciplines')
  assertQuery(assignmentsResult, 'assignments')
  assertQuery(futureSessionsResult, 'future persistent sessions')

  const versions = versionsResult.data ?? []
  const activeVersions = versions.filter((version) => version.status === 'ACTIVE').map(normalizeVersion).sort(byId)
  const draftVersions = versions.filter((version) => version.status === 'DRAFT').map(normalizeVersion).sort(byId)
  const draftIds = draftVersions.map((version) => version.id)

  let draftSlots = []
  if (draftIds.length > 0) {
    const draftSlotsResult = await supabase
      .from('timetable_slots')
      .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,teaching_assignment_id')
      .in('timetable_version_id', draftIds)
    assertQuery(draftSlotsResult, 'DRAFT timetable slots')
    draftSlots = (draftSlotsResult.data ?? []).map(normalizeSlot).sort(bySlot)
  }

  const sections = sectionsResult.data ?? []
  const disciplines = disciplinesResult.data ?? []
  const assignments = assignmentsResult.data ?? []
  const canonicalSections = sections.filter((section) => classLabel(section) === '2A')
  const canonicalDisciplines = disciplines.filter(
    (discipline) => discipline.name?.trim() === 'Tecnologia' && discipline.is_active === true,
  )
  const canonicalAssignments = assignments.filter((assignment) =>
    canonicalSections.some((section) => section.id === assignment.section_id)
    && canonicalDisciplines.some((discipline) => discipline.id === assignment.discipline_id),
  )

  return {
    ...semanticRuntime,
    provisioning: {
      activeVersions,
      draftVersions,
      draftSlots,
      canonicalRefs: {
        sectionIds: canonicalSections.map((row) => row.id).filter(Boolean).sort(),
        disciplineIds: canonicalDisciplines.map((row) => row.id).filter(Boolean).sort(),
        assignmentIds: canonicalAssignments.map((row) => row.id).filter(Boolean).sort(),
      },
      incompatiblePersistentState: (futureSessionsResult.data ?? [])
        .map((session) => ({
          kind: 'TEACHING_SESSION',
          id: session.id,
          localDate: session.local_date,
          sourceTimetableVersionId: session.source_timetable_version_id,
          sourceTimetableSlotId: session.source_timetable_slot_id,
          occurrenceId: session.projected_occurrence_logical_id,
        }))
        .sort(byPersistentState),
    },
  }
}

async function createLiveMutationAdapter({ plan }) {
  const { supabase, userId } = await governedAal2Client('HVA governed baseline provision apply')
  const context = await currentContext(supabase)
  if (
    context.workspace_id !== plan.observed?.workspaceId
    || context.academic_year_id !== plan.observed?.academicYearId
  ) {
    throw new Error('HVA provisioning apply context does not match the approved plan')
  }

  let draftBefore = null
  const slotMutations = []

  return {
    async ensureCanonicalAssignment() {
      throw new Error('Live HVA provisioning does not create or repair the canonical assignment; dry-run must fail closed first')
    },

    async prepareCanonicalDraftTimetable(operation) {
      const timetableVersionId = operation.draftVersionId ?? plan.observed?.draftVersionIds?.[0]
      if (!timetableVersionId) throw new Error('HVA provisioning plan does not identify a unique DRAFT')

      const versionResult = await supabase
        .from('timetable_versions')
        .select('*')
        .eq('id', timetableVersionId)
        .eq('workspace_id', context.workspace_id)
        .eq('academic_year_id', context.academic_year_id)
        .single()
      assertQuery(versionResult, 'DRAFT before prepare')
      if (versionResult.data?.status !== 'DRAFT') throw new Error('HVA provisioning target version is no longer DRAFT')
      draftBefore = versionResult.data

      const updateResult = await supabase
        .from('timetable_versions')
        .update({
          label: operation.label,
          effective_from: operation.effectiveFrom,
          effective_to: null,
          source_kind: 'MANUAL',
          source_ref: operation.marker,
        })
        .eq('id', timetableVersionId)
        .eq('status', 'DRAFT')
        .select('id,status,effective_from')
        .single()
      assertQuery(updateResult, 'DRAFT prepare')
      if (updateResult.data?.status !== 'DRAFT' || updateResult.data?.effective_from !== HVA_EFFECTIVE_FROM) {
        throw new Error('HVA provisioning DRAFT prepare did not reach the approved effective date')
      }
      return { timetableVersionId }
    },

    async createCanonicalMondaySlot(operation, applyContext) {
      const timetableVersionId = applyContext.timetableVersionId
      const assignmentId = applyContext.assignmentId
      const sectionId = applyContext.sectionId
      const disciplineId = applyContext.disciplineId
      if (!timetableVersionId || !assignmentId || !sectionId || !disciplineId) {
        throw new Error('HVA provisioning slot mutation is missing approved DRAFT/assignment/section/discipline identity')
      }

      const overlapResult = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('timetable_version_id', timetableVersionId)
        .eq('weekday', HVA_WEEKDAY)
        .lt('start_time', dbTime(operation.end))
        .gt('end_time', dbTime(operation.start))
      assertQuery(overlapResult, `${operation.start}-${operation.end} DRAFT overlap`)
      const overlaps = overlapResult.data ?? []
      if (overlaps.length > 1) throw new Error(`HVA DRAFT has multiple overlaps for ${operation.start}-${operation.end}`)

      const payload = {
        weekday: HVA_WEEKDAY,
        start_time: dbTime(operation.start),
        end_time: dbTime(operation.end),
        slot_kind: 'LESSON',
        section_id: sectionId,
        discipline_id: disciplineId,
        teaching_assignment_id: assignmentId,
        manual_class_label: null,
        presence_kind: null,
        ordinal: operation.ordinal,
      }

      if (overlaps.length === 1) {
        const existing = overlaps[0]
        if (clock(existing.start_time) !== operation.start || clock(existing.end_time) !== operation.end) {
          throw new Error(`HVA DRAFT interval ${operation.start}-${operation.end} is occupied by a non-canonical slot`)
        }
        slotMutations.push({ kind: 'UPDATE', before: existing })
        const updateResult = await supabase
          .from('timetable_slots')
          .update(payload)
          .eq('id', existing.id)
          .eq('timetable_version_id', timetableVersionId)
          .select('id')
          .single()
        assertQuery(updateResult, `${operation.start}-${operation.end} DRAFT slot update`)
        return { slotId: updateResult.data.id }
      }

      const insertResult = await supabase
        .from('timetable_slots')
        .insert({
          ...payload,
          timetable_version_id: timetableVersionId,
          created_by: userId,
        })
        .select('id')
        .single()
      assertQuery(insertResult, `${operation.start}-${operation.end} DRAFT slot insert`)
      slotMutations.push({ kind: 'INSERT', id: insertResult.data.id })
      return { slotId: insertResult.data.id }
    },

    async activateCanonicalTimetable(operation, applyContext) {
      const timetableVersionId = applyContext.timetableVersionId
      if (!timetableVersionId) throw new Error('HVA provisioning activation is missing the approved DRAFT id')
      const activationResult = await supabase.rpc('activate_timetable_version', { p_version_id: timetableVersionId })
      assertQuery(activationResult, 'DRAFT activation')
      const activation = activationResult.data?.[0]
      if (!activation || activation.active_version_id !== timetableVersionId) {
        throw new Error('HVA provisioning activation did not activate the approved DRAFT')
      }
      if (
        operation.expectedArchivedVersionId
        && activation.archived_version_id !== operation.expectedArchivedVersionId
      ) {
        throw new Error('HVA provisioning activation archived an unexpected timetable version')
      }
      return activation
    },

    async upsertCanonicalCalendarEvent(operation) {
      const existingResult = await supabase
        .from('calendar_events')
        .select('id')
        .eq('workspace_id', context.workspace_id)
        .eq('academic_year_id', context.academic_year_id)
        .eq('source_ref', operation.sourceRef)
      assertQuery(existingResult, 'canonical Calendar event lookup')
      const existing = existingResult.data ?? []
      if (existing.length > 1) throw new Error('HVA canonical Calendar marker is duplicated')

      const payload = {
        title: operation.title,
        event_kind: operation.eventKind,
        starts_on: operation.date,
        ends_on: operation.date,
        all_day: false,
        start_time: dbTime(operation.start),
        end_time: dbTime(operation.end),
        source_kind: 'MANUAL',
        source_ref: operation.sourceRef,
      }
      if (existing.length === 1) {
        const updateResult = await supabase
          .from('calendar_events')
          .update(payload)
          .eq('id', existing[0].id)
          .select('id')
          .single()
        assertQuery(updateResult, 'canonical Calendar event update')
        return { calendarEventId: updateResult.data.id }
      }

      const insertResult = await supabase
        .from('calendar_events')
        .insert({
          ...payload,
          workspace_id: context.workspace_id,
          academic_year_id: context.academic_year_id,
          created_by: userId,
        })
        .select('id')
        .single()
      assertQuery(insertResult, 'canonical Calendar event insert')
      return { calendarEventId: insertResult.data.id }
    },

    async rollbackPreActivation() {
      for (const mutation of [...slotMutations].reverse()) {
        if (mutation.kind === 'INSERT') {
          const deleteResult = await supabase.from('timetable_slots').delete().eq('id', mutation.id)
          assertQuery(deleteResult, 'pre-activation inserted slot rollback')
          continue
        }
        const restoreResult = await supabase
          .from('timetable_slots')
          .update(mutableSlotPayload(mutation.before))
          .eq('id', mutation.before.id)
        assertQuery(restoreResult, 'pre-activation updated slot rollback')
      }

      if (draftBefore) {
        const restoreVersionResult = await supabase
          .from('timetable_versions')
          .update({
            label: draftBefore.label,
            effective_from: draftBefore.effective_from,
            effective_to: draftBefore.effective_to,
            source_kind: draftBefore.source_kind,
            source_ref: draftBefore.source_ref,
          })
          .eq('id', draftBefore.id)
          .eq('status', 'DRAFT')
        assertQuery(restoreVersionResult, 'pre-activation DRAFT rollback')
      }
    },
  }
}

function assertLivePlanningPreconditions(runtime) {
  const provisioning = runtime.provisioning
  const activeVersions = provisioning.activeVersions ?? []
  const drafts = provisioning.draftVersions ?? []
  const draftSlots = provisioning.draftSlots ?? []

  if (activeVersions.length !== 1 || activeVersions[0].status !== 'ACTIVE') {
    throw new Error(`HVA provisioning requires exactly one ACTIVE timetable, found ${activeVersions.length}`)
  }
  const active = activeVersions[0]
  if (!coversDate(active, HISTORIC_FIXTURE_DATE)) {
    throw new Error(`HVA ACTIVE timetable must still cover historical fixture date ${HISTORIC_FIXTURE_DATE}`)
  }
  if (
    runtime.persistentFixtureIntegrity?.sourceTimetableVersionId
    && runtime.persistentFixtureIntegrity.sourceTimetableVersionId !== active.id
  ) {
    throw new Error('HVA historical fixture source version does not match the ACTIVE version that covers 26-Oct')
  }

  if (drafts.length !== 1 || drafts[0].status !== 'DRAFT') {
    throw new Error(`HVA provisioning requires exactly one editable DRAFT timetable, found ${drafts.length}`)
  }
  const priorOverlap = draftSlots.filter((slot) =>
    slot.weekday === HVA_WEEKDAY && intervalsOverlap(slot.start, slot.end, '07:00', '08:00'),
  )
  if (priorOverlap.length > 0) {
    throw new Error('HVA governed DRAFT 07:00-08:00 interval is occupied or overlaps existing state')
  }

  if ((provisioning.incompatiblePersistentState ?? []).length > 0) {
    throw new Error(`HVA incompatible persistent state exists in 27-Oct through 8-Nov: ${provisioning.incompatiblePersistentState.length}`)
  }
  if (!isCanonicalAssignment(runtime.snapshot?.timetable?.assignment)) {
    throw new Error('HVA canonical assignment must already match 2A/Tecnologia/120/CONFIRMED before live provisioning')
  }
  if ((runtime.runtimeIds?.assignmentIds ?? []).length !== 1) {
    throw new Error('HVA live provisioning requires exactly one canonical assignment id')
  }
  if ((runtime.runtimeIds?.calendarEventIds ?? []).length > 1) {
    throw new Error('HVA canonical Calendar marker is duplicated before provisioning')
  }

  const refs = provisioning.canonicalRefs
  if (refs) {
    if ((refs.sectionIds ?? []).length !== 1) throw new Error('HVA provisioning requires exactly one canonical 2A section')
    if ((refs.disciplineIds ?? []).length !== 1) throw new Error('HVA provisioning requires exactly one active Tecnologia discipline')
    if ((refs.assignmentIds ?? []).length !== 1) throw new Error('HVA provisioning requires exactly one canonical 2A/Tecnologia assignment')
  }
}

function buildObservedReceipt(runtime) {
  const refs = runtime.provisioning?.canonicalRefs ?? {}
  const canonicalAssignmentId = refs.assignmentIds?.[0] ?? runtime.runtimeIds?.assignmentIds?.[0] ?? null
  return {
    workspaceId: runtime.runtimeIds?.workspaceId ?? null,
    academicYearId: runtime.runtimeIds?.academicYearId ?? null,
    semanticFingerprint: runtime.fingerprint ?? null,
    activeVersionIds: (runtime.provisioning?.activeVersions ?? [])
      .map((version) => version.id)
      .filter(Boolean)
      .sort(),
    draftVersionIds: (runtime.provisioning?.draftVersions ?? [])
      .map((version) => version.id)
      .filter(Boolean)
      .sort(),
    draftSlotIds: (runtime.provisioning?.draftSlots ?? [])
      .map((slot) => slot.id)
      .filter(Boolean)
      .sort(),
    canonicalSectionId: refs.sectionIds?.[0] ?? null,
    canonicalDisciplineId: refs.disciplineIds?.[0] ?? null,
    canonicalAssignmentId,
    canonicalCalendarEventIds: [...(runtime.runtimeIds?.calendarEventIds ?? [])].sort(),
    incompatiblePersistentState: runtime.provisioning?.incompatiblePersistentState ?? [],
    historicalFixture: runtime.persistentFixtureIntegrity ?? null,
  }
}

function fingerprintProvisioningLease(runtime) {
  if (!runtime?.provisioning) return runtime?.fingerprint ?? null
  const lease = {
    semanticFingerprint: runtime.fingerprint ?? null,
    workspaceId: runtime.runtimeIds?.workspaceId ?? null,
    academicYearId: runtime.runtimeIds?.academicYearId ?? null,
    activeVersions: [...(runtime.provisioning.activeVersions ?? [])].sort(byId),
    draftVersions: [...(runtime.provisioning.draftVersions ?? [])].sort(byId),
    draftSlots: [...(runtime.provisioning.draftSlots ?? [])].sort(bySlot),
    canonicalRefs: runtime.provisioning.canonicalRefs ?? null,
    incompatiblePersistentState: [...(runtime.provisioning.incompatiblePersistentState ?? [])].sort(byPersistentState),
    calendarEventIds: [...(runtime.runtimeIds?.calendarEventIds ?? [])].sort(),
    historicalFixture: runtime.persistentFixtureIntegrity ?? null,
  }
  return sha256(stableJson(lease))
}

function verifyPlanHash(plan) {
  if (!plan?.planSha256) return
  const { planSha256, ...body } = plan
  const actual = sha256(stableJson(body))
  if (actual !== planSha256) {
    throw new Error(`HVA provision plan SHA-256 mismatch: expected ${planSha256}, got ${actual}`)
  }
}

async function writeProvisionPlan(path, plan) {
  const target = resolve(path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')
}

async function readProvisionPlan(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

async function governedAal2Client(label) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('HVA baseline provisioning requires Supabase URL and publishable key')
  }
  const { authenticatedAal2Supabase } = await import('../../e2e/support/direct-aal2-supabase.mjs')
  return authenticatedAal2Supabase({ supabaseUrl, supabasePublishableKey, label })
}

async function currentContext(supabase) {
  const result = await supabase.rpc('current_workspace_context')
  assertQuery(result, 'workspace context')
  const context = result.data?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('HVA provisioning requires a current workspace and academic year')
  }
  return context
}

function canonicalLessonOperation(start, end, ordinal) {
  return {
    kind: 'CREATE_MONDAY_SLOT',
    weekday: HVA_WEEKDAY,
    start,
    end,
    slotKind: 'LESSON',
    class: '2A',
    discipline: 'Tecnologia',
    ordinal,
  }
}

function isCanonicalAssignment(assignment) {
  return assignment?.class === '2A'
    && assignment?.discipline === 'Tecnologia'
    && assignment?.status === 'CONFIRMED'
    && assignment?.weeklyMinutes === 120
    && assignment?.marker === ASSIGNMENT_MARKER
}

function coversDate(version, localDate) {
  return version.effectiveFrom <= localDate && (!version.effectiveTo || version.effectiveTo >= localDate)
}

function intervalsOverlap(startA, endA, startB, endB) {
  return minute(startA) < minute(endB) && minute(endA) > minute(startB)
}

function minute(value) {
  const [hours, minutes] = clock(value).split(':').map(Number)
  return hours * 60 + minutes
}

function clock(value) {
  if (!value) return null
  return String(value).slice(0, 5)
}

function dbTime(value) {
  return `${clock(value)}:00`
}

function normalizeVersion(version) {
  return {
    id: version.id,
    status: version.status,
    effectiveFrom: version.effective_from,
    effectiveTo: version.effective_to,
    label: version.label,
    sourceKind: version.source_kind,
    sourceRef: version.source_ref,
  }
}

function normalizeSlot(slot) {
  return {
    id: slot.id,
    timetableVersionId: slot.timetable_version_id,
    weekday: slot.weekday,
    start: clock(slot.start_time),
    end: clock(slot.end_time),
    slotKind: slot.slot_kind,
    sectionId: slot.section_id,
    disciplineId: slot.discipline_id,
    teachingAssignmentId: slot.teaching_assignment_id,
  }
}

function mutableSlotPayload(row) {
  const payload = {
    weekday: row.weekday,
    start_time: row.start_time,
    end_time: row.end_time,
    slot_kind: row.slot_kind,
    section_id: row.section_id,
    discipline_id: row.discipline_id,
    teaching_assignment_id: row.teaching_assignment_id,
    manual_class_label: row.manual_class_label ?? null,
    presence_kind: row.presence_kind ?? null,
    room: row.room ?? null,
    note: row.note ?? null,
    ordinal: row.ordinal ?? null,
  }
  if (Object.hasOwn(row, 'activity_kind')) payload.activity_kind = row.activity_kind
  return payload
}

function classLabel(section) {
  const grade = { PRIMA: '1', SECONDA: '2', TERZA: '3' }[section?.grade] ?? String(section?.grade ?? '').trim()
  const code = String(section?.section_code ?? '').trim().toUpperCase()
  return grade && code ? `${grade}${code}` : null
}

function assertRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') throw new Error('HVA baseline provisioning requires a runtime snapshot')
  if (!runtime.fingerprint) throw new Error('HVA baseline provisioning runtime is missing its semantic fingerprint')
  if (!runtime.snapshot) throw new Error('HVA baseline provisioning runtime is missing its semantic snapshot')
}

function assertQuery(result, label) {
  if (result?.error) throw new Error(`HVA provisioning ${label} failed: ${result.error.message}`)
}

function requireMethod(adapter, name) {
  if (typeof adapter[name] !== 'function') throw new Error(`HVA provisioning adapter is missing ${name}`)
  return adapter[name].bind(adapter)
}

function stableJson(value) {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]))
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function byId(a, b) {
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
}

function bySlot(a, b) {
  return Number(a?.weekday ?? 0) - Number(b?.weekday ?? 0)
    || String(a?.start ?? '').localeCompare(String(b?.start ?? ''))
    || String(a?.end ?? '').localeCompare(String(b?.end ?? ''))
    || byId(a, b)
}

function byPersistentState(a, b) {
  return String(a?.localDate ?? '').localeCompare(String(b?.localDate ?? ''))
    || String(a?.kind ?? '').localeCompare(String(b?.kind ?? ''))
    || byId(a, b)
}

function message(error) {
  return error instanceof Error ? error.message : String(error)
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await runHvaBaselineProvisioning()
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } catch (error) {
    process.stderr.write(`HVA baseline provisioning failed: ${message(error)}\n`)
    process.exitCode = 1
  }
}

export const HVA_BASELINE_PROVISION_PLAN_PATH = DEFAULT_PLAN_PATH
