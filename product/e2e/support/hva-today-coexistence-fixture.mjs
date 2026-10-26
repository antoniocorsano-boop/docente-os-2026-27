import {
  validateHvaBaselineSnapshot,
  validateHvaLessonCoexistenceInput,
} from './hva-governed-baseline-contract.mjs'
import { readHvaGovernedBaselineRuntime } from './hva-governed-baseline-runtime.mjs'

let priorUnregisteredOccurrencePromise = null

export function validateHvaTodayCoexistence(input) {
  return validateHvaLessonCoexistenceInput(input)
}

export async function assertHvaTodayCoexistenceRuntime() {
  const runtime = await readHvaGovernedBaselineRuntime()
  const baselineErrors = validateHvaBaselineSnapshot(runtime.snapshot)

  if (baselineErrors.length) {
    throw new Error(
      `HVA-JOURNEY-UNVERIFIED: governed HVA baseline drift prevents Today coexistence evidence; no persistent state was changed.\n- ${baselineErrors.join('\n- ')}`,
    )
  }

  process.stdout.write(`HVA Today coexistence PASS: ${runtime.snapshot.timetable?.date ?? 'unknown-date'} · governed baseline read-only\n`)
  return runtime
}

export async function resolveHvaPriorUnregisteredLessonOccurrence() {
  priorUnregisteredOccurrencePromise ??= loadPriorUnregisteredLessonOccurrence()
  return priorUnregisteredOccurrencePromise
}

async function loadPriorUnregisteredLessonOccurrence() {
  const runtime = await assertHvaTodayCoexistenceRuntime()
  const localDate = runtime.snapshot?.timetable?.date
  const timetableVersionId = runtime.runtimeIds?.activeTimetableVersionId
  const priorLessonIds = runtime.snapshot?.diagnostics?.priorLessonIds ?? []

  if (!localDate || !timetableVersionId || priorLessonIds.length !== 1) {
    throw new Error(
      'HVA-JOURNEY-UNVERIFIED: governed baseline must expose exactly one prior unregistered lesson occurrence',
    )
  }

  const timetableSlotId = priorLessonIds[0]
  return {
    localDate,
    occurrenceLogicalId: `tt:${timetableVersionId}:${timetableSlotId}:${localDate}`,
  }
}
