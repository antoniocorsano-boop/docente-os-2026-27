import { validateHvaTodayCoexistenceInput } from './hva-governed-baseline-contract.mjs'
import { readHvaGovernedBaselineRuntime } from './hva-governed-baseline-runtime.mjs'

export function validateHvaTodayCoexistence(input) {
  return validateHvaTodayCoexistenceInput(input)
}

export async function assertHvaTodayCoexistenceRuntime() {
  const runtime = await readHvaGovernedBaselineRuntime()
  const diagnostics = [
    ...(runtime.baselineErrors ?? []),
    ...(runtime.persistentFixtureIntegrity === 'PASS'
      ? []
      : runtime.persistentFixtureDiagnostics ?? ['persistent fixture drift']),
  ]
  if (diagnostics.length) {
    throw new Error(
      `HVA-JOURNEY-UNVERIFIED: authenticated browser evidence requires HVA-GOV-01/v1 without runtime mutation.\n- ${diagnostics.join('\n- ')}`,
    )
  }
  return runtime
}
