import { execFileSync } from 'node:child_process'
import test from 'node:test'

const contracts = [
  'scripts/experience/provision-hva-baseline.test.mjs',
  'scripts/experience/provision-hva-baseline-lease.test.mjs',
  'scripts/experience/provision-hva-baseline-hash.test.mjs',
]

for (const contract of contracts) {
  test(`HVA-GOV-01 Task 7 contract: ${contract}`, () => {
    execFileSync(process.execPath, ['--test', contract], {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
  })
}
