import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const VERSION = '17.0.0'
const ROOT = resolve(process.cwd(), 'unicode/17.0.0')
const OUT = resolve(process.cwd(), 'src/core/domain/generated/unicode17-teacher-normalization.ts')
const VECTORS_OUT = resolve(process.cwd(), 'src/core/domain/generated/unicode17-normalization-vectors.ts')

const files = {
  unicodeData: 'UnicodeData.txt',
  compositionExclusions: 'CompositionExclusions.txt',
  caseFolding: 'CaseFolding.txt',
  normalizationTest: 'NormalizationTest.txt',
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const parseHexSeq = (value) => value.trim().split(/\s+/u).filter(Boolean).map((hex) => Number.parseInt(hex, 16))
const cpString = (points) => String.fromCodePoint(...points)
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const raw = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, name]) => [key, await readFile(resolve(ROOT, name), 'utf8')])))
const sourceDigests = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, sha256(value)]))

const ccc = new Map()
const decomp = new Map()
for (const line of raw.unicodeData.split(/\r?\n/u)) {
  if (!line || line.startsWith('#')) continue
  const fields = line.split(';')
  const cp = Number.parseInt(fields[0], 16)
  const combining = Number.parseInt(fields[3], 10)
  if (combining) ccc.set(cp, combining)
  const mapping = fields[5]
  if (mapping && !mapping.startsWith('<')) decomp.set(cp, parseHexSeq(mapping))
}

