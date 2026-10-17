// @trama-readonly — pure in-memory canonicalization and hashing; no persisted state mutation.
import { createHash } from 'node:crypto'
import type { MaterialContentDigestV1 } from '@/core/domain/lesson-material-binding'

export type MaterialContentSnapshotV1 = {
  assetContent: {
    originalText: string | null
    mimeType: string | null
    sourceSha256: string | null
  }
  document: {
    title: string | null
    documentType: string
    language: string
    normalizedText: string | null
    normalizedMarkdown: string | null
    summary: string | null
    extractedData: Record<string, unknown>
  }
  units: Array<{
    ordinal: number
    unitType: string
    title: string | null
    content: string
    structuredData: Record<string, unknown>
    sourcePage: number | null
    startOffset: number | null
    endOffset: number | null
  }>
  referencedBinaryContent: Array<{
    ref: string
    mimeType: string | null
    bytes: Uint8Array
  }>
}

type ComparableMaterialUnit = {
  ordinal: number
  unitType: string
  title: string | null
  content: string
}

const CANONICALIZATION = 'docente-os.material-content.v1' as const

export function canonicalizeMaterialContentV1(snapshot: MaterialContentSnapshotV1): string {
  const units = [...snapshot.units]
    .map((unit) => ({
      ordinal: requireNonNegativeInteger(unit.ordinal, 'unit ordinal'),
      unitType: normalizeRequiredString(unit.unitType, 'unit type'),
      title: normalizeNullableString(unit.title),
      content: normalizeString(unit.content),
      structuredData: canonicalJsonValue(unit.structuredData, 'unit structuredData'),
      sourcePage: requireNullablePositiveInteger(unit.sourcePage, 'unit sourcePage'),
      startOffset: requireNullableNonNegativeInteger(unit.startOffset, 'unit startOffset'),
      endOffset: requireNullableNonNegativeInteger(unit.endOffset, 'unit endOffset'),
    }))
    .sort(compareUnits)

  assertUnique(units.map((unit) => String(unit.ordinal)), 'unit ordinal')

  const referencedBinaryContent = snapshot.referencedBinaryContent
    .map((item) => ({
      ref: normalizeRequiredString(item.ref, 'binary content ref'),
      mimeType: normalizeNullableString(item.mimeType),
      bytesHex: Buffer.from(item.bytes).toString('hex'),
    }))
    .sort((left, right) => left.ref.localeCompare(right.ref) || compareNullable(left.mimeType, right.mimeType))

  assertUnique(referencedBinaryContent.map((item) => item.ref), 'binary content ref')

  const canonical = {
    schema: CANONICALIZATION,
    assetContent: {
      originalText: normalizeNullableString(snapshot.assetContent.originalText),
      mimeType: normalizeNullableString(snapshot.assetContent.mimeType),
      sourceSha256: normalizeSha256(snapshot.assetContent.sourceSha256),
    },
    document: {
      title: normalizeNullableString(snapshot.document.title),
      documentType: normalizeRequiredString(snapshot.document.documentType, 'document type'),
      language: normalizeRequiredString(snapshot.document.language, 'document language'),
      normalizedText: normalizeNullableString(snapshot.document.normalizedText),
      normalizedMarkdown: normalizeNullableString(snapshot.document.normalizedMarkdown),
      summary: normalizeNullableString(snapshot.document.summary),
      extractedData: canonicalJsonValue(snapshot.document.extractedData, 'document extractedData'),
    },
    units,
    referencedBinaryContent,
  }

  return stableStringify(canonical)
}

export function digestMaterialContentV1(snapshot: MaterialContentSnapshotV1): MaterialContentDigestV1 {
  const canonical = canonicalizeMaterialContentV1(snapshot)
  return {
    algorithm: 'SHA-256',
    canonicalization: CANONICALIZATION,
    value: createHash('sha256').update(canonical, 'utf8').digest('hex'),
  }
}

function compareUnits(left: ComparableMaterialUnit, right: ComparableMaterialUnit) {
  return (
    left.ordinal - right.ordinal ||
    left.unitType.localeCompare(right.unitType) ||
    compareNullable(left.title, right.title) ||
    left.content.localeCompare(right.content)
  )
}

function canonicalJsonValue(value: unknown, label: string): unknown {
  return normalizeJsonValue(value, label, new Set<object>())
}

function normalizeJsonValue(value: unknown, label: string, ancestors: Set<object>): unknown {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') return normalizeString(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`)
    return value
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error(`${label} contains a cycle`)
    ancestors.add(value)
    const normalized = value.map((item, index) => normalizeJsonValue(item, `${label}[${index}]`, ancestors))
    ancestors.delete(value)
    return normalized
  }
  if (isPlainRecord(value)) {
    if (ancestors.has(value)) throw new Error(`${label} contains a cycle`)
    ancestors.add(value)
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeJsonValue(value[key], `${label}.${key}`, ancestors)
    }
    ancestors.delete(value)
    return normalized
  }
  throw new Error(`${label} contains an unsupported value`)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isPlainRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  throw new Error('Canonical material content contains an unsupported value')
}

function normalizeString(value: string) {
  return value.replace(/\r\n?/g, '\n')
}

function normalizeRequiredString(value: string, label: string) {
  const normalized = normalizeString(value)
  if (!normalized.trim()) throw new Error(`${label} is required`)
  return normalized
}

function normalizeNullableString(value: string | null) {
  return value === null ? null : normalizeString(value)
}

function normalizeSha256(value: string | null) {
  if (value === null) return null
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('sourceSha256 must be a SHA-256 hex digest')
  return value.toLowerCase()
}

function requireNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`)
  return value
}

function requireNullablePositiveInteger(value: number | null, label: string) {
  if (value === null) return null
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`)
  return value
}

function requireNullableNonNegativeInteger(value: number | null, label: string) {
  if (value === null) return null
  return requireNonNegativeInteger(value, label)
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`)
}

function compareNullable(left: string | null, right: string | null) {
  if (left === right) return 0
  if (left === null) return -1
  if (right === null) return 1
  return left.localeCompare(right)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
