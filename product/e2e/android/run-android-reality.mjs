import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  classifyInfrastructureError,
  connectAndroidRuntime,
  writeInfrastructureReceipt,
} from './android-runtime.mjs'
import { runAr01OggiLateContext } from './ar-01-oggi-late-context.mjs'
import { runAr02FabTouchDrag } from './ar-02-fab-touch-drag.mjs'
import { writeAndroidRealityReceipt } from '../../scripts/experience/android-reality-report.mjs'

const OUTPUT_ROOT = path.resolve('test-results/android-reality')
const SCREENSHOTS_DIR = path.join(OUTPUT_ROOT, 'screenshots')
const testedSha = process.env.EXPECTED_COMMIT?.trim() ?? ''

let runtime = null

try {
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  runtime = await connectAndroidRuntime()
  await runtime.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await runtime.page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'smoke-login.png'),
    fullPage: true,
  })
  await writeInfrastructureReceipt({ infrastructure: 'PASS', metadata: runtime.metadata })

  const ar01 = await runAr01OggiLateContext(runtime.page)
  const ar02 = await runAr02FabTouchDrag(runtime.page, runtime.device)
  const journeys = [ar01.journey, ar02.journey]
  const geometry = [...ar01.geometry, ...ar02.geometry]
  const failures = [...ar01.failures, ...ar02.failures]
  const requestedOutcome = failures.length ? 'FAIL_PRODUCT' : 'PASS'

  const { receipt } = await writeAndroidRealityReceipt({
    testedSha,
    infrastructure: 'PASS',
    requestedOutcome,
    device: runtime.metadata,
    journeys,
    geometry,
    failures,
  })

  process.stdout.write(`Android Reality ${receipt.outcome}: ${testedSha || '(missing sha)'}\n`)
  if (receipt.outcome === 'FAIL_PRODUCT') process.exitCode = 1
  else if (receipt.outcome === 'INFRA_BLOCKED') process.exitCode = 2
} catch (error) {
  const infrastructure = classifyInfrastructureError(error)
  const message = sanitizeError(error)
  await writeInfrastructureReceipt({
    infrastructure,
    metadata: runtime?.metadata ?? null,
    error: new Error(message),
  })
  const { receipt } = await writeAndroidRealityReceipt({
    testedSha,
    infrastructure,
    requestedOutcome: 'INFRA_BLOCKED',
    device: runtime?.metadata ?? null,
    journeys: [],
    geometry: [],
    failures: [{
      journey: 'AR-02',
      code: 'ANDROID_REALITY_EXECUTION_BLOCKED',
      message,
    }],
  })
  process.stderr.write(`Android Reality ${receipt.outcome}: ${message}\n`)
  process.exitCode = 2
} finally {
  await runtime?.context?.close().catch(() => {})
  await runtime?.device?.close().catch(() => {})
}

function sanitizeError(error) {
  let value = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  for (const name of ['E2E_EMAIL', 'E2E_PASSWORD', 'E2E_TOTP_SECRET']) {
    const secret = process.env[name]
    if (secret) value = value.split(secret).join('[REDACTED]')
  }
  return value.slice(0, 1200)
}
