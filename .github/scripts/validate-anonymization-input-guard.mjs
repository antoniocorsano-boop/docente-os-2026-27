import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync('ops/anonymization-input-guard.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const freeTextGuard = fs.readFileSync('product/src/core/privacy/anonymization-guard.ts', 'utf8')
const noteAction = fs.readFileSync('product/src/app/knowledge/anonymous-actions.ts', 'utf8')
const uploadRoute = fs.readFileSync('product/src/app/api/knowledge/upload/route.ts', 'utf8')
const uploader = fs.readFileSync('product/src/app/knowledge/KnowledgeFileUploader.tsx', 'utf8')

const fail = (message) => {
  console.error(`Anonymization input guard invalid: ${message}`)
  process.exit(1)
}

if (contract.schemaVersion !== 1 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_BINARY_PREFLIGHT_RESIDUAL') fail('state must preserve binary residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text server guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')
if (contract.guards?.ANON_BINARY_UPLOAD_GUARD?.state !== 'PARTIAL' || contract.guards.ANON_BINARY_UPLOAD_GUARD.contentPrePersistenceInspection !== false) fail('binary residual must remain explicit')
if (contract.result?.fullAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!Array.isArray(contract.residuals) || !contract.residuals.some((item) => item.id === 'ANON_BINARY_CONTENT_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('binary preflight residual missing')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes("x-docente-anonymous-confirmed") || !uploadRoute.includes('inspectFilenameForPilot') || !uploadRoute.includes('inspectFreeTextForPilot')) fail('upload server preflight incomplete')
if (!uploader.includes('privacyConfirmed') || !uploader.includes('x-docente-anonymous-confirmed')) fail('human upload attestation UI missing')

console.log('P7 anonymization input guard PASS: free text and text files guarded pre-persistence; binary content preflight remains explicit residual; Tier 2 NOT_ADMITTED')
