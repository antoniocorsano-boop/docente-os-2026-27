import { execFileSync } from 'node:child_process'
import test from 'node:test'

test('HVA-GOV-01 Task 7 provisioning contracts run under native Node ESM', () => {
  execFileSync(
    process.execPath,
    [
      '--test',
      'scripts/experience/provision-hva-baseline.test.mjs',
      'scripts/experience/provision-hva-baseline-lease.test.mjs',
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
    },
  )
})
