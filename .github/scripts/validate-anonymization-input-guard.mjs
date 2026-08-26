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
const docxWorkbench = fs.readFileSync('product/src/app/knowledge/LocalDocxMediaPrivacyWorkbench.tsx', 'utf8')

const fail = (message) => { console.error(`Anonymization input guard invalid: ${message}`); process.exit(1) }

if (contract.schemaVersion !== 6 || contract.gate !== 'P7_ANONYMIZATION_INPUT_GUARD') fail('gate/schema mismatch')
if (contract.state !== 'IMPLEMENTED_WITH_LONG_PDF_AND_DOCX_MEDIA_PRESERVATION_RESIDUAL') fail('state must preserve long-PDF and DOCX-media-preservation residual')
if (contract.pilotDataBoundary?.tier2SchoolPersonalDataState !== 'NOT_ADMITTED') fail('Tier 2 boundary changed')
if (contract.guards?.ANON_FREE_TEXT_GUARD?.state !== 'SATISFIED' || contract.guards.ANON_FREE_TEXT_GUARD.serverEnforcement !== true) fail('free-text guard missing')
if (contract.guards?.ANON_TEXT_FILE_GUARD?.serverPrePersistenceInspection !== true) fail('text-file pre-persistence guard missing')

const binary = contract.guards?.ANON_BINARY_UPLOAD_GUARD
if (binary?.state !== 'SATISFIED_WITH_BOUNDED_LOCAL_VISUAL_AND_TEXT_DERIVATIVES') fail('binary guard state mismatch')
if (binary.contentPrePersistenceInspection !== true || binary.storageWriteOccursOnlyAfterPreflightPass !== true) fail('binary pre-storage enforcement missing')
if (binary.externalAiUsedForPrivacyPreflight !== false) fail('privacy preflight must stay local')
if (binary.pdfPolicy !== 'ALLOW_NATIVE_TEXT_OR_LOCAL_HUMAN_REVIEWED_PNG_DERIVATIVE_UP_TO_5_PAGES; DENY_VISUAL_PDF_OVER_5_PAGES') fail('bounded PDF policy mismatch')
if (binary.docxPolicy !== 'ALLOW_TEXT_ONLY_DOCX_OR_LOCAL_REVIEWED_TEXT_DERIVATIVE_WHEN_EMBEDDED_MEDIA_NOT_REQUIRED; ORIGINAL_DOCX_WITH_MEDIA_DENIED') fail('DOCX derivative policy mismatch')

