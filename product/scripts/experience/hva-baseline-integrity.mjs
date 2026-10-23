import fs from 'node:fs/promises'
import path from 'node:path'
import baselineConfig from '../../e2e/support/hva-governed-baseline-config.cjs'

export function classifyHvaBaselineRuntime(runtime, error = null) {
  if (error) return { status: 'ERROR', diagnostics: [String(error instanceof Error ? error.message : error)] }
  if (!runtime) return { status: 'ERROR', diagnostics: ['runtime snapshot unavailable'] }
  if (runtime.persistentFixtureIntegrity !== 'PASS') {
    return { status: 'FAIL_FIXTURE_DRIFT', diagnostics: runtime.persistentFixtureDiagnostics ?? ['persistent fixture drift'] }
  }
  if ((runtime.baselineErrors ?? []).length) {
    return { status: 'FAIL_BASELINE_DRIFT', diagnostics: runtime.baselineErrors }
  }
  return { status: 'PASS', diagnostics: [] }
}

export function compareHvaBaselinePostflight(preflight, runtime) {
  const diagnostics = []
  if (!preflight) return { status: 'ERROR', diagnostics: ['preflight receipt missing'] }
  if (preflight.status !== 'PASS') diagnostics.push(`preflight status was ${preflight.status}`)
  if (preflight.fingerprint !== runtime?.fingerprint) diagnostics.push('baseline fingerprint changed after browser execution')
  if (preflight.runtimeIds?.activeVersionId !== runtime?.runtimeIds?.activeVersionId) diagnostics.push('ACTIVE timetable identity changed after browser execution')
  if (runtime?.persistentFixtureIntegrity !== 'PASS') diagnostics.push(...(runtime?.persistentFixtureDiagnostics ?? ['persistent fixture drift']))
  if ((runtime?.baselineErrors ?? []).length) diagnostics.push(...runtime.baselineErrors)
  return { status: diagnostics.length ? 'FAIL_BASELINE_DRIFT' : 'PASS', diagnostics }
}

export async function runHvaBaselineIntegrityPhase(phase, options = {}) {
  if (phase !== 'preflight' && phase !== 'postflight') throw new Error(`unsupported HVA baseline phase: ${phase}`)
  const outputDir = options.outputDir ?? process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
  const baselineDir = path.join(outputDir, 'baseline')
  const runtimeReader = options.runtimeReader ?? (await import('../../e2e/support/hva-governed-baseline-runtime.mjs')).readHvaGovernedBaselineRuntime
  await fs.mkdir(baselineDir, { recursive: true })

  let runtime = null
  let readError = null
  try { runtime = await runtimeReader() } catch (error) { readError = error }
  let classification = classifyHvaBaselineRuntime(runtime, readError)

  if (phase === 'postflight') {
    let preflight = null
    try { preflight = JSON.parse(await fs.readFile(path.join(baselineDir, 'preflight.json'), 'utf8')) } catch { preflight = null }
    if (!readError && runtime) classification = compareHvaBaselinePostflight(preflight, runtime)
  }

  const receipt = {
    schemaVersion: 1,
    baselineId: baselineConfig.HVA_BASELINE_ID,
    phase,
    status: classification.status,
    fingerprint: runtime?.fingerprint ?? null,
    runtimeIds: runtime?.runtimeIds ?? null,
    baselineIntegrity: classification.status === 'PASS' ? 'PASS' : classification.status === 'FAIL_FIXTURE_DRIFT' ? 'PASS' : classification.status,
    persistentFixtureIntegrity: runtime?.persistentFixtureIntegrity ?? (readError ? 'ERROR' : null),
    diagnostics: classification.diagnostics,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(baselineDir, `${phase}.json`), `${JSON.stringify(receipt, null, 2)}\n`)
  return receipt
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const phase = process.argv[2]
  try {
    const receipt = await runHvaBaselineIntegrityPhase(phase)
    process.stdout.write(`HVA baseline ${phase}: ${receipt.status}\n`)
    if (receipt.status !== 'PASS') process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
