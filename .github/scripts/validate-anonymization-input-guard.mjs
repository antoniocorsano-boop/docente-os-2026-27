import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync('ops/anonymization-input-guard.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const freeTextGuard = fs.readFileSync('product/src/core/privacy/anonymization-guard.ts', 'utf8')
const binaryGuard = fs.readFileSync('product/src/core/privacy/binary-anonymization-preflight.ts', 'utf8')
const pdfClassifier = fs.readFileSync('product/src/core/privacy/local-pdf-visual-preflight.ts', 'utf8')
const docxSemantic = fs.readFileSync('product/src/core/privacy/local-docx-media-semantic-preflight.ts', 'utf8')
const noteAction = fs.readFileSync('product/src/app/knowledge/anonymous-actions.ts', 'utf8')
const uploadRoute = fs.readFileSync('product/src/app/api/knowledge/upload/route.ts', 'utf8')
const uploader = fs.readFileSync('product/src/app/knowledge/KnowledgeFileUploader.tsx', 'utf8')
const imageWorkbench = fs.readFileSync('product/src/app/knowledge/LocalImagePrivacyWorkbench.tsx', 'utf8')
const pdfWorkbench = fs.readFileSync('product/src/app/knowledge/LocalSinglePagePdfPrivacyWorkbench.tsx', 'utf8')
const docxSemanticWorkbench = fs.readFileSync('product/src/app/knowledge/LocalDocxSemanticMediaPrivacyWorkbench.tsx', 'utf8')

const fail = (message) => { console.error(`Anonymization input guard invalid: ${message}`); process.exit(1) }

if (contract.schemaVersion !== 7 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_LONG_PDF_AND_UNSUPPORTED_DOCX_MEDIA_RESIDUAL') fail('state must preserve bounded visual residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')

const binary = contract.guards?.ANON_BINARY_UPLOAD_GUARD
if (binary?.state !== 'SATISFIED_WITH_BOUNDED_LOCAL_VISUAL_AND_TEXT_DERIVATIVES') fail('binary guard state mismatch')
if (binary.contentPrePersistenceInspection !== true || binary.storageWriteOccursOnlyAfterPreflightPass !== true) fail('binary pre-storage enforcement missing')
if (binary.externalAiUsedForPrivacyPreflight !== false) fail('privacy preflight must stay local')
if (binary.pdfPolicy !== 'ALLOW_NATIVE_TEXT_OR_LOCAL_HUMAN_REVIEWED_PNG_DERIVATIVE_UP_TO_5_PAGES; DENY_VISUAL_PDF_OVER_5_PAGES') fail('bounded PDF policy mismatch')
if (binary.docxPolicy !== 'ALLOW_TEXT_ONLY_DOCX_OR_LOCAL_REVIEWED_TEXT_DERIVATIVE_OR_BOUNDED_LOCAL_HUMAN_REVIEWED_SEMANTIC_PNG; ORIGINAL_DOCX_WITH_MEDIA_DENIED') fail('DOCX bounded semantic derivative policy mismatch')

const image = contract.guards?.ANON_IMAGE_LOCAL_VISUAL_GUARD
if (image?.state !== 'SATISFIED_WITH_HUMAN_REVIEW' || image.originalBytesLeaveDevice !== false || image.localRedactionAvailable !== true) fail('image local guard missing')
if (image.derivedFormat !== 'image/png' || image.serverRequiresVisualReviewProof !== true || image.serverVerifiesPngSignature !== true) fail('image derivative/server proof mismatch')
if (!['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].every((chunk) => image.serverRejectsKnownMetadataChunks?.includes(chunk))) fail('PNG metadata deny list incomplete')

const pdf = contract.guards?.ANON_BOUNDED_PDF_LOCAL_VISUAL_GUARD
if (pdf?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('bounded PDF guard missing')
if (pdf.classificationRunsBeforeUpload !== true || pdf.visualAdmissionScope !== 'PDF_WITH_VISUAL_RESIDUAL_UP_TO_5_PAGES' || pdf.pageCap !== 5 || pdf.overPageCapAllowed !== false) fail('bounded PDF classification/cap mismatch')
if (pdf.originalPdfBytesLeaveDeviceOnVisualPath !== false || pdf.allPagesLocalCanvasRenderRequired !== true || pdf.wholeDocumentHumanReviewRequired !== true || pdf.localRedactionAvailable !== true) fail('bounded PDF local workflow invariants missing')
if (pdf.derivedFormat !== 'image/png' || pdf.derivedFilename !== 'scansione-anonima.png' || pdf.serverUsesExistingReviewedPngGuard !== true) fail('bounded PDF derivative mismatch')

const docxText = contract.guards?.ANON_DOCX_MEDIA_TEXT_DERIVATIVE_GUARD
if (docxText?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('DOCX media text derivative guard missing')
if (docxText.originalDocxBytesLeaveDeviceOnDerivativePath !== false || docxText.derivedFormat !== 'text/plain' || docxText.derivedFilename !== 'documento-anonimo.txt') fail('DOCX text derivative boundary mismatch')
if (docxText.embeddedMediaPreserved !== false || docxText.mediaPreservationAllowed !== false || docxText.serverUsesExistingTextGuard !== true) fail('DOCX text-only path must remain non-media-preserving')

const docxSemanticGuard = contract.guards?.ANON_DOCX_BOUNDED_SEMANTIC_MEDIA_GUARD
if (docxSemanticGuard?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('bounded DOCX semantic media guard missing')
if (docxSemanticGuard.classificationRunsBeforeUpload !== true || docxSemanticGuard.semanticExtractionLocal !== true || docxSemanticGuard.mammothHtmlRendered !== false) fail('DOCX semantic local extraction invariants missing')
if (!['image/png', 'image/jpeg', 'image/webp'].every((type) => docxSemanticGuard.allowedEmbeddedMediaTypes?.includes(type))) fail('DOCX semantic media type scope mismatch')
if (docxSemanticGuard.maxMediaItems !== 8 || docxSemanticGuard.maxMediaItemBytes !== 4194304 || docxSemanticGuard.maxMediaBytes !== 8388608) fail('DOCX semantic media limits mismatch')
if (docxSemanticGuard.textEditableBeforeDerivative !== true || docxSemanticGuard.textD0D1GuardRequired !== true) fail('DOCX semantic text review invariants missing')
if (docxSemanticGuard.perMediaHumanReviewRequired !== true || docxSemanticGuard.allMediaReviewedBeforeComposition !== true || docxSemanticGuard.localImagePrivacyWorkbenchReused !== true || docxSemanticGuard.wholeDocumentHumanReviewRequired !== true) fail('DOCX semantic human review invariants missing')
if (docxSemanticGuard.originalDocxBytesLeaveDeviceOnDerivativePath !== false || docxSemanticGuard.originalEmbeddedMediaLeaveDevice !== false) fail('DOCX semantic originals must stay local')
if (docxSemanticGuard.derivedFormat !== 'image/png' || docxSemanticGuard.derivedFilename !== 'documento-semantico-anonimo.png' || docxSemanticGuard.serverUsesExistingReviewedPngGuard !== true) fail('DOCX semantic derivative/server proof mismatch')
if (docxSemanticGuard.wordLayoutPreservationClaimed !== false || docxSemanticGuard.unsupportedOrOverBudgetMediaFailClosed !== true) fail('DOCX semantic scope must remain bounded and non-layout-preserving')
if (docxSemanticGuard.automatedVisualPiiDetection !== false || docxSemanticGuard.externalAiUsed !== false) fail('DOCX semantic guard must not overclaim automation')

if (contract.result?.boundedPdfLocalVisualPreflight !== 'PASS_WITH_HUMAN_REVIEW') fail('bounded PDF result missing')
if (contract.result?.longPdfVisualAdmission !== 'DENIED_OVER_5_PAGES') fail('long PDFs must stay denied')
if (contract.result?.docxMediaTextOnlyDerivative !== 'PASS_WITH_HUMAN_REVIEW') fail('DOCX text-only derivative result missing')
if (contract.result?.docxSemanticMediaDerivative !== 'PASS_WITH_HUMAN_REVIEW') fail('DOCX semantic media derivative result missing')
if (contract.result?.docxEmbeddedMediaAdmission !== 'BOUNDED_TEXT_OR_SEMANTIC_PNG_DERIVATIVE') fail('DOCX bounded embedded-media admission mismatch')
if (contract.result?.docxMediaPreservationAdmission !== 'BOUNDED_SEMANTIC_DERIVATIVE_ONLY' || contract.result?.docxOriginalLayoutPreservationAdmission !== 'DENIED') fail('DOCX semantic preservation scope mismatch')
if (contract.result?.fullVisualAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!contract.residuals?.some((item) => item.id === 'ANON_LONG_PDF_AND_UNSUPPORTED_DOCX_MEDIA_PREFLIGHT' && item.state === 'NOT_SATISFIED' && item.blocksClaim === 'FULL_VISUAL_ANONYMIZATION_INPUT_ENFORCEMENT')) fail('bounded residual missing')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
for (const token of ['inspectBinaryForAnonymousPilot', 'PDF_NATIVE_TEXT', 'DOCX_TEXT_ONLY', 'IMAGE_LOCAL_REVIEWED_PNG', 'PNG_METADATA_CHUNKS', 'word/media/']) if (!binaryGuard.includes(token)) fail(`binary preflight token missing: ${token}`)
for (const token of ['MULTI_PAGE_VISUAL_REVIEWABLE', 'MULTI_PAGE_VISUAL_BLOCKED', 'MAX_LOCAL_VISUAL_PDF_PAGES', 'classifyLocalPdfForVisualPreflight']) if (!pdfClassifier.includes(token)) fail(`PDF classifier token missing: ${token}`)
for (const token of ['inspectDocxForLocalSemanticDerivative', 'mammoth.images.imgElement', 'readAsArrayBuffer', 'MAX_LOCAL_DOCX_MEDIA_ITEMS', 'MAX_LOCAL_DOCX_MEDIA_BYTES', 'MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES', "'image/png'", "'image/jpeg'", "'image/webp'", 'externalFileAccess: false', 'includeEmbeddedStyleMap: false', 'DOCX_REFERENCED_MEDIA_SEMANTIC_REVIEWABLE']) if (!docxSemantic.includes(token)) fail(`DOCX semantic-preflight token missing: ${token}`)
if (docxSemantic.includes('dangerouslySetInnerHTML') || docxSemantic.includes('innerHTML =')) fail('DOCX semantic preflight must not inject Mammoth HTML into the DOM')
for (const token of ['LocalImagePrivacyWorkbench', "'TEXT_ONLY'", "'PRESERVE_MEDIA'", "'documento-anonimo.txt'", "'documento-semantico-anonimo.png'", 'composeSemanticPng', 'canvas.toBlob', 'wholeReviewConfirmed', 'allMediaReviewed', 'layout Word originale non venga preservato']) if (!docxSemanticWorkbench.includes(token)) fail(`DOCX semantic workbench token missing: ${token}`)
if (docxSemanticWorkbench.includes('dangerouslySetInnerHTML') || docxSemanticWorkbench.includes('innerHTML =')) fail('DOCX semantic workbench must not render untrusted Mammoth HTML')
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes('inspectBinaryForAnonymousPilot') || uploadRoute.indexOf('inspectBinaryForAnonymousPilot') > uploadRoute.indexOf('supabase.storage.from')) fail('binary preflight must precede storage write')
if (!uploader.includes('LocalDocxSemanticMediaPrivacyWorkbench') || !uploader.includes('preparedDocxFile') || !uploader.includes("preparedDocxFile?.type === 'image/png'") || !uploader.includes("x-docente-local-visual-preflight") || !uploader.includes("reviewed-derived-png")) fail('DOCX semantic PNG is not wired through the existing reviewed-PNG proof')
if (!uploader.includes("preparedDocxFile?.type === 'text/plain'")) fail('DOCX text-only derivative path must remain wired')
for (const token of ['createImageBitmap', 'fillRect', 'canvas.toBlob']) if (!imageWorkbench.includes(token)) fail(`image workbench token missing: ${token}`)
for (const token of ['getDocumentProxy', 'MAX_LOCAL_VISUAL_PDF_PAGES', 'page.render', 'canvas.toBlob', "'scansione-anonima.png'", 'PDF resta nel browser', 'count > MAX_LOCAL_VISUAL_PDF_PAGES']) if (!pdfWorkbench.includes(token)) fail(`bounded PDF workbench token missing: ${token}`)
if (!binaryGuard.includes("return unavailable('Il DOCX contiene immagini o media incorporati")) fail('original DOCX with embedded media must remain server-denied')

console.log('P7 anonymization input guard PASS: canonical schema 7 records bounded DOCX semantic PNG admission with per-media local human review; text-only DOCX remains available; original DOCX/media stay local; long PDFs plus unsupported/over-budget or layout-preserving DOCX cases remain denied; full visual enforcement is not claimed; Tier 2 NOT_ADMITTED')
