import fs from 'node:fs'

const path = 'ops/asvs50-assurance.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const expectedChapters = Array.from({ length: 17 }, (_, index) => `V${index + 1}`)
const allowedStatuses = new Set(['PARTIAL', 'GAP', 'NOT_APPLICABLE_CURRENT_SCOPE', 'VERIFIED_PASS'])
const allowedFindingStatuses = new Set(['OPEN_GAP', 'CLOSED_VERIFIED'])

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

if (!Array.isArray(data.priorityFindings) || data.priorityFindings.length === 0) fail('priority finding history is required')
const findingIds = new Set()
for (const finding of data.priorityFindings) {
  if (!finding.id || findingIds.has(finding.id)) fail(`invalid/duplicate finding id ${finding.id}`)
  findingIds.add(finding.id)
  if (!/^V\d+\.\d+\.\d+$/.test(finding.requirement)) fail(`finding ${finding.id} must reference a versioned ASVS requirement`)
  if (!['L1', 'L2'].includes(finding.level)) fail(`finding ${finding.id} must be an L1/L2 requirement for the target`)
  if (!allowedFindingStatuses.has(finding.status)) fail(`invalid finding status for ${finding.id}`)
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) fail(`finding ${finding.id} needs evidence`)
  if (!String(finding.closure ?? '').trim()) fail(`finding ${finding.id} needs an explicit closure criterion`)

  if (finding.status === 'CLOSED_VERIFIED') {
    if (!/^[0-9a-f]{40}$/i.test(String(finding.implementationSha ?? ''))) {
      fail(`closed finding ${finding.id} needs an exact 40-character implementation SHA`)
    }
    if (!Array.isArray(finding.closureReceipts) || finding.closureReceipts.length < 3) {
      fail(`closed finding ${finding.id} needs at least three closure receipts`)
    }
    for (const receipt of finding.closureReceipts) {
      if (!String(receipt?.type ?? '').trim()) fail(`closed finding ${finding.id} has a receipt without type`)
      const hasRun = Number.isInteger(receipt?.runId) && receipt.runId > 0
      const hasReference = String(receipt?.reference ?? '').trim().length > 0
      if (!hasRun && !hasReference) fail(`closed finding ${finding.id} receipt needs runId or reference`)
    }
  }
}

for (const requirement of ['V3.4.3', 'V6.3.3']) {
  if (!data.priorityFindings.some((finding) => finding.requirement === requirement && finding.status === 'OPEN_GAP')) {
    fail(`known open gap ${requirement} must remain explicit until closed with receipts`)
  }
}

const v522 = data.priorityFindings.find((finding) => finding.requirement === 'V5.2.2')
if (!v522) fail('V5.2.2 finding history must remain present')
if (v522.status !== 'CLOSED_VERIFIED') fail('V5.2.2 must be CLOSED_VERIFIED only after exact-head receipts are recorded')

const openPriorityFindings = data.priorityFindings.filter((finding) => finding.status === 'OPEN_GAP').length
const closedVerifiedFindings = data.priorityFindings.filter((finding) => finding.status === 'CLOSED_VERIFIED').length

console.log(JSON.stringify({
  result: 'PASS',
  standard: `${data.standard} ${data.standardVersion}`,
  target: data.targetVerificationLevel,
  chapters: data.chapters.length,
  openPriorityFindings,
  closedVerifiedFindings,
  verificationClaim: data.verificationClaim,
  requirementLevelMappingComplete: data.requirementLevelMappingComplete,
}))
