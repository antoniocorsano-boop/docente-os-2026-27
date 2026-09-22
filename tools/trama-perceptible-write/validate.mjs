import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const manifestPath = 'ops/trama-perceptible-write.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

function fail(message) {
  console.error('TRAMA-PW-01 FAIL: ' + message)
  process.exit(1)
}

if (manifest.contract !== 'TRAMA-PW-01' || manifest.version !== 1) fail('invalid contract identity')
if (manifest.rule !== 'NO_SILENT_USER_INITIATED_WRITES') fail('silent-write rule missing')

const required = [
  'intent','pendingWhenAsync','explicitSuccess','explicitFailure','readableResultState',
  'assistiveAnnouncement','nonColorOnly','criticalWriteNotToastOnly','implicitApprovalForbidden',
]
for (const key of required) if (manifest.guarantees?.[key] !== true) fail('required guarantee disabled: ' + key)
if (manifest.enforcement?.changedWriteRequiresFeedbackEvidence !== true) fail('feedback evidence enforcement disabled')
if (manifest.enforcement?.changedWriteRequiresTestEvidence !== true) fail('test evidence enforcement disabled')
if (manifest.enforcement?.failClosed !== true) fail('gate must fail closed')

const base = process.env.TRAMA_PW_BASE_SHA
const head = process.env.TRAMA_PW_HEAD_SHA
if (!base || !head || /^0+$/.test(base)) {
  console.log('TRAMA-PW-01 PASS: manifest validated; diff unavailable')
  process.exit(0)
}

const changed = execFileSync('git', ['diff', '--name-only', base + '...' + head], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean)

const sourceFiles = changed.filter((p) => !p.startsWith('tools/trama-perceptible-write/') && /\.(tsx?|jsx?|mjs|cjs)$/.test(p) && fs.existsSync(p))
const contents = sourceFiles.map((path) => ({ path, text: fs.readFileSync(path, 'utf8') }))

const mutationPattern = /(form\s+action=|useActionState|onSubmit\s*=|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(|localStorage\.setItem|indexedDB|repository\.(accept|dismiss|revise|add|save|create|update|remove|delete)\s*\(|\bredirect\s*\()/i
const mutationFiles = contents.filter((f) => mutationPattern.test(f.text))

if (!mutationFiles.length) {
  console.log('TRAMA-PW-01 PASS: no changed user-facing mutation candidate')
  process.exit(0)
}

const feedbackPattern = /(aria-live|role=["']status["']|role=["']alert["']|toast|feedback|designNotice|notice|pending|success|error|riuscit|fallit|salvat|aggiunt|rimoss|confermat)/i
const feedbackFiles = contents.filter((f) => feedbackPattern.test(f.text))
if (!feedbackFiles.length) fail('mutation changed without perceivable feedback evidence')

const testFiles = contents.filter((f) => /(\.test\.|\.spec\.|\/e2e\/|\/tests?\/)/.test(f.path))
const testedFeedback = testFiles.some((f) => feedbackPattern.test(f.text) && /(success|error|status|aria-live|feedback|notice|pending|riuscit|fallit|salvat|aggiunt|rimoss|confermat)/i.test(f.text))
if (!testedFeedback) fail('mutation changed without automated test evidence for perceived feedback')

console.log(JSON.stringify({
  contract: 'TRAMA-PW-01',
  result: 'PASS',
  mutationFiles: mutationFiles.map((f) => f.path),
  feedbackFiles: feedbackFiles.map((f) => f.path),
  feedbackTests: testFiles.filter((f) => feedbackPattern.test(f.text)).map((f) => f.path),
}, null, 2))
