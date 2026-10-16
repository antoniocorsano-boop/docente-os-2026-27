import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import '../../../product/scripts/experience/cpri-runtime-preflight.test.mjs'

const workflow = readFileSync(
  new URL('../../workflows/browser-certification-orchestrator.yml', import.meta.url),
  'utf8',
)
const cliUrl = new URL('../../../product/scripts/experience/cpri-runtime-preflight-cli.mjs', import.meta.url)
const cliExists = existsSync(cliUrl)
const cli = cliExists ? readFileSync(cliUrl, 'utf8') : ''

test('browser certification enforces CPRI runtime preflight before dependent browser gates', () => {
  const cpriStep = '- name: Enforce CPRI runtime preflight'
  const hvaStep = '- name: Run Human + Visual Acceptance'
  const cpriIndex = workflow.indexOf(cpriStep)
  const hvaIndex = workflow.indexOf(hvaStep)

  assert.ok(cpriIndex >= 0, 'browser orchestrator must declare the CPRI runtime preflight step')
  assert.ok(hvaIndex >= 0, 'browser orchestrator must retain the HVA step')
  assert.ok(cpriIndex < hvaIndex, 'CPRI runtime preflight must execute before HVA and dependent browser gates')
  assert.match(workflow, /run: node scripts\/experience\/cpri-runtime-preflight-cli\.mjs/)
  assert.match(workflow, /CPRI_PREFLIGHT_OUTPUT: test-results\/experience\/cpri-runtime-preflight\.json/)
  assert.doesNotMatch(
    workflow.slice(cpriIndex, hvaIndex),
    /continue-on-error:\s*true/,
    'CPRI runtime preflight must fail closed rather than continue on error',
  )
})

test('P6 measures the fresh shared runtime before stateful HVA and WCAG suites', () => {
  const cpriIndex = workflow.indexOf('- name: Enforce CPRI runtime preflight')
  const p6Index = workflow.indexOf('- name: Run P6 performance baseline')
  const hvaIndex = workflow.indexOf('- name: Run Human + Visual Acceptance')
  const wcagIndex = workflow.indexOf('- name: Run WCAG 2.2 AA automated assurance')

  assert.ok(cpriIndex >= 0, 'browser orchestrator must retain the CPRI runtime preflight')
  assert.ok(p6Index >= 0, 'browser orchestrator must declare the P6 performance gate')
  assert.ok(hvaIndex >= 0, 'browser orchestrator must retain HVA')
  assert.ok(wcagIndex >= 0, 'browser orchestrator must retain WCAG assurance')
  assert.ok(cpriIndex < p6Index, 'P6 must run only after the fail-closed CPRI runtime preflight')
  assert.ok(p6Index < hvaIndex, 'P6 must run before HVA can load and prefetch authenticated routes')
  assert.ok(p6Index < wcagIndex, 'P6 must run before WCAG can load and prefetch authenticated routes')
})

test('CPRI browser preflight CLI performs governed AAL2 authentication before reading runtime state', () => {
  assert.equal(cliExists, true, 'browser certification requires a concrete CPRI runtime preflight CLI')
  assert.match(cli, /createClient/)
  assert.match(cli, /signInWithPassword/)
  assert.match(cli, /listFactors/)
  assert.match(cli, /challengeAndVerify/)
  assert.match(cli, /getAuthenticatorAssuranceLevel/)
  assert.match(cli, /currentLevel\s*!==\s*['"]aal2['"]/)
  assert.match(cli, /runCpriRuntimePreflight/)
})
