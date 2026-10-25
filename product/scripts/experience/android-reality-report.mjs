import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUTCOMES = new Set(['PASS', 'FAIL_PRODUCT', 'INFRA_BLOCKED', 'NOT_APPLICABLE'])
const SHA_PATTERN = /^[0-9a-f]{40}$/i

export function buildAndroidRealityReceipt(input) {
  const requestedOutcome = String(input?.requestedOutcome ?? '')
  if (!OUTCOMES.has(requestedOutcome)) {
    throw new Error(`Android Reality outcome is invalid: ${requestedOutcome || '(empty)'}`)
  }

  const testedSha = typeof input?.testedSha === 'string' ? input.testedSha : ''
  const targetIntegrity = SHA_PATTERN.test(testedSha) ? 'PASS' : 'FAIL'
  const infrastructure = input?.infrastructure === 'PASS' ? 'PASS' : 'INFRA_BLOCKED'
  const outcome = targetIntegrity === 'FAIL' || infrastructure !== 'PASS'
    ? 'INFRA_BLOCKED'
    : requestedOutcome
  const failures = sanitizeFailures(input?.failures)

  return {
    schemaVersion: 1,
    testedSha,
    targetIntegrity,
    infrastructure,
    outcome,
    device: sanitizeDevice(input?.device),
    journeys: sanitizeJourneys(input?.journeys),
    geometry: sanitizeGeometry(input?.geometry),
    failures,
    firstProductFailure: outcome === 'FAIL_PRODUCT' ? failures[0] ?? null : null,
  }
}

export function serializeAndroidRealityReceipt(input) {
  return `${JSON.stringify(buildAndroidRealityReceipt(input), null, 2)}\n`
}

export async function writeAndroidRealityReceipt(input, outputRoot = 'test-results/android-reality') {
  const directory = path.resolve(outputRoot, 'receipt')
  await mkdir(directory, { recursive: true })
  const receiptPath = path.join(directory, 'android-reality.json')
  const serialized = serializeAndroidRealityReceipt(input)
  await writeFile(receiptPath, serialized, 'utf8')
  return { receipt: JSON.parse(serialized), receiptPath }
}

function sanitizeDevice(device) {
  if (!device || typeof device !== 'object') return null
  return compactObject({
    model: stringOrNull(device.model),
    serial: stringOrNull(device.serial),
    apiLevel: stringOrNull(device.apiLevel),
    androidRelease: stringOrNull(device.androidRelease),
    chromeVersion: stringOrNull(device.chromeVersion),
  })
}

function sanitizeFailures(failures) {
  if (!Array.isArray(failures)) return []
  return failures.map((failure) => compactObject({
    journey: stringOrNull(failure?.journey),
    code: stringOrNull(failure?.code),
    message: stringOrNull(failure?.message),
  }))
}

function sanitizeJourneys(journeys) {
  if (!Array.isArray(journeys)) return []
  return journeys.map((journey) => compactObject({
    id: stringOrNull(journey?.id),
    outcome: stringOrNull(journey?.outcome),
    checkpoint: stringOrNull(journey?.checkpoint),
  }))
}

function sanitizeGeometry(geometry) {
  if (!Array.isArray(geometry)) return []
  return geometry.map((finding) => compactObject({
    checkpoint: stringOrNull(finding?.checkpoint),
    subject: stringOrNull(finding?.subject),
    target: stringOrNull(finding?.target),
    classification: allowedClassification(finding?.classification),
    intersectionArea: finiteNumberOrNull(finding?.intersectionArea),
    subjectRect: sanitizeRect(finding?.subjectRect),
    targetRect: sanitizeRect(finding?.targetRect),
  }))
}

function sanitizeRect(rect) {
  if (!rect || typeof rect !== 'object') return null
  return compactObject({
    left: finiteNumberOrNull(rect.left),
    top: finiteNumberOrNull(rect.top),
    right: finiteNumberOrNull(rect.right),
    bottom: finiteNumberOrNull(rect.bottom),
    width: finiteNumberOrNull(rect.width),
    height: finiteNumberOrNull(rect.height),
  })
}

function allowedClassification(value) {
  return value === 'BLOCKING' || value === 'WARNING' || value === 'CLEAR' ? value : null
}

function stringOrNull(value) {
  return typeof value === 'string' ? value.slice(0, 1200) : null
}

function finiteNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null))
}
