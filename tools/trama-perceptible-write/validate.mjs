import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { isMutationCandidate } from './lib.mjs'
import { requireComparison, validateEvidenceModel } from './engine.mjs'

const contract = JSON.parse(fs.readFileSync('ops/trama-perceptible-write.json','utf8'))
const surfaces = JSON.parse(fs.readFileSync('ops/trama-perceptible-write-surfaces.json','utf8'))
const fail = (m) => { console.error('TRAMA-PW-01 FAIL: ' + m); process.exit(1) }

if (contract.contract !== 'TRAMA-PW-01' || contract.version !== 1) fail('invalid contract identity')
if (contract.rule !== 'NO_SILENT_USER_INITIATED_WRITES') fail('silent-write rule missing')
if (surfaces.contract !== 'TRAMA-PW-01' || surfaces.version !== 1 || surfaces.product !== 'Docente OS') fail('invalid surface manifest')

for (const key of ['intent','pendingWhenAsync','explicitSuccess','explicitFailure','readableResultState','assistiveAnnouncement','nonColorOnly','criticalWriteNotToastOnly','implicitApprovalForbidden']) {
  if (contract.guarantees?.[key] !== true) fail('required guarantee disabled: ' + key)
}
if (contract.enforcement?.changedWriteRequiresFeedbackEvidence !== true ||
    contract.enforcement?.changedWriteRequiresTestEvidence !== true ||
    contract.enforcement?.failClosed !== true) fail('enforcement must fail closed')

const base = process.env.TRAMA_PW_BASE_SHA
const head = process.env.TRAMA_PW_HEAD_SHA
const comparisonErrors = requireComparison(base,head)
if (comparisonErrors.length) fail(comparisonErrors.join('; '))

const nameStatus = execFileSync('git',['diff','--name-status','--find-renames',base + '...' + head],{encoding:'utf8'})
  .trim().split('\n').filter(Boolean)

const changes = nameStatus.map((line) => {
  const parts = line.split('\t')
  const status = parts[0]
  const path = status.startsWith('R') ? parts[2] : parts[1]
  return {status,path}
}).filter((x)=>x.path && !x.path.startsWith('tools/trama-perceptible-write/'))

const existingSourceChanges = changes
  .filter((x)=>!x.status.startsWith('D') && /\.(tsx?|jsx?|mjs|cjs)$/.test(x.path) && fs.existsSync(x.path))
  .map((x)=>({...x,text:fs.readFileSync(x.path,'utf8')}))

const mutationPaths = existingSourceChanges.filter((f)=>isMutationCandidate(f.text)).map((f)=>f.path)
const deletedPaths = changes.filter((x)=>x.status.startsWith('D')).map((x)=>x.path)
const trackedFiles = execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(Boolean)

let baseSurfaces = []
try {
  baseSurfaces = JSON.parse(
    execFileSync('git',['show',base + ':ops/trama-perceptible-write-surfaces.json'],{encoding:'utf8'})
  ).surfaces ?? []
} catch {}

const errors = validateEvidenceModel({
  surfaces: surfaces.surfaces ?? [],
  mutationPaths,
  deletedPaths,
  trackedFiles,
  baseSurfaces,
  exists: (p)=>fs.existsSync(p),
  readFile: (p)=>fs.readFileSync(p,'utf8'),
})
if (errors.length) fail(errors.join('\n'))

console.log(JSON.stringify({
  contract:'TRAMA-PW-01',
  result:'PASS',
  changedMutationFiles:mutationPaths,
  declaredSurfaces:(surfaces.surfaces ?? []).map((s)=>s.id)
},null,2))