const image = contract.guards?.ANON_IMAGE_LOCAL_VISUAL_GUARD
if (image?.state !== 'SATISFIED_WITH_HUMAN_REVIEW' || image.originalBytesLeaveDevice !== false || image.localRedactionAvailable !== true) fail('image local guard missing')
if (image.derivedFormat !== 'image/png' || image.serverRequiresVisualReviewProof !== true || image.serverVerifiesPngSignature !== true) fail('image derivative/server proof mismatch')
if (!['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].every((chunk) => image.serverRejectsKnownMetadataChunks?.includes(chunk))) fail('PNG metadata deny list incomplete')

const pdf = contract.guards?.ANON_BOUNDED_PDF_LOCAL_VISUAL_GUARD
if (pdf?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('bounded PDF guard missing')
if (pdf.classificationRunsBeforeUpload !== true || pdf.visualAdmissionScope !== 'PDF_WITH_VISUAL_RESIDUAL_UP_TO_5_PAGES' || pdf.pageCap !== 5 || pdf.overPageCapAllowed !== false) fail('bounded PDF classification/cap mismatch')
if (pdf.originalPdfBytesLeaveDeviceOnVisualPath !== false || pdf.allPagesLocalCanvasRenderRequired !== true || pdf.wholeDocumentHumanReviewRequired !== true || pdf.localRedactionAvailable !== true) fail('bounded PDF local workflow invariants missing')
if (pdf.derivedFormat !== 'image/png' || pdf.derivedFilename !== 'scansione-anonima.png' || pdf.serverUsesExistingReviewedPngGuard !== true) fail('bounded PDF derivative mismatch')
if (pdf.automatedVisualPiiDetection !== false || pdf.externalAiUsed !== false) fail('bounded PDF guard overclaims automation')

const docx = contract.guards?.ANON_DOCX_MEDIA_TEXT_DERIVATIVE_GUARD
if (docx?.state !== 'SATISFIED_WITH_HUMAN_REVIEW') fail('DOCX media text derivative guard missing')
if (docx.classificationRunsBeforeUpload !== true || docx.embeddedMediaDetectionLocal !== true || docx.textExtractionLocal !== true || docx.textEditableBeforeDerivative !== true) fail('DOCX local inspection/edit invariants missing')
if (docx.textD0D1GuardRequired !== true || docx.humanMediaNotRequiredDecisionRequired !== true) fail('DOCX review/decision invariants missing')
if (docx.originalDocxBytesLeaveDeviceOnDerivativePath !== false || docx.derivedFormat !== 'text/plain' || docx.derivedFilename !== 'documento-anonimo.txt') fail('DOCX derivative boundary mismatch')
if (docx.embeddedMediaPreserved !== false || docx.mediaPreservationAllowed !== false || docx.serverUsesExistingTextGuard !== true || docx.externalAiUsed !== false) fail('DOCX guard must not imply media-preserving sanitization')

if (contract.result?.boundedPdfLocalVisualPreflight !== 'PASS_WITH_HUMAN_REVIEW') fail('bounded PDF result missing')
if (contract.result?.pdfVisualAdmission !== 'PARTIAL_UP_TO_5_PAGES') fail('PDF admission scope mismatch')
if (contract.result?.longPdfVisualAdmission !== 'DENIED_OVER_5_PAGES') fail('long PDFs must stay denied')
if (contract.result?.docxMediaTextOnlyDerivative !== 'PASS_WITH_HUMAN_REVIEW') fail('DOCX text-only derivative result missing')
if (contract.result?.docxEmbeddedMediaAdmission !== 'TEXT_ONLY_DERIVATIVE_WHEN_MEDIA_NOT_REQUIRED') fail('DOCX embedded-media admission scope mismatch')
if (contract.result?.docxMediaPreservationAdmission !== 'DENIED_PENDING_LOCAL_PREFLIGHT') fail('DOCX media preservation must stay denied')
if (contract.result?.fullVisualAnonymizationInputEnforcement !== 'NOT_YET_CLAIMED' || contract.result?.tier2AdmissionEffect !== 'NONE') fail('guard must not overclaim or promote Tier 2')
if (!contract.residuals?.some((item) => item.id === 'ANON_LONG_PDF_AND_DOCX_MEDIA_PRESERVATION_PREFLIGHT' && item.state === 'NOT_SATISFIED')) fail('narrow residual missing')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

for (const token of ['ITALIAN_FISCAL_CODE', 'EMAIL', 'NAMED_STUDENT']) if (!freeTextGuard.includes(token)) fail(`privacy signal missing: ${token}`)
for (const token of ['inspectBinaryForAnonymousPilot', 'PDF_NATIVE_TEXT', 'DOCX_TEXT_ONLY', 'IMAGE_LOCAL_REVIEWED_PNG', 'PNG_METADATA_CHUNKS', 'word/media/']) if (!binaryGuard.includes(token)) fail(`binary preflight token missing: ${token}`)
for (const token of ['MULTI_PAGE_VISUAL_REVIEWABLE', 'MULTI_PAGE_VISUAL_BLOCKED', 'MAX_LOCAL_VISUAL_PDF_PAGES', 'classifyLocalPdfForVisualPreflight']) if (!pdfClassifier.includes(token)) fail(`PDF classifier token missing: ${token}`)
for (const token of ['inspectDocxForLocalSemanticDerivative', 'mammoth.images.imgElement', 'readAsArrayBuffer', 'MAX_LOCAL_DOCX_MEDIA_ITEMS', 'MAX_LOCAL_DOCX_MEDIA_BYTES', 'MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES', "'image/png'", "'image/jpeg'", "'image/webp'", 'externalFileAccess: false', 'includeEmbeddedStyleMap: false', 'DOCX_REFERENCED_MEDIA_SEMANTIC_REVIEWABLE']) if (!docxSemantic.includes(token)) fail(`staged DOCX semantic-preflight token missing: ${token}`)
if (docxSemantic.includes('dangerouslySetInnerHTML') || docxSemantic.includes('innerHTML =')) fail('staged DOCX semantic preflight must not inject Mammoth HTML into the DOM')
if (!noteAction.includes('inspectFreeTextForPilot') || !noteAction.includes('privacy_blocked')) fail('knowledge note server enforcement missing')
if (!uploadRoute.includes('inspectBinaryForAnonymousPilot') || uploadRoute.indexOf('inspectBinaryForAnonymousPilot') > uploadRoute.indexOf('supabase.storage.from')) fail('binary preflight must precede storage write')
if (!uploader.includes('preparedPdfFile') || !uploader.includes("reviewed-derived-png")) fail('PDF derivative is not wired to upload')
if (!uploader.includes('LocalDocxMediaPrivacyWorkbench') || !uploader.includes('preparedDocxFile') || !uploader.includes('MEDIA_REQUIRES_DERIVATIVE') || !uploader.includes('DOCX originale e media restano sul dispositivo')) fail('DOCX text derivative is not wired to upload')
for (const token of ['createImageBitmap', 'fillRect', 'canvas.toBlob']) if (!imageWorkbench.includes(token)) fail(`image workbench token missing: ${token}`)
for (const token of ['getDocumentProxy', 'MAX_LOCAL_VISUAL_PDF_PAGES', 'page.render', 'canvas.toBlob', "'scansione-anonima.png'", 'PDF resta nel browser', 'count > MAX_LOCAL_VISUAL_PDF_PAGES']) if (!pdfWorkbench.includes(token)) fail(`bounded PDF workbench token missing: ${token}`)
for (const token of ['mammoth.extractRawText', "'word/media/'", 'inspectFreeTextForPilot', "'documento-anonimo.txt'", 'mediaNotNeeded', 'Le immagini incorporate vengono escluse dal derivato']) if (!docxWorkbench.includes(token)) fail(`DOCX local derivative token missing: ${token}`)
if (!binaryGuard.includes("return unavailable('Il DOCX contiene immagini o media incorporati")) fail('original DOCX with embedded media must remain server-denied')

console.log('P7 anonymization input guard PASS: canonical admission remains unchanged; staged DOCX semantic media extraction is local, bounded and non-HTML-rendering; long visual PDFs and DOCX media preservation remain denied; Tier 2 NOT_ADMITTED')
