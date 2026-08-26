import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync('ops/anonymization-input-guard.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const freeTextGuard = fs.readFileSync('product/src/core/privacy/anonymization-guard.ts', 'utf8')
const binaryGuard = fs.readFileSync('product/src/core/privacy/binary-anonymization-preflight.ts', 'utf8')
const noteAction = fs.readFileSync('product/src/app/knowledge/anonymous-actions.ts', 'utf8')
const uploadRoute = fs.readFileSync('product/src/app/api/knowledge/upload/route.ts', 'utf8')
const uploader = fs.readFileSync('product/src/app/knowledge/KnowledgeFileUploader.tsx', 'utf8')
const imageWorkbench = fs.readFileSync('product/src/app/knowledge/LocalImagePrivacyWorkbench.tsx', 'utf8')

const fail = (message) => {
  console.error(`Anonymization input guard invalid: ${message}`)
  process.exit(1)
}

if (contract.schemaVersion !== 3 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_SCANNED_DOCUMENT_VISUAL_RESIDUAL') fail('state must preserve only scanned-document visual residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text server guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')

const binary = contract.guards?.ANON_BINARY_UPLOAD_GUARD
if (binary?.state !== 'SATISFIED_WITH_SCANNED_DOCUMENT_DENY') fail('binary guard state mismatch')
if (binary.contentPrePersistenceInspection !== true || binary.storageWriteOccursOnlyAfterPreflightPass !== true) fail('binary pre-storage enforcement missing')
if (binary.externalAiUsedForPrivacyPreflight !== false) fail('privacy preflight must stay local')
if (binary.imagePolicy !== 'ALLOW_ONLY_LOCAL_HUMAN_REVIEWED_REDACTABLE_METADATA_STRIPPED_PNG') fail('image local-review policy missing')

const image = contract.guards?.ANON_IMAGE_LOCAL_VISUAL_GUARD
if (image?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('image local visual guard missing')
if (image.originalBytesLeaveDevice !== false || image.localPreviewRequired !== true || image.localRedactionAvailable !== true) fail('image local workflow invariants missing')
if (image.derivedFormat !== 'image/png' || image.originalFilenamePersisted !== false) fail('image derivative boundary mismatch')
if (image.serverRequiresVisualReviewProof !== true || image.serverVerifiesPngSignature !== true) fail('image server proof checks missing')
if (!Array.isArray(image.serverRejectsKnownMetadataChunks) || !['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].every((chunk) => image.serverRejectsKnownMetadataChunks.includes(chunk))) fail('PNG metadata deny list incomplete')
if (image.automatedVisualPiiDetection !== false || image.externalAiUsed !== false) fail('human local review must not be misrepresented as automated AI detection')

if (contract.result?.binaryTextualContentPrePersistenceGuard !== 'PASS') fail('binary textual preflight must pass')
if (contract.result?.standaloneImageLocalVisualPreflight !== 'PASS_WITH_HUMAN_REVIEW') fail('standalone image local preflight must pass')
if (contract.result?.scannedDocumentVisualAdmission !== 'DENIED_PENDING_LOCAL_PREFLIGHT') fail('scanned documents must remain denied')
if (contract.result?.fullVisualAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!Array.isArray(contract.residuals) || !contract.residuals.some((item) => item.id === 'ANON_SCANNED_DOCUMENT_VISUAL_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('scanned-document visual residual missing')
if (contract.residuals.some((item) => ['ANON_BINARY_CONTENT_PREFLIGHT', 'ANON_VISUAL_BINARY_PREFLIGHT'].includes(item.id) && item.state === 'NOT_SATISFIED')) fail('broader visual residual should be narrowed')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
for (const token of ['inspectBinaryForAnonymousPilot', 'PDF_NATIVE_TEXT', 'DOCX_TEXT_ONLY', 'IMAGE_LOCAL_REVIEWED_PNG', 'PNG_METADATA_CHUNKS', 'word/media/']) if (!binaryGuard.includes(token)) fail(`binary preflight token missing: ${token}`)
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes('inspectBinaryForAnonymousPilot') || !uploadRoute.includes('supabase.storage.from') || uploadRoute.indexOf('inspectBinaryForAnonymousPilot') > uploadRoute.indexOf('supabase.storage.from')) fail('binary preflight must execute before storage write')
if (!uploadRoute.includes("x-docente-anonymous-confirmed") || !uploadRoute.includes("x-docente-local-visual-preflight") || !uploadRoute.includes('localVisualReview')) fail('upload server local visual proof missing')
if (!uploader.includes('LocalImagePrivacyWorkbench') || !uploader.includes('preparedImageFile') || !uploader.includes("reviewed-derived-png")) fail('image workbench is not wired to upload')
for (const token of ['createImageBitmap', 'fillRect', 'canvas.toBlob', "'image/png'", 'Nessun originale viene inviato']) if (!imageWorkbench.includes(token)) fail(`local image workbench token missing: ${token}`)

console.log('P7 anonymization input guard PASS: text and inspectable binaries guarded pre-storage; standalone images locally reviewed/redactable and metadata-stripped; scans/media remain denied; Tier 2 NOT_ADMITTED')
