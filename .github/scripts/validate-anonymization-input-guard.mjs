import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync('ops/anonymization-input-guard.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const freeTextGuard = fs.readFileSync('product/src/core/privacy/anonymization-guard.ts', 'utf8')
const binaryGuard = fs.readFileSync('product/src/core/privacy/binary-anonymization-preflight.ts', 'utf8')
const noteAction = fs.readFileSync('product/src/app/knowledge/anonymous-actions.ts', 'utf8')
const uploadRoute = fs.readFileSync('product/src/app/api/knowledge/upload/route.ts', 'utf8')
const uploader = fs.readFileSync('product/src/app/knowledge/KnowledgeFileUploader.tsx', 'utf8')

const fail = (message) => {
  console.error(`Anonymization input guard invalid: ${message}`)
  process.exit(1)
}

if (contract.schemaVersion !== 2 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_VISUAL_BINARY_RESIDUAL') fail('state must preserve visual binary residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text server guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')

const binary = contract.guards?.ANON_BINARY_UPLOAD_GUARD
if (binary?.state !== 'SATISFIED_WITH_VISUAL_DENY') fail('binary guard state mismatch')
if (binary.contentPrePersistenceInspection !== true || binary.storageWriteOccursOnlyAfterPreflightPass !== true) fail('binary pre-storage enforcement missing')
if (binary.externalAiUsedForPrivacyPreflight !== false) fail('privacy preflight must stay local')
if (binary.imagePolicy !== 'DENY_UNTIL_LOCAL_VISUAL_PREFLIGHT_EXISTS') fail('image fail-closed policy missing')

if (contract.result?.binaryTextualContentPrePersistenceGuard !== 'PASS') fail('binary textual preflight must pass')
if (contract.result?.visualBinaryContentAdmission !== 'DENIED_PENDING_LOCAL_PREFLIGHT') fail('visual binary content must remain denied')
if (contract.result?.fullVisualAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!Array.isArray(contract.residuals) || !contract.residuals.some((item) => item.id === 'ANON_VISUAL_BINARY_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('visual binary preflight residual missing')
if (contract.residuals.some((item) => item.id === 'ANON_BINARY_CONTENT_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('broad binary preflight residual should be narrowed')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
for (const token of ['inspectBinaryForAnonymousPilot', 'PDF_NATIVE_TEXT', 'DOCX_TEXT_ONLY', 'word/media/', 'privacy_preflight_unavailable']) if (!binaryGuard.includes(token)) fail(`binary preflight token missing: ${token}`)
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes('inspectBinaryForAnonymousPilot') || !uploadRoute.includes('supabase.storage.from') || uploadRoute.indexOf('inspectBinaryForAnonymousPilot') > uploadRoute.indexOf('supabase.storage.from')) fail('binary preflight must execute before storage write')
if (!uploadRoute.includes("x-docente-anonymous-confirmed") || !uploadRoute.includes('inspectFilenameForPilot') || !uploadRoute.includes('inspectFreeTextForPilot')) fail('upload server preflight incomplete')
if (!uploader.includes('privacyConfirmed') || !uploader.includes('x-docente-anonymous-confirmed')) fail('human upload attestation UI missing')

console.log('P7 anonymization input guard PASS: text and inspectable binary content guarded before persistence; visual-only binary content denied; Tier 2 NOT_ADMITTED')
