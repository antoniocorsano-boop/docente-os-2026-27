import {
  validateHvaBaselineSnapshot,
  validateHvaLessonCoexistenceInput,
} from './hva-governed-baseline-contract.mjs'
import { readHvaGovernedBaselineRuntime } from './hva-governed-baseline-runtime.mjs'

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

  process.stdout.write(`HVA Today coexistence PASS: ${runtime.snapshot.localDate} · governed baseline read-only\n`)
  return runtime
}
