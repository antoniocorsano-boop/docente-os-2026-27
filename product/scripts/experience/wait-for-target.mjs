import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const baseUrl = (process.env.E2E_BASE_URL ?? '').replace(/\/$/, '')
const target = process.env.EXPECTED_COMMIT ?? process.env.GITHUB_SHA ?? ''
const attempts = Number(process.env.EXPERIENCE_WAIT_ATTEMPTS ?? 120)
const intervalMs = Number(process.env.EXPERIENCE_WAIT_INTERVAL_MS ?? 15000)
const outputDir = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

if (!baseUrl) throw new Error('E2E_BASE_URL is required')
if (!target) throw new Error('EXPECTED_COMMIT or GITHUB_SHA is required')

let last = { http: 0, deployed: '' }

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  last = await readBuildInfo()
  process.stdout.write(`Attempt ${attempt}/${attempts}: http=${last.http || '000'}, deployed=${last.deployed || 'unavailable'}, target=${target}\n`)

  if (last.deployed === target) {
    await finish('PASS', 'exact-commit', last)
    process.exit(0)
  }

  if (last.deployed && productEquivalent(last.deployed, target)) {
    await finish('PASS', 'product-equivalent', last)
    process.exit(0)
  }

  if (attempt < attempts) await sleep(intervalMs)
}

await finish('FAIL', 'deploy-stale', last)
process.stderr.write('Target did not expose an equivalent product state within the acceptance window.\n')
process.exit(1)

async function readBuildInfo() {
  try {
    const response = await fetch(`${baseUrl}/api/build-info`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' })
    let payload = {}
    try { payload = await response.json() } catch {}
    return { http: response.status, deployed: typeof payload.commit === 'string' ? payload.commit : '' }
  } catch {
    return { http: 0, deployed: '' }
  }
}

function productEquivalent(deployed, expected) {
  try {
    execFileSync('git', ['cat-file', '-e', `${deployed}^{commit}`], { stdio: 'ignore' })
    execFileSync('git', ['diff', '--quiet', deployed, expected, '--', 'product'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function finish(status, reason, info) {
  const payload = {
    schemaVersion: 1,
    status,
    reason,
    target,
    deployed: info.deployed || null,
    httpStatus: info.http || null,
    baseUrl,
    checkedAt: new Date().toISOString(),
  }
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'deployment.json'), `${JSON.stringify(payload, null, 2)}\n`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
