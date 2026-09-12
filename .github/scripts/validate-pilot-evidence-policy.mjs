import fs from 'node:fs'

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))
const fail = (message) => {
  console.error(`Pilot evidence invalid: ${message}`)
  process.exit(1)
}

const policy = readJson('ops/pilot-evidence-policy.json')
const ledger = readJson(policy.ledgerPath ?? 'ops/pilot-evidence-ledger.json')

if (policy.schemaVersion !== 1 || ledger.schemaVersion !== 1) fail('schemaVersion must be 1')
if (policy.product !== 'DOCENTE OS' || ledger.product !== 'DOCENTE OS') fail('product must be DOCENTE OS')
if (policy.program !== 'M5_SUSTAINED_PILOT_EVIDENCE' || ledger.program !== policy.program) fail('program mismatch')
if (policy.scope !== 'SINGLE_OWNER_TIER_1_PROFESSIONAL_NON_PERSONAL' || ledger.scope !== policy.scope) fail('pilot evidence scope changed unexpectedly')
if (ledger.state !== 'COLLECTING') fail('ledger must remain COLLECTING until a separate maturity decision closes M5-02')

const privacy = policy.privacy ?? {}
for (const [key, value] of Object.entries(privacy)) {
  if (value !== false) fail(`privacy control ${key} must remain false`)
}

const governance = policy.governance ?? {}
for (const key of ['appendOnlyEvidence', 'closureRequiresNewEvidenceEntry', 'humanUseEvidenceRequiredForM502Closure']) {
  if (governance[key] !== true) fail(`governance control ${key} must remain true`)
}
for (const key of ['machineGateMayCountAsHumanUse', 'thresholdsMayBeFrozenBeforeObservedBaseline', 'selectiveSuccessOnlyReportingAllowed']) {
  if (governance[key] !== false) fail(`governance control ${key} must remain false`)
}

const allowedTypes = new Set(policy.evidenceTypes ?? [])
const allowedOutcomes = new Set(policy.outcomes ?? [])
const allowedJourneys = new Set(Object.keys(policy.journeys ?? {}))
const requiredFields = policy.requiredEntryFields ?? []
const ids = new Set()
const counts = {
  MACHINE_GATE: 0,
  RUNTIME_SMOKE: 0,
  HUMAN_USE: 0,
  FRICTION: 0,
  INCIDENT: 0,
  WORKAROUND: 0,
  RECOVERY: 0,
  ACCESSIBILITY_FINDING: 0,
}
const forbiddenKeys = new Set([
  'studentName', 'studentId', 'pupilName', 'pupilId', 'familyName', 'email', 'phone',
  'rawSchoolContent', 'rawLessonContent', 'credential', 'password', 'token', 'secret',
])

for (const [index, entry] of (ledger.entries ?? []).entries()) {
  for (const field of requiredFields) {
    if (!(field in entry)) fail(`entry ${index} missing required field ${field}`)
  }
  if (typeof entry.id !== 'string' || !entry.id) fail(`entry ${index} has invalid id`)
  if (ids.has(entry.id)) fail(`duplicate evidence id ${entry.id}`)
  ids.add(entry.id)
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(entry.observedAt)) fail(`entry ${entry.id} has invalid observedAt`)
  if (!allowedTypes.has(entry.evidenceType)) fail(`entry ${entry.id} has unsupported evidenceType ${entry.evidenceType}`)
  if (!allowedOutcomes.has(entry.outcome)) fail(`entry ${entry.id} has unsupported outcome ${entry.outcome}`)
  if (entry.journeyId !== null && !allowedJourneys.has(entry.journeyId)) fail(`entry ${entry.id} references unknown journey ${entry.journeyId}`)
  if (typeof entry.environment !== 'string' || !entry.environment) fail(`entry ${entry.id} must declare environment`)
  if (typeof entry.sourceRef !== 'string' || !entry.sourceRef.trim()) fail(`entry ${entry.id} must declare sourceRef`)
  if (typeof entry.summary !== 'string' || !entry.summary.trim()) fail(`entry ${entry.id} must have a non-empty summary`)
  if (entry.containsSchoolPersonalData !== false) fail(`entry ${entry.id} cannot contain school personal data`)
  if (typeof entry.requiresFollowUp !== 'boolean') fail(`entry ${entry.id} requiresFollowUp must be boolean`)
  if (!(entry.relatedFindingId === null || typeof entry.relatedFindingId === 'string')) fail(`entry ${entry.id} relatedFindingId must be string or null`)
  for (const key of Object.keys(entry)) {
    if (forbiddenKeys.has(key)) fail(`entry ${entry.id} contains forbidden field ${key}`)
  }
  counts[entry.evidenceType] += 1
}

const rollup = ledger.rollup ?? {}
const expectedRollup = {
  machineGateEntries: counts.MACHINE_GATE,
  runtimeSmokeEntries: counts.RUNTIME_SMOKE,
  humanUseEntries: counts.HUMAN_USE,
  frictionEntries: counts.FRICTION,
  incidentEntries: counts.INCIDENT,
  workaroundEntries: counts.WORKAROUND,
  recoveryEntries: counts.RECOVERY,
  accessibilityFindingEntries: counts.ACCESSIBILITY_FINDING,
}
for (const [key, expected] of Object.entries(expectedRollup)) {
  if (rollup[key] !== expected) fail(`rollup ${key}=${rollup[key]} does not match entries=${expected}`)
}

const humanWindow = ledger.humanUseWindow ?? {}
if (counts.HUMAN_USE === 0) {
  if (ledger.humanUseEvidenceSufficient !== false) fail('humanUseEvidenceSufficient must be false with zero HUMAN_USE entries')
  if (humanWindow.status !== 'NOT_YET_SUFFICIENT') fail('human use window must remain NOT_YET_SUFFICIENT with zero HUMAN_USE entries')
  if (humanWindow.observedOperationalDays !== 0) fail('observedOperationalDays must be zero with no HUMAN_USE evidence')
}
if (ledger.thresholdsFrozen === true && ledger.humanUseEvidenceSufficient !== true) fail('thresholds cannot be frozen before sufficient human-use evidence')
if (rollup.m502ClosureAuthorized === true && ledger.humanUseEvidenceSufficient !== true) fail('M5-02 closure cannot be authorized without sufficient human-use evidence')
if (counts.MACHINE_GATE > 0 && counts.HUMAN_USE === 0 && rollup.m502ClosureAuthorized === true) fail('machine gates cannot close M5-02')

const openFindingIds = new Set()
for (const finding of ledger.openFindings ?? []) {
  if (typeof finding.id !== 'string' || !finding.id) fail('open finding missing id')
  if (openFindingIds.has(finding.id)) fail(`duplicate open finding ${finding.id}`)
  openFindingIds.add(finding.id)
  if (finding.containsSchoolPersonalData !== false) fail(`finding ${finding.id} cannot contain school personal data`)
}

console.log(`Pilot evidence policy PASS: entries=${ledger.entries.length}, humanUse=${counts.HUMAN_USE}, closureAuthorized=${rollup.m502ClosureAuthorized}`)