const exclusions = new Set()
for (const line of raw.compositionExclusions.split(/\r?\n/u)) {
  const body = line.replace(/#.*/u, '').trim()
  if (body) exclusions.add(Number.parseInt(body, 16))
}

const compose = new Map()
for (const [cp, mapping] of decomp) {
  // Derive the relevant Full_Composition_Exclusion rules from the frozen inputs:
  // primary composites have a two-code-point canonical decomposition, are not
  // explicitly excluded, and their decomposition starts with a starter (CCC=0).
  // Checking the composite character's own CCC is insufficient: Unicode contains
  // CCC=0 characters whose canonical decomposition begins with a non-starter.
  const firstIsStarter = mapping.length > 0 && (ccc.get(mapping[0]) ?? 0) === 0
  const isPrimaryComposite = mapping.length === 2 && !exclusions.has(cp) && firstIsStarter
  if (isPrimaryComposite) compose.set(`${mapping[0]},${mapping[1]}`, cp)
}

// Hangul constants and algorithms from UAX #15 / Unicode normalization algorithm.
const SBase = 0xac00
const LBase = 0x1100
const VBase = 0x1161
const TBase = 0x11a7
const LCount = 19
const VCount = 21
const TCount = 28
const NCount = VCount * TCount
const SCount = LCount * NCount

function hangulDecompose(cp) {
  const sIndex = cp - SBase
  if (sIndex < 0 || sIndex >= SCount) return null
  const l = LBase + Math.floor(sIndex / NCount)
  const v = VBase + Math.floor((sIndex % NCount) / TCount)
  const tIndex = sIndex % TCount
  return tIndex === 0 ? [l, v] : [l, v, TBase + tIndex]
}

function hangulCompose(a, b) {
  const lIndex = a - LBase
  if (lIndex >= 0 && lIndex < LCount) {
    const vIndex = b - VBase
    if (vIndex >= 0 && vIndex < VCount) return SBase + (lIndex * VCount + vIndex) * TCount
  }
  const sIndex = a - SBase
  if (sIndex >= 0 && sIndex < SCount && sIndex % TCount === 0) {
    const tIndex = b - TBase
    if (tIndex > 0 && tIndex < TCount) return a + tIndex
  }
  return null
}

function canonicalDecomposeCodePoint(cp, out) {
  const hangul = hangulDecompose(cp)
  if (hangul) {
    for (const part of hangul) canonicalDecomposeCodePoint(part, out)
    return
  }
  const mapping = decomp.get(cp)
  if (!mapping) { out.push(cp); return }
  for (const part of mapping) canonicalDecomposeCodePoint(part, out)
}

function canonicalOrder(points) {
  const out = []
  for (const cp of points) {
    const cls = ccc.get(cp) ?? 0
    let index = out.length
    if (cls !== 0) {
      while (index > 0) {
        const prev = ccc.get(out[index - 1]) ?? 0
        if (prev === 0 || prev <= cls) break
        index -= 1
      }
    }
    out.splice(index, 0, cp)
  }
  return out
}

function nfd(points) {
  const expanded = []
  for (const cp of points) canonicalDecomposeCodePoint(cp, expanded)
  return canonicalOrder(expanded)
}

function nfc(points) {
  const ordered = nfd(points)
  if (ordered.length < 2) return ordered
  const out = [ordered[0]]
  let starterPos = 0
  let starter = out[0]
  let lastClass = 0
  for (let i = 1; i < ordered.length; i += 1) {
    const cp = ordered[i]
    const cls = ccc.get(cp) ?? 0
    const hangul = hangulCompose(starter, cp)
    const table = compose.get(`${starter},${cp}`)
    const composite = hangul ?? table ?? null
    if (composite !== null && (lastClass < cls || lastClass === 0)) {
      out[starterPos] = composite
      starter = composite
    } else {
      if (cls === 0) { starterPos = out.length; starter = cp }
      out.push(cp)
      lastClass = cls
    }
  }
  return out
}

// Default full, non-Turkic folding: C + F, with F overriding C where present; S/T excluded.
const foldC = new Map()
const foldF = new Map()
for (const line of raw.caseFolding.split(/\r?\n/u)) {
  const body = line.replace(/#.*/u, '').trim()
  if (!body) continue
  const [cpHex, status, mapping] = body.split(';').map((part) => part.trim())
  const cp = Number.parseInt(cpHex, 16)
  if (status === 'C') foldC.set(cp, parseHexSeq(mapping))
  if (status === 'F') foldF.set(cp, parseHexSeq(mapping))
}
const fold = new Map(foldC)
for (const [cp, mapping] of foldF) fold.set(cp, mapping)

function fullDefaultFold(points) {
  return points.flatMap((cp) => fold.get(cp) ?? [cp])
}

function normalizeForTeacher(points) {
  // Contractual core: NFD -> full default non-Turkic fold -> NFC.
  return nfc(fullDefaultFold(nfd(points)))
}

const normalizationVectors = []
for (const line of raw.normalizationTest.split(/\r?\n/u)) {
  const body = line.replace(/#.*/u, '').trim()
  if (!body || body.startsWith('@')) continue
  const columns = body.split(';').map((part) => part.trim())
  if (columns.length < 5) continue
  const [c1, c2, c3, c4, c5] = columns.slice(0, 5).map(parseHexSeq)
  normalizationVectors.push([c1, c2, c3, c4, c5])
}

// UAX #15 conformance invariants. Generation fails closed on any mismatch.
for (let i = 0; i < normalizationVectors.length; i += 1) {
  const [c1, c2, c3, c4, c5] = normalizationVectors[i]
  const eq = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])
  assert(eq(nfc(c1), c2), `NormalizationTest ${i + 1}: NFC(c1) != c2`)
  assert(eq(nfc(c2), c2), `NormalizationTest ${i + 1}: NFC(c2) != c2`)
  assert(eq(nfc(c3), c2), `NormalizationTest ${i + 1}: NFC(c3) != c2`)
  assert(eq(nfc(c4), c4), `NormalizationTest ${i + 1}: NFC(c4) != c4`)
  assert(eq(nfc(c5), c4), `NormalizationTest ${i + 1}: NFC(c5) != c4`)
  assert(eq(nfd(c1), c3), `NormalizationTest ${i + 1}: NFD(c1) != c3`)
  assert(eq(nfd(c2), c3), `NormalizationTest ${i + 1}: NFD(c2) != c3`)
  assert(eq(nfd(c3), c3), `NormalizationTest ${i + 1}: NFD(c3) != c3`)
  assert(eq(nfd(c4), c5), `NormalizationTest ${i + 1}: NFD(c4) != c5`)
  assert(eq(nfd(c5), c5), `NormalizationTest ${i + 1}: NFD(c5) != c5`)
}

// Focused full-fold invariants that distinguish folding from lowercase and Turkic folding.
const foldCases = [
  [[0x00df], [0x0073, 0x0073]], // sharp s -> ss
  [[0x0130], [0x0069, 0x0307]], // default/non-Turkic dotted I
  [[0x03a3], [0x03c3]], // capital sigma
  [[0x03c2], [0x03c3]], // final sigma
]
for (const [input, expected] of foldCases) {
  const actual = fullDefaultFold(input)
  assert(actual.length === expected.length && actual.every((cp, i) => cp === expected[i]), `CaseFolding invariant failed for ${input.map((cp) => cp.toString(16)).join(' ')}`)
}

// Determinism self-check: semantically equivalent canonically decomposed/composed forms converge.
assert(cpString(normalizeForTeacher([0x00d2])) === cpString(normalizeForTeacher([0x004f, 0x0300])), 'teacher normalization canonical-equivalence check failed')

const sortEntries = (map) => [...map.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
const sortCompose = (map) => [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))
const literal = (value) => JSON.stringify(value)

const output = `// GENERATED FILE — DO NOT EDIT.\n// Unicode ${VERSION}; generated from frozen UCD inputs by scripts/generate-unicode17-teacher-normalization.mjs.\nexport const UNICODE17_VERSION = ${literal(VERSION)} as const\nexport const UNICODE17_SOURCE_SHA256 = ${literal(sourceDigests)} as const\nexport const UNICODE17_CCC = new Map<number, number>(${literal(sortEntries(ccc))})\nexport const UNICODE17_CANONICAL_DECOMP = new Map<number, readonly number[]>(${literal(sortEntries(decomp))})\nexport const UNICODE17_CANONICAL_COMPOSE = new Map<string, number>(${literal(sortCompose(compose))})\nexport const UNICODE17_FULL_DEFAULT_FOLD = new Map<number, readonly number[]>(${literal(sortEntries(fold))})\n`

const vectorsOutput = `// GENERATED FILE — DO NOT EDIT.\nexport const UNICODE17_NORMALIZATION_TEST_SHA256 = ${literal(sourceDigests.normalizationTest)} as const\nexport const UNICODE17_NORMALIZATION_VECTOR_COUNT = ${normalizationVectors.length} as const\n`

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, output, 'utf8')
await writeFile(VECTORS_OUT, vectorsOutput, 'utf8')

// Re-read generated bytes and prove byte-for-byte deterministic rendering in this run.
const [writtenOutput, writtenVectors] = await Promise.all([readFile(OUT, 'utf8'), readFile(VECTORS_OUT, 'utf8')])
assert(writtenOutput === output, 'generated Unicode table artifact differs after write/read')
assert(writtenVectors === vectorsOutput, 'generated normalization vector receipt differs after write/read')

console.log(JSON.stringify({
  unicodeVersion: VERSION,
  sourceDigests,
  outputSha256: sha256(output),
  vectorsReceiptSha256: sha256(vectorsOutput),
  normalizationVectors: normalizationVectors.length,
  counts: { ccc: ccc.size, decomp: decomp.size, compose: compose.size, fold: fold.size },
  conformance: 'PASS',
}, null, 2))
