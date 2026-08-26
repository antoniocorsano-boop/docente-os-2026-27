import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync('ops/anonymization-input-guard.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const freeTextGuard = fs.readFileSync('product/src/core/privacy/anonymization-guard.ts', 'utf8')
const binaryGuard = fs.readFileSync('product/src/core/privacy/binary-anonymization-preflight.ts', 'utf8')
const pdfClassifier = fs.readFileSync('product/src/core/privacy/local-pdf-visual-preflight.ts', 'utf8')
const noteAction = fs.readFileSync('product/src/app/knowledge/anonymous-actions.ts', 'utf8')
const uploadRoute = fs.readFileSync('product/src/app/api/knowledge/upload/route.ts', 'utf8')
const uploader = fs.readFileSync('product/src/app/knowledge/KnowledgeFileUploader.tsx', 'utf8')
const imageWorkbench = fs.readFileSync('product/src/app/knowledge/LocalImagePrivacyWorkbench.tsx', 'utf8')
const pdfWorkbench = fs.readFileSync('product/src/app/knowledge/LocalSinglePagePdfPrivacyWorkbench.tsx', 'utf8')

const fail = (message) => {
  console.error(`Anonymization input guard invalid: ${message}`)
  process.exit(1)
}

if (contract.schemaVersion !== 4 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_MULTI_PAGE_AND_DOCX_MEDIA_VISUAL_RESIDUAL') fail('state must preserve only multi-page PDF and DOCX-media visual residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text server guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')

const binary = contract.guards?.ANON_BINARY_UPLOAD_GUARD
if (binary?.state !== 'SATISFIED_WITH_RESTRICTED_LOCAL_VISUAL_DERIVATIVES') fail('binary guard state mismatch')
if (binary.contentPrePersistenceInspection !== true || binary.storageWriteOccursOnlyAfterPreflightPass !== true) fail('binary pre-storage enforcement missing')
if (binary.externalAiUsedForPrivacyPreflight !== false) fail('privacy preflight must stay local')
if (binary.imagePolicy !== 'ALLOW_ONLY_LOCAL_HUMAN_REVIEWED_REDACTABLE_METADATA_STRIPPED_PNG') fail('image local-review policy missing')
if (binary.pdfPolicy !== 'ALLOW_NATIVE_TEXT_OR_SINGLE_PAGE_LOCAL_HUMAN_REVIEWED_PNG_DERIVATIVE; DENY_MULTI_PAGE_VISUAL_RESIDUAL') fail('PDF restricted local-visual policy missing')

const image = contract.guards?.ANON_IMAGE_LOCAL_VISUAL_GUARD
if (image?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('image local visual guard missing')
if (image.originalBytesLeaveDevice !== false || image.localPreviewRequired !== true || image.localRedactionAvailable !== true) fail('image local workflow invariants missing')
if (image.derivedFormat !== 'image/png' || image.originalFilenamePersisted !== false) fail('image derivative boundary mismatch')
if (image.serverRequiresVisualReviewProof !== true || image.serverVerifiesPngSignature !== true) fail('image server proof checks missing')
if (!Array.isArray(image.serverRejectsKnownMetadataChunks) || !['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].every((chunk) => image.serverRejectsKnownMetadataChunks.includes(chunk))) fail('PNG metadata deny list incomplete')
if (image.automatedVisualPiiDetection !== false || image.externalAiUsed !== false) fail('human local review must not be misrepresented as automated AI detection')

const pdf = contract.guards?.ANON_SINGLE_PAGE_PDF_LOCAL_VISUAL_GUARD
if (pdf?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('single-page PDF local visual guard missing')
if (pdf.classificationRunsBeforeUpload !== true || pdf.visualAdmissionScope !== 'SINGLE_PAGE_WITHOUT_USABLE_NATIVE_TEXT_ONLY') fail('single-page PDF classification boundary mismatch')
if (pdf.originalPdfBytesLeaveDeviceOnVisualPath !== false || pdf.localCanvasRenderRequired !== true || pdf.localRedactionAvailable !== true) fail('single-page PDF local workflow invariants missing')
if (pdf.derivedFormat !== 'image/png' || pdf.derivedFilename !== 'scansione-anonima.png' || pdf.serverUsesExistingReviewedPngGuard !== true) fail('single-page PDF derivative boundary mismatch')
if (pdf.multiPageVisualResidualAllowed !== false || pdf.automatedVisualPiiDetection !== false || pdf.externalAiUsed !== false) fail('single-page PDF guard overclaims visual coverage')

if (contract.result?.binaryTextualContentPrePersistenceGuard !== 'PASS') fail('binary textual preflight must pass')
if (contract.result?.standaloneImageLocalVisualPreflight !== 'PASS_WITH_HUMAN_REVIEW') fail('standalone image local preflight must pass')
if (contract.result?.singlePageScannedPdfLocalVisualPreflight !== 'PASS_WITH_HUMAN_REVIEW') fail('single-page scanned PDF preflight must pass')
if (contract.result?.scannedDocumentVisualAdmission !== 'PARTIAL_SINGLE_PAGE_ONLY') fail('scanned-document admission must remain partial')
if (contract.result?.multiPagePdfVisualAdmission !== 'DENIED_PENDING_LOCAL_PREFLIGHT' || contract.result?.docxEmbeddedMediaVisualAdmission !== 'DENIED_PENDING_LOCAL_PREFLIGHT') fail('remaining visual document classes must stay denied')
if (contract.result?.fullVisualAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!Array.isArray(contract.residuals) || !contract.residuals.some((item) => item.id === 'ANON_MULTI_PAGE_AND_DOCX_MEDIA_VISUAL_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('narrow visual residual missing')
if (contract.residuals.some((item) => ['ANON_BINARY_CONTENT_PREFLIGHT', 'ANON_VISUAL_BINARY_PREFLIGHT', 'ANON_SCANNED_DOCUMENT_VISUAL_PREFLIGHT'].includes(item.id) && item.state === 'NOT_SATISFIED')) fail('broader visual residual should be retired after single-page PDF admission')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
for (const token of ['inspectBinaryForAnonymousPilot', 'PDF_NATIVE_TEXT', 'DOCX_TEXT_ONLY', 'IMAGE_LOCAL_REVIEWED_PNG', 'PNG_METADATA_CHUNKS', 'word/media/']) if (!binaryGuard.includes(token)) fail(`binary preflight token missing: ${token}`)
for (const token of ['SINGLE_PAGE_VISUAL_REVIEWABLE', 'MULTI_PAGE_VISUAL_BLOCKED', 'classifyLocalPdfForVisualPreflight']) if (!pdfClassifier.includes(token)) fail(`local PDF classifier token missing: ${token}`)
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes('inspectBinaryForAnonymousPilot') || !uploadRoute.includes('supabase.storage.from') || uploadRoute.indexOf('inspectBinaryForAnonymousPilot') > uploadRoute.indexOf('supabase.storage.from')) fail('binary preflight must execute before storage write')
if (!uploadRoute.includes("x-docente-anonymous-confirmed") || !uploadRoute.includes("x-docente-local-visual-preflight") || !uploadRoute.includes('localVisualReview')) fail('upload server local visual proof missing')
if (!uploader.includes('LocalImagePrivacyWorkbench') || !uploader.includes('LocalSinglePagePdfPrivacyWorkbench') || !uploader.includes('preparedImageFile') || !uploader.includes('preparedPdfFile') || !uploader.includes("reviewed-derived-png")) fail('local visual workbenches are not wired to upload')
for (const token of ['createImageBitmap', 'fillRect', 'canvas.toBlob', "'image/png'", 'Nessun originale viene inviato']) if (!imageWorkbench.includes(token)) fail(`local image workbench token missing: ${token}`)
for (const token of ['getDocumentProxy', 'pdf.numPages !== 1', 'page.render', 'fillRect', 'canvas.toBlob', "'scansione-anonima.png'", 'PDF resta nel browser']) if (!pdfWorkbench.includes(token)) fail(`single-page PDF workbench token missing: ${token}`)

console.log('P7 anonymization input guard PASS: text/native binaries guarded pre-storage; standalone images and single-page scanned PDFs locally reviewed/redactable as PNG derivatives; multi-page visual PDFs and DOCX media remain denied; Tier 2 NOT_ADMITTED')
