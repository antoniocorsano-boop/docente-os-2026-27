import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const workflowPath = path.resolve(here, '../../../.github/workflows/experience-acceptance.yml')
const workflow = fs.readFileSync(workflowPath, 'utf8')

test('HVA workflow exposes a fail-closed exact-SHA application recheck', () => {
  assert.match(workflow, /- application_recheck\b/, 'workflow_dispatch must expose application_recheck')
  assert.match(workflow, /\n\s+pr_number:\n/, 'workflow_dispatch must accept pr_number')
  assert.match(workflow, /\n\s+expected_sha:\n/, 'workflow_dispatch must accept expected_sha')
  assert.match(
    workflow,
    /github\.event_name == 'pull_request'.*workflow_dispatch.*application_recheck/,
    'application HVA job must run for PR events and explicit application rechecks',
  )
  assert.match(workflow, /id: candidate\b/, 'application HVA must resolve one canonical candidate')
  assert.match(workflow, /github\.rest\.pulls\.get/, 'recheck must read the live PR head from GitHub')
  assert.match(workflow, /pr\.state !== 'open'/, 'recheck must reject a closed PR')
  assert.match(workflow, /pr\.head\.repo\?\.full_name/, 'recheck must reject an unexpected head repository')
  assert.match(workflow, /pr\.head\.sha !== expectedSha/, 'recheck must reject an SHA mismatch')
  assert.match(
    workflow,
    /ref: \$\{\{ steps\.candidate\.outputs\.sha \}\}/,
    'checkout must use the resolved exact SHA',
  )
  assert.match(
    workflow,
    /EXPECTED_COMMIT: \$\{\{ steps\.candidate\.outputs\.sha \}\}/,
    'acceptance receipt must bind to the resolved exact SHA',
  )
  assert.match(
    workflow,
    /const testedSha = '\$\{\{ steps\.candidate\.outputs\.sha \}\}'/,
    'status publication must bind to the resolved exact SHA',
  )
  assert.match(
    workflow,
    /workflow_dispatch.*inputs\.target != 'application_recheck'/,
    'runtime HVA must not run during an application exact-SHA recheck',
  )
})
