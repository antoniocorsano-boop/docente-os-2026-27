import fs from 'node:fs'

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))
const fail = (message) => {
  console.error(`Release engineering policy invalid: ${message}`)
  process.exit(1)
}

const policy = readJson('ops/release-engineering-policy.json')
const pkg = readJson('product/package.json')
const promotion = readJson(policy.promotion?.contractPath ?? 'ops/production-promotion-contract.json')
const historicalReceipt = readJson(policy.historicalPilot?.productionReceiptPath ?? 'ops/production-release-receipt.json')
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8')

if (policy.schemaVersion !== 1) fail('schemaVersion must be 1')
if (policy.product !== 'DOCENTE OS') fail('product must be DOCENTE OS')
if (policy.program !== 'M5_RELEASE_ENGINEERING') fail('program must remain M5_RELEASE_ENGINEERING')

const versioning = policy.versioning ?? {}
if (versioning.scheme !== 'SEMVER') fail('versioning scheme must be SEMVER')
if (versioning.packageVersionSource !== 'product/package.json') fail('package version source must remain product/package.json')
if (versioning.preM5Major !== 0) fail('pre-M5 major must be 0')
if (versioning.m5GeneralDistributionVersion !== '1.0.0') fail('M5 general distribution version must be 1.0.0')
if (versioning.m5RequiredForMajorOne !== true) fail('major 1 must require M5')
if (versioning.releaseTagPrefix !== 'v') fail('release tags must use v prefix')

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
if (!semver.test(pkg.version)) fail(`package version is not valid SemVer: ${pkg.version}`)
if (Number(pkg.version.split('.')[0]) >= 1) fail('package major >=1 is not allowed while the M5 policy still marks major one as gated')

const requiredStates = ['DRAFT', 'RC', 'CERTIFIED', 'PROMOTED', 'SUPERSEDED', 'ROLLED_BACK']
for (const state of requiredStates) {
  if (!policy.releaseStates?.includes(state)) fail(`missing release state ${state}`)
}

const candidate = policy.candidate ?? {}
if (candidate.sourceBranch !== 'develop') fail('release candidates must originate from develop')
for (const key of ['exactShaRequired', 'immutableAfterFreeze', 'releaseNotesRequired', 'changelogRequired', 'applicableGateMatrixRequired', 'humanPromotionDecisionRequired']) {
  if (candidate[key] !== true) fail(`${key} must be true`)
}
if (candidate.automaticProductionPromotionAllowed !== false) fail('automatic production promotion must remain disabled')

const rc = policy.releaseCandidate ?? {}
if (rc.manifestPathPattern !== 'ops/releases/<version>/release-candidate.json') fail('unexpected release candidate manifest path')
for (const key of ['tagRequired', 'tagMustResolveToCandidateSha', 'multipleRcAllowed', 'newCodeRequiresNewRc', 'gateFailureRequiresHold']) {
  if (rc[key] !== true) fail(`${key} must be true for release candidates`)
}
const requiredRcFields = [
  'schemaVersion', 'product', 'releaseVersion', 'releaseState', 'candidateSha', 'sourceBranch', 'scope',
  'changedCapabilities', 'gateMatrix', 'migrations', 'previousCertifiedSha', 'rollbackTargetSha',
  'knownResiduals', 'humanDecision',
]
for (const field of requiredRcFields) {
  if (!rc.requiredFields?.includes(field)) fail(`release candidate contract missing required field ${field}`)
}

if (policy.promotion?.usesExistingProductionPromotionContract !== true) fail('existing production promotion contract must be reused')
if (promotion.promotionModel !== 'immutable_commit') fail('production promotion must remain immutable_commit')
if (promotion.promotionRules?.exactCandidateShaRequired !== true) fail('production promotion must require exact candidate SHA')
if (promotion.promotionRules?.humanReleaseDecisionRequired !== true) fail('production promotion must require human release decision')
if (promotion.promotionRules?.automaticProductionPromotionAllowed !== false) fail('production auto-promotion must remain false')
if (promotion.promotionRules?.rollbackTargetMustBePreviouslyCertified !== true) fail('rollback target must remain previously certified')

const rollback = policy.rollback ?? {}
if (rollback.previousCertifiedShaRequired !== true) fail('previous certified SHA is required for rollback')
if (rollback.applicationRollbackModel !== 'REDEPLOY_PREVIOUS_CERTIFIED_SHA') fail('unsafe application rollback model')
if (rollback.databasePolicy !== 'FORWARD_RECOVERY_UNLESS_PROVEN_RESTORE_PATH') fail('unsafe database rollback policy')
if (rollback.storageDestructiveRollbackAllowed !== false) fail('destructive storage rollback must remain false')
if (rollback.rollbackReceiptRequired !== true) fail('rollback receipt must be required')

if (!changelog.includes('## Unreleased')) fail('CHANGELOG.md must contain an Unreleased section')
if (!changelog.includes('Legacy certified pilot — 2026-08-25')) fail('historical pilot must remain explicitly classified in changelog')
if (policy.historicalPilot?.semverRetroactivelyAssigned !== false) fail('historical pilot must not receive retroactive SemVer')
if (policy.historicalPilot?.classification !== 'LEGACY_UNVERSIONED_CERTIFIED_PILOT') fail('historical pilot classification changed unexpectedly')
if (historicalReceipt.activationDate !== policy.historicalPilot.productionPromotionDate) fail('historical pilot date does not match production receipt')
if (historicalReceipt.candidate?.promotionModel !== 'IMMUTABLE_CERTIFIED_SHA') fail('historical pilot receipt is not an immutable certified SHA promotion')

console.log(`Release engineering policy PASS: package=${pkg.version}, historicalPilot=${historicalReceipt.candidate.repositorySha}, states=${requiredStates.length}`)
