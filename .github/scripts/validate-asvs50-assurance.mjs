import fs from 'node:fs'

const path = 'ops/asvs50-assurance.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const expectedChapters = Array.from({ length: 17 }, (_, index) => `V${index + 1}`)
const allowedStatuses = new Set(['PARTIAL', 'GAP', 'NOT_APPLICABLE_CURRENT_SCOPE', 'VERIFIED_PASS'])

function fail(message) {
  console.error(`ASVS50_ASSURANCE_FAIL ${message}`)
  process.exit(1)
}

if (data.standard !== 'OWASP ASVS') fail('standard must be OWASP ASVS')
if (data.standardVersion !== '5.0.0') fail('stable baseline must be ASVS 5.0.0')
if (data.sourceTag !== 'v5.0.0') fail('sourceTag must be v5.0.0')
if (data.targetVerificationLevel !== 'L2') fail('target verification level must be L2')
if (data.verificationClaim !== false) fail('verificationClaim must remain false during incomplete mapping')
if (data.requirementLevelMappingComplete !== false) fail('requirement-level mapping is not yet complete')
if (!Array.isArray(data.chapters) || data.chapters.length !== expectedChapters.length) fail('exactly 17 ASVS chapters are required')

const chapterIds = data.chapters.map((chapter) => chapter.id)
if (new Set(chapterIds).size !== chapterIds.length) fail('duplicate chapter ids')
for (const id of expectedChapters) if (!chapterIds.includes(id)) fail(`missing chapter ${id}`)
for (const chapter of data.chapters) {
  if (!expectedChapters.includes(chapter.id)) fail(`unexpected chapter ${chapter.id}`)
  if (!allowedStatuses.has(chapter.status)) fail(`invalid status for ${chapter.id}`)
  if (chapter.status === 'VERIFIED_PASS') fail(`chapter ${chapter.id} cannot be VERIFIED_PASS before requirement-level mapping is complete`)
  if (chapter.status === 'NOT_APPLICABLE_CURRENT_SCOPE' && !String(chapter.note ?? '').trim()) fail(`N/A chapter ${chapter.id} needs a scope reason`)
  if (!Array.isArray(chapter.evidence) || chapter.evidence.length === 0) fail(`chapter ${chapter.id} needs evidence`)
}

if (!Array.isArray(data.priorityFindings) || data.priorityFindings.length === 0) fail('priority findings are required while known gaps exist')
const findingIds = new Set()
for (const finding of data.priorityFindings) {
  if (!finding.id || findingIds.has(finding.id)) fail(`invalid/duplicate finding id ${finding.id}`)
  findingIds.add(finding.id)
  if (!/^V\d+\.\d+\.\d+$/.test(finding.requirement)) fail(`finding ${finding.id} must reference a versioned ASVS requirement`)
  if (!['L1', 'L2'].includes(finding.level)) fail(`finding ${finding.id} must be an L1/L2 blocker for the target`)
  if (finding.status !== 'OPEN_GAP') fail(`known finding ${finding.id} may not be waived`)
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) fail(`finding ${finding.id} needs evidence`)
  if (!String(finding.closure ?? '').trim()) fail(`finding ${finding.id} needs an explicit closure criterion`)
}

const requiredGapRequirements = new Set(['V3.4.3', 'V5.2.2', 'V6.3.3'])
for (const requirement of requiredGapRequirements) {
  if (!data.priorityFindings.some((finding) => finding.requirement === requirement && finding.status === 'OPEN_GAP')) {
    fail(`known gap ${requirement} must remain explicit until closed with receipts`)
  }
}

console.log(JSON.stringify({
  result: 'PASS',
  standard: `${data.standard} ${data.standardVersion}`,
  target: data.targetVerificationLevel,
  chapters: data.chapters.length,
  openPriorityFindings: data.priorityFindings.length,
  verificationClaim: data.verificationClaim,
  requirementLevelMappingComplete: data.requirementLevelMappingComplete,
}))
