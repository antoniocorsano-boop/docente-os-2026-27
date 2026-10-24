import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  classifyInfrastructureError,
  connectAndroidRuntime,
  writeInfrastructureReceipt,
} from './android-runtime.mjs'

const screenshotsDir = path.resolve('test-results/android-reality/screenshots')

let runtime = null

try {
  await mkdir(screenshotsDir, { recursive: true })
  runtime = await connectAndroidRuntime()
  await runtime.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await runtime.page.screenshot({ path: path.join(screenshotsDir, 'smoke-login.png'), fullPage: true })
  await writeInfrastructureReceipt({ infrastructure: 'PASS', metadata: runtime.metadata })
  process.stdout.write(`Android infrastructure PASS: ${JSON.stringify(runtime.metadata)}\n`)
} catch (error) {
  const outcome = classifyInfrastructureError(error)
  await writeInfrastructureReceipt({ infrastructure: outcome, metadata: runtime?.metadata ?? null, error })
  process.stderr.write(`Android infrastructure ${outcome}: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 2
} finally {
  await runtime?.context?.close().catch(() => {})
  await runtime?.device?.close().catch(() => {})
}
