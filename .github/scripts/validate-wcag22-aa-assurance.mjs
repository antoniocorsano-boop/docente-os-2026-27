import fs from 'node:fs'

const matrix = JSON.parse(fs.readFileSync('ops/wcag22-aa-assurance.json', 'utf8'))
const fail = (message) => { console.error(`WCAG assurance invalid: ${message}`); process.exit(1) }

const expected = [
  '1.1.1','1.2.1','1.2.2','1.2.3','1.2.4','1.2.5','1.3.1','1.3.2','1.3.3','1.3.4','1.3.5',
  '1.4.1','1.4.2','1.4.3','1.4.4','1.4.5','1.4.10','1.4.11','1.4.12','1.4.13',
  '2.1.1','2.1.2','2.1.4','2.2.1','2.2.2','2.3.1','2.4.1','2.4.2','2.4.3','2.4.4','2.4.5','2.4.6','2.4.7','2.4.11',
  '2.5.1','2.5.2','2.5.3','2.5.4','2.5.7','2.5.8',
  '3.1.1','3.1.2','3.2.1','3.2.2','3.2.3','3.2.4','3.2.6','3.3.1','3.3.2','3.3.3','3.3.4','3.3.7','3.3.8',
  '4.1.2','4.1.3',
]

if (matrix.schemaVersion !== 1) fail('schemaVersion must be 1')
if (matrix.standard !== 'WCAG 2.2' || matrix.targetLevel !== 'AA') fail('target must remain WCAG 2.2 AA')
if (matrix.conformanceClaim !== false) fail('no conformance claim is allowed before explicit closure evidence')
if (matrix.criteriaCount !== 55) fail('criteriaCount must be 55')
if (matrix.rules?.automatedScanAloneMayEstablishConformance !== false) fail('automation cannot establish conformance alone')
if (matrix.rules?.verifiedPassRequiresReceipt !== true) fail('VERIFIED_PASS must require a receipt')
if (matrix.rules?.manualAssistiveTechnologyEvidenceRequired !== true) fail('manual assistive-technology evidence must remain required')

const allowedStatuses = new Set(matrix.statusVocabulary ?? [])
const seen = new Set()
for (const criterion of matrix.criteria ?? []) {
  if (seen.has(criterion.id)) fail(`duplicate criterion ${criterion.id}`)
  seen.add(criterion.id)
  if (!expected.includes(criterion.id)) fail(`unexpected criterion ${criterion.id}`)
  if (!['A','AA'].includes(criterion.level)) fail(`invalid level for ${criterion.id}`)
  if (!allowedStatuses.has(criterion.status)) fail(`invalid status ${criterion.status} for ${criterion.id}`)
  if (!Array.isArray(criterion.evidence) || criterion.evidence.length === 0) fail(`criterion ${criterion.id} must cite evidence or scope evidence`)
  if (typeof criterion.note !== 'string' || !criterion.note.trim()) fail(`criterion ${criterion.id} requires a note`)
  if (criterion.status === 'NOT_APPLICABLE_CURRENT_SCOPE' && !criterion.note.toLowerCase().includes('rivalut') && !criterion.note.toLowerCase().includes('nessun')) {
    fail(`N/A criterion ${criterion.id} needs an explicit current-scope reason`)
  }
  if (criterion.status === 'VERIFIED_PASS') {
    const hasReceipt = criterion.evidence.some((item) => /receipt|run|e2e|workflow/i.test(item))
    if (!hasReceipt) fail(`VERIFIED_PASS ${criterion.id} lacks a receipt-like evidence reference`)
  }
}

if (seen.size !== expected.length) fail(`matrix has ${seen.size} criteria; expected ${expected.length}`)
for (const id of expected) if (!seen.has(id)) fail(`missing criterion ${id}`)

const gaps = matrix.criteria.filter((item) => item.status === 'GAP').map((item) => item.id)
const verified = matrix.criteria.filter((item) => item.status === 'VERIFIED_PASS').length
console.log(`WCAG 2.2 AA assurance PASS: criteria=${seen.size}, gaps=${gaps.join(',') || 'none'}, verified=${verified}, conformanceClaim=${matrix.conformanceClaim}`)
