import fs from 'node:fs'
import path from 'node:path'

const [exitCodeRaw, exactSha, runUrl = null] = process.argv.slice(2)
const exitCode = Number(exitCodeRaw)
if (!Number.isInteger(exitCode)) {
  process.stderr.write('QL-1 receipt requires an integer Playwright exit code.\n')
  process.exit(2)
}
if (!/^[0-9a-f]{40}$/.test(exactSha ?? '')) {
  process.stderr.write('QL-1 receipt requires a 40-char exact SHA.\n')
  process.exit(2)
}

const result = exitCode === 0 ? 'PASS' : 'FAIL'
const specs = [
  'e2e/experience/surfaces.spec.mjs',
  'e2e/experience/critical-journeys.spec.mjs',
  'e2e/experience/classroom-cockpit.spec.mjs',
  'e2e/experience/lesson-materials.spec.mjs',
  'e2e/experience/lesson-register.spec.mjs',
  'e2e/experience/day-review.spec.mjs',
  'e2e/experience/tomorrow-materials.spec.mjs',
]

const receipt = {
  schema_version: 1,
  qualification_id: 'QL-1-DAILY-TEACHING-LOOP',
  exact_sha: exactSha,
  capability_ids: [
    'DOS-TODAY-NEXT',
    'DOS-TIMETABLE',
    'DOS-CALENDAR',
    'DOS-LESSON-PREP',
    'DOS-TEACHING-SESSION',
    'DOS-PLAN-UDA',
  ],
  environment: 'CI',
  scenarios: [{
    id: 'daily-teaching-loop-browser',
    result,
    evidence_ref: runUrl,
    notes: `Playwright aggregate across: ${specs.join(', ')}`,
  }],
  automated_gates: [{
    name: 'QL-1 focused browser suite',
    result,
    run_ref: runUrl,
  }],
  browser: { result, evidence_ref: runUrl },
  human_use: { result: 'NOT_RUN', evidence_ref: null },
  human_review: { result: 'PENDING', reviewed_exact_sha: null, evidence_ref: null },
  recovery: null,
  findings: result === 'PASS' ? [] : [{
    severity: 'HIGH',
    status: 'OPEN',
    summary: 'QL-1 focused browser suite failed on the exact tested SHA.',
    evidence_ref: runUrl,
  }],
  evidence_refs: [runUrl ?? `github-sha:${exactSha}`],
  completed_at: new Date().toISOString(),
}

const out = path.join('test-results', 'dos-crm', 'QL-1.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
process.exit(result === 'PASS' ? 0 : 1)
